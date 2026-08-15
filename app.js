require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(__dirname));

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const FALLBACK_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Athiva_designs';
const FALLBACK_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Athiva_17042003';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

async function getUserByUsername(username) {
  const res = await pool.query('SELECT id, username, password_hash FROM users WHERE username=$1', [username]);
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

app.get('/api/health', async (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
    const existing = await getUserByUsername(username);
    if (existing) return res.status(400).json({ error: 'Username taken' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users(username,password_hash) VALUES($1,$2) RETURNING id,username',
      [username, hash]
    );
    const user = result.rows[0];
    const token = generateToken(user);
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
      "SELECT o.id,o.total,o.address,o.phone,o.created_at, json_agg(json_build_object('product_id',oi.product_id,'qty',oi.quantity,'price',oi.price)) items FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC",
      [userId]
    );
    res.json({ user: userRes.rows[0], wishlist: wishlistRes.rows, orders: ordersRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, address, phone } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'No items' });
    const productIds = items.map(i => i.productId);
    const q = await pool.query('SELECT id,price FROM products WHERE id = ANY($1)', [productIds]);
    const priceMap = Object.fromEntries(q.rows.map(r => [r.id, r.price]));
    const total = items.reduce((s, it) => s + (priceMap[it.productId] || 0) * it.qty, 0);
    const orderRes = await pool.query(
      'INSERT INTO orders(user_id,total,address,phone) VALUES($1,$2,$3,$4) RETURNING id,created_at',
      [userId, total, address, phone]
    );
    const orderId = orderRes.rows[0].id;
    for (const it of items) {
      const price = priceMap[it.productId] || 0;
      await pool.query(
        'INSERT INTO order_items(order_id,product_id,quantity,price) VALUES($1,$2,$3,$4)',
        [orderId, it.productId, it.qty, price]
      );
    }
    res.json({ success: true, orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = app;
