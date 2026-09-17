require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('./db');

const app = express();
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const FALLBACK_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Athiva_designs';
const FALLBACK_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Athiva_17042003';

const mailTransport = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    })
  : null;

async function sendEmail({ to, subject, text }) {
  if (!mailTransport || !to) return;
  try {
    await mailTransport.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text
    });
  } catch (err) {
    console.error('Email notification failed:', err.message);
  }
}

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

async function getUserByUsername(username) {
  const res = await pool.query('SELECT id, username, email, password_hash FROM users WHERE username=$1', [username]);
  return res.rows[0];
}

function generateAdminToken(username) {
  return jwt.sign({ username, role: 'admin', source: 'env' }, JWT_SECRET, { expiresIn: '7d' });
}

function adminMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const parts = header.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    if (data.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    req.admin = data;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const parts = header.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' });
  const token = parts[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/:page(index.html|auth.html|admin-login.html|admin-dashboard.html|wishlist.html|profile.html)', (req, res) => {
  res.sendFile(path.join(publicDir, req.params.page));
});

app.get('/api/health', async (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password are required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    const existing = await getUserByUsername(username);
    if (existing) return res.status(400).json({ error: 'Username taken' });
    const emailExists = await pool.query('SELECT 1 FROM users WHERE lower(email)=lower($1)', [email]);
    if (emailExists.rowCount) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id,username,email',
      [username, email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    const token = generateToken(user);
    await sendEmail({ to: user.email, subject: 'Welcome to Athiva Designs', text: `Hello ${user.username},\n\nYour Athiva Designs account has been created successfully.` });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const user = await getUserByUsername(username);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/google-config', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
});

app.post('/api/auth/google', async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Google sign-in is not configured yet' });
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing Google credential' });
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const profile = await verifyRes.json();
    if (!verifyRes.ok || profile.aud !== process.env.GOOGLE_CLIENT_ID || profile.email_verified !== 'true') {
      return res.status(401).json({ error: 'Google sign-in could not be verified' });
    }
    const email = profile.email.toLowerCase();
    let result = await pool.query('SELECT id,username,email FROM users WHERE google_id=$1 OR lower(email)=lower($2)', [profile.sub, email]);
    let user = result.rows[0];
    if (!user) {
      const usernameBase = (profile.email.split('@')[0] || 'google-user').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30) || 'google-user';
      let username = usernameBase;
      let suffix = 1;
      while ((await pool.query('SELECT 1 FROM users WHERE username=$1', [username])).rowCount) username = `${usernameBase}${suffix++}`;
      const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      result = await pool.query('INSERT INTO users(username,email,google_id,password_hash) VALUES($1,$2,$3,$4) RETURNING id,username,email', [username, email, profile.sub, hash]);
      user = result.rows[0];
      await sendEmail({ to: email, subject: 'Welcome to Athiva Designs', text: `Hello ${user.username},\n\nYour account was created using Google sign-in.` });
    } else if (!user.email || !user.google_id) {
      result = await pool.query('UPDATE users SET email=COALESCE(email,$1), google_id=COALESCE(google_id,$2) WHERE id=$3 RETURNING id,username,email', [email, profile.sub, user.id]);
      user = result.rows[0];
    }
    res.json({ token: generateToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Google sign-in failed' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id,name,price,image,category,quantity FROM products ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', adminMiddleware, async (req, res) => {
  try {
    const { name, price, category, image, quantity } = req.body;
    if (!name || !price || !category) return res.status(400).json({ error: 'Missing required fields' });
    const result = await pool.query(
      'INSERT INTO products(name,price,image,category,quantity) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [name, price, image || '/images/default.jpg', category, quantity || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/products/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, image, quantity } = req.body;
    const result = await pool.query(
      'UPDATE products SET name=$1, price=$2, category=$3, image=$4, quantity=$5 WHERE id=$6 RETURNING *',
      [name, price, category, image, quantity, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE id=$1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    if (username === FALLBACK_ADMIN_USERNAME && password === FALLBACK_ADMIN_PASSWORD) {
      const token = generateAdminToken(username);
      return res.json({ token, admin: { username } });
    }

    return res.status(400).json({ error: 'Invalid credentials' });
  } catch (err) {
    console.error(err);
    if (req.body?.username === FALLBACK_ADMIN_USERNAME && req.body?.password === FALLBACK_ADMIN_PASSWORD) {
      const token = generateAdminToken(FALLBACK_ADMIN_USERNAME);
      return res.json({ token, admin: { username: FALLBACK_ADMIN_USERNAME } });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/wishlist', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    await pool.query(
      'INSERT INTO wishlist(user_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [userId, productId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/wishlist/:productId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = Number(req.params.productId);
    if (!productId) return res.status(400).json({ error: 'Missing productId' });
    await pool.query('DELETE FROM wishlist WHERE user_id=$1 AND product_id=$2', [userId, productId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/wishlist', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const wishlistRes = await pool.query(
      'SELECT p.* FROM products p JOIN wishlist w ON p.id=w.product_id WHERE w.user_id=$1 ORDER BY p.id',
      [userId]
    );
    res.json(wishlistRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await pool.query('SELECT id,username,created_at FROM users WHERE id=$1', [userId]);
    const wishlistRes = await pool.query(
      'SELECT p.* FROM products p JOIN wishlist w ON p.id=w.product_id WHERE w.user_id=$1',
      [userId]
    );
    const ordersRes = await pool.query(
      "SELECT o.id,o.total,o.address,o.phone,o.created_at, COALESCE(json_agg(json_build_object('product_id',oi.product_id,'name',p.name,'qty',oi.quantity,'price',oi.price)) FILTER (WHERE oi.id IS NOT NULL), '[]') items FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC",
      [userId]
    );
    res.json({ user: userRes.rows[0], wishlist: wishlistRes.rows, orders: ordersRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const { items, address, phone } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'No items' });
    if (!phone || !/^[6-9]\d{9}$/.test(String(phone).trim())) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9' });
    }
    if (!address || String(address).trim().length < 10) {
      return res.status(400).json({ error: 'Please enter a complete shipping address' });
    }
    const productIds = items.map(i => Number(i.productId));
    if (items.some(i => !Number.isInteger(Number(i.qty)) || Number(i.qty) < 1)) return res.status(400).json({ error: 'Invalid item quantity' });
    await client.query('BEGIN');
    const q = await client.query('SELECT id,name,price,quantity FROM products WHERE id = ANY($1) FOR UPDATE', [productIds]);
    if (q.rows.length !== new Set(productIds).size) return res.status(400).json({ error: 'One or more products are unavailable' });
    const productMap = Object.fromEntries(q.rows.map(r => [r.id, r]));
    for (const it of items) if (Number(it.qty) > productMap[Number(it.productId)].quantity) return res.status(400).json({ error: `${productMap[Number(it.productId)].name} is out of stock or has insufficient stock` });
    const total = items.reduce((s, it) => s + productMap[Number(it.productId)].price * Number(it.qty), 0);
    const orderRes = await client.query(
      'INSERT INTO orders(user_id,total,address,phone) VALUES($1,$2,$3,$4) RETURNING id,created_at',
      [userId, total, address, phone]
    );
    const orderId = orderRes.rows[0].id;
    for (const it of items) {
      const product = productMap[Number(it.productId)];
      await client.query('UPDATE products SET quantity=quantity-$1 WHERE id=$2', [Number(it.qty), product.id]);
      await client.query(
        'INSERT INTO order_items(order_id,product_id,quantity,price) VALUES($1,$2,$3,$4)',
        [orderId, product.id, Number(it.qty), product.price]
      );
    }
    await client.query('COMMIT');
    const userRes = await pool.query('SELECT username,email FROM users WHERE id=$1', [userId]);
    const user = userRes.rows[0];
    await sendEmail({ to: user?.email, subject: `Athiva Designs order #${orderId}`, text: `Hello ${user?.username || ''},\n\nYour order #${orderId} has been placed.\nTotal: ₹${total}\n\nThank you for shopping with Athiva Designs.` });
    res.json({ success: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

module.exports = app;
