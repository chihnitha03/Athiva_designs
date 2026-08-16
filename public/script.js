let products = [];
let filteredProducts = [];
const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;

// fallback seed if API not available
const fallbackProducts = [
  {id:1,name:'Banarasi Silk - Maroon',price:6890,image:'https://images.unsplash.com/photo-1520975915153-8b79b9b6a3b3?auto=format&fit=crop&w=800&q=60',category:'Banarasi'},
  {id:2,name:'Kanjivaram - Royal Blue',price:9990,image:'https://images.unsplash.com/photo-1520975698510-4b6f6d8a6c0e?auto=format&fit=crop&w=800&q=60',category:'Kanjivaram'},
  {id:3,name:'Chiffon Printed - Floral',price:2490,image:'https://images.unsplash.com/photo-1531944171234-1b4ba0b8a3f1?auto=format&fit=crop&w=800&q=60',category:'Chiffon'},
  {id:4,name:'Tussar Silk - Mustard',price:4590,image:'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?auto=format&fit=crop&w=800&q=60',category:'Tussar'},
  {id:5,name:'Kanchipattu Antique Green',price:7790,image:'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=800&q=60',category:'Kanchipattu'},
  {id:6,name:'Georgette Party Wear',price:2890,image:'https://images.unsplash.com/photo-1524704840561-432eb5d8f7d6?auto=format&fit=crop&w=800&q=60',category:'Georgette'},
  {id:7,name:'Katan Bridal Red',price:12500,image:'https://images.unsplash.com/photo-1523381294911-8e1dd4d3ef1a?auto=format&fit=crop&w=800&q=60',category:'Katan'},
  {id:8,name:'Raw Mango Pattu Beige',price:8990,image:'https://images.unsplash.com/photo-1529101091764-c3526daf38fe?auto=format&fit=crop&w=800&q=60',category:'Raw Mango Pattu'}
];

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let cart = {};
let wishlist = [];
let currentProduct = null;

function renderProducts(){
  const root = $('#products');
  root.innerHTML = '';
  const toRender = filteredProducts.length > 0 ? filteredProducts : products;
  toRender.forEach(p => {
    const isOutOfStock = p.quantity === 0 || p.quantity === undefined;
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}" style="${isOutOfStock ? 'opacity:0.6;' : ''}">
      <div class="card-body">
        <h4>${p.name}</h4>
        <div class="price">₹${p.price}</div>
        ${isOutOfStock ? '<div style="color:#c53030;font-weight:600;margin:0.5rem 0;">Out of Stock</div>' : '<div style="color:#22543d;font-weight:600;margin:0.5rem 0;">✓ In Stock (${p.quantity})</div>'.replace('${p.quantity}', p.quantity)}
        <div class="card-actions">
          <button class="button-primary" data-id="${p.id}" onclick="event.stopPropagation()" ${isOutOfStock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Add to Cart</button>
          <button class="button-secondary" onclick="event.stopPropagation();alert('Quick view: ${p.name} — ₹${p.price}')">Quick View</button>
        </div>
      </div>
    `;
    card.addEventListener('click', () => showProductDetail(p));
    root.appendChild(card);
  });
}

async function loadProducts(){
  try{
    const res = await fetch(`${API_BASE}/products`);
    if(!res.ok) throw new Error('API error');
    products = await res.json();
  }catch(err){
    products = fallbackProducts;
  }
  renderProducts();
}

function populateOrderSummary(){
  const summary = $('#order-summary');
  const total = Object.values(cart).reduce((s,c)=>s+c.qty*c.price,0);
  summary.innerHTML = Object.values(cart).map(item=>`<div class="order-summary-item"><span>${item.name} × ${item.qty}</span><span>₹${item.qty*item.price}</span></div>`).join('');
  $('#order-total-display').textContent = total;
}

function showProductDetail(product){
  currentProduct = product;
  const isOutOfStock = product.quantity === 0 || product.quantity === undefined;
  $('#product-detail-name').textContent = product.name;
  $('#product-detail-image').src = product.image;
  $('#product-detail-image').alt = product.name;
  $('#product-detail-category').textContent = product.category || 'Saree';
  $('#product-detail-price').textContent = '₹' + product.price;
  $('#product-detail-description').textContent = `Beautiful ${product.category || 'Saree'} with premium quality fabric. Perfect for traditional and contemporary occasions. Available in various colors and designs.`;
  
  // update stock status
  const stockDisplay = $('#product-detail-stock');
  if(stockDisplay){
    stockDisplay.innerHTML = isOutOfStock ? 
      '<span style="color:#c53030;font-weight:600;">Out of Stock</span>' : 
      `<span style="color:#22543d;font-weight:600;">✓ In Stock (${product.quantity} available)</span>`;
  }

  // disable/enable add to cart button
  const addBtn = $('#add-to-cart-detail');
  if(isOutOfStock){
    addBtn.disabled = true;
    addBtn.style.opacity = '0.5';
    addBtn.style.cursor = 'not-allowed';
  } else {
    addBtn.disabled = false;
    addBtn.style.opacity = '1';
    addBtn.style.cursor = 'pointer';
  }
  
  // update wishlist heart
  const heart = $('#wishlist-heart');
  if(wishlist.includes(product.id)){
    heart.classList.add('favorited');
    heart.textContent = '❤';
  } else {
    heart.classList.remove('favorited');
    heart.textContent = '♡';
  }
  
  $('#product-modal').setAttribute('aria-hidden', 'false');
}

async function toggleWishlist(productId){
  if(wishlist.includes(productId)){
    wishlist = wishlist.filter(id => id !== productId);
    await syncWishlist(productId, false);
  } else {
    wishlist.push(productId);
    await syncWishlist(productId, true);
  }
  const heart = $('#wishlist-heart');
  if(wishlist.includes(productId)){
    heart.classList.add('favorited');
    heart.textContent = '❤';
  } else {
    heart.classList.remove('favorited');
    heart.textContent = '♡';
  }
}

function updateCartCount(){
  const count = Object.values(cart).reduce((s,c)=>s+c.qty,0);
  $('#cart-count').textContent = count;
}

function renderCart(){
  const root = $('#cart-items');
  root.innerHTML = '';
  const total = Object.values(cart).reduce((s,c)=>s+c.qty*c.price,0);
  $('#cart-total').textContent = total;
  if(total===0){ root.innerHTML = '<p>Your cart is empty.</p>'; return }
  Object.values(cart).forEach(item=>{
    const el = document.createElement('div'); el.className='cart-item';
    el.innerHTML = `<img src="${item.image}" alt="${item.name}"><div style="flex:1"><strong>${item.name}</strong><div>₹${item.price} × ${item.qty}</div></div><div><button class="button-secondary" data-id="${item.id}" data-action="dec">-</button><button class="button-primary" data-id="${item.id}" data-action="inc">+</button></div>`;
    root.appendChild(el);
  })
}

async function syncWishlist(productId, add){
  const token = getToken();
  if(!token) return;
  try{
    await fetch(add ? `${API_BASE}/wishlist` : `${API_BASE}/wishlist/${productId}`, {
      method: add ? 'POST' : 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token,
        ...(add ? {'Content-Type': 'application/json'} : {})
      },
      body: add ? JSON.stringify({ productId }) : undefined
    });
  }catch(err){ console.error('Wishlist sync failed', err); }
}

async function loadWishlist(){
  const token = getToken();
  if(!token){ wishlist = []; return; }
  try{
    const res = await fetch(`${API_BASE}/wishlist`, { headers:{ 'Authorization':'Bearer '+token } });
    if(!res.ok){ wishlist = []; return; }
    const data = await res.json();
    wishlist = data.map(item => item.id);
  }catch(err){ wishlist = []; }
}

function addToCart(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  if(!cart[id]) cart[id] = {...p, qty:0};
  cart[id].qty++;
  updateCartCount(); renderCart();
}

document.addEventListener('click', e=>{
  const add = e.target.closest('.button-primary[data-id]');
  if(add){ addToCart(Number(add.dataset.id)); return }
  const cartBtn = e.target.closest('#cart-btn');
  if(cartBtn){ $('#cart').classList.add('open'); $('#cart').setAttribute('aria-hidden','false'); return }
  const closeCart = e.target.closest('#close-cart');
  if(closeCart){ $('#cart').classList.remove('open'); $('#cart').setAttribute('aria-hidden','true'); return }
  const incdec = e.target.closest('button[data-action]');
  if(incdec){ const id=Number(incdec.dataset.id); const act=incdec.dataset.action; if(cart[id]){ if(act==='inc') cart[id].qty++; else { cart[id].qty--; if(cart[id].qty<=0) delete cart[id]; } updateCartCount(); renderCart(); } return }
  const checkout = e.target.closest('#checkout');
  if(checkout){ if(Object.keys(cart).length===0){ alert('Cart is empty'); return } populateOrderSummary(); $('#order-modal').setAttribute('aria-hidden','false'); return }
  const closeOrder = e.target.closest('#close-order');
  if(closeOrder){ $('#order-modal').setAttribute('aria-hidden','true'); return }
  const closeProduct = e.target.closest('#close-product');
  if(closeProduct){ $('#product-modal').setAttribute('aria-hidden','true'); return }
  const addToCartDetail = e.target.closest('#add-to-cart-detail');
  if(addToCartDetail && currentProduct){ addToCart(currentProduct.id); alert('Added to cart!'); return }
  const buyNow = e.target.closest('#buy-now');
  if(buyNow && currentProduct){ addToCart(currentProduct.id); $('#product-modal').setAttribute('aria-hidden','true'); populateOrderSummary(); $('#order-modal').setAttribute('aria-hidden','false'); return }
  const wishlistHeart = e.target.closest('#wishlist-heart');
  if(wishlistHeart && currentProduct){ toggleWishlist(currentProduct.id); return }
});

document.getElementById('order-form').addEventListener('submit', function(e){
  e.preventDefault();
  const name = this.name.value.trim();
  const phone = this.phone.value.trim();
  const address = this.address.value.trim();
  if(!name||!phone||!address){ alert('Please fill all fields'); return }
  const items = Object.values(cart).map(i=>`${i.name} x ${i.qty}`).join('\n');
  const total = Object.values(cart).reduce((s,c)=>s+c.qty*c.price,0);
  alert(`Order placed!\nName: ${name}\nPhone: ${phone}\nAddress: ${address}\n\nItems:\n${items}\n\nTotal: ₹${total}`);
  cart = {}; updateCartCount(); renderCart(); this.reset(); $('#order-modal').setAttribute('aria-hidden','true'); $('#cart').classList.remove('open'); $('#cart').setAttribute('aria-hidden','true');
});

// auth helpers
function setToken(token){ localStorage.setItem('token', token); }
function getToken(){ return localStorage.getItem('token'); }
function setAdminToken(token){ localStorage.setItem('admin_token', token); }
function getAdminToken(){ return localStorage.getItem('admin_token'); }

async function readResponse(res){
  const text = await res.text();
  if(!text) return {};
  try{
    return JSON.parse(text);
  }catch(err){
    return { error: text };
  }
}

// auth modal logic
const authModal = $('#auth-modal');
const profileBtn = $('#profile-btn');
if(profileBtn){
  profileBtn.addEventListener('click', (e)=>{
    if(profileBtn.tagName === 'A') return; // allow auth page link to work normally
    if(!getToken()){
      authModal.setAttribute('aria-hidden','false');
      e.preventDefault();
      return;
    }
    e.preventDefault();
    fetchProfile();
  });
}

$('#close-auth').addEventListener('click', ()=>authModal.setAttribute('aria-hidden','true'));

let isRegister = false;
$('#toggle-register').addEventListener('click', ()=>{
  isRegister = !isRegister; $('#auth-title').textContent = isRegister ? 'Register' : 'Login'; $('#auth-submit').textContent = isRegister ? 'Register' : 'Login';
});

$('#auth-form').addEventListener('submit', async function(e){
  e.preventDefault();
  const username = this.username.value.trim();
  const password = this.password.value.trim();
  const url = isRegister ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
  try{
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ username, password }) });
    const data = await readResponse(res);
    if(!res.ok) return alert(data.error || 'Auth failed');
    setToken(data.token);
    authModal.setAttribute('aria-hidden','true');
    alert('Logged in');
  }catch(err){ alert('Network error'); }
});

async function fetchProfile(){
  try{
    const res = await fetch(`${API_BASE}/profile`, { headers:{ 'Authorization': 'Bearer '+getToken() } });
    if(!res.ok) return alert('Failed to load profile, please login');
    const data = await res.json();
    let msg = `User: ${data.user.username}\nOrders: ${data.orders.length}\nWishlist: ${data.wishlist.length}`;
    alert(msg);
  }catch(err){ alert('Network error'); }
}

const homeAdminForm = document.getElementById('home-admin-login-form');
const homeAdminStatus = document.getElementById('home-admin-status');
if(homeAdminForm){
  homeAdminForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const username = this.username.value.trim();
    const password = this.password.value.trim();
    if(homeAdminStatus) homeAdminStatus.textContent = 'Signing in...';
    try{
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await readResponse(res);
      if(!res.ok){
        if(homeAdminStatus) homeAdminStatus.textContent = data.error || 'Admin login failed';
        return;
      }
      setAdminToken(data.token);
      if(homeAdminStatus) homeAdminStatus.textContent = 'Admin login successful. Opening dashboard...';
      window.location.href = 'admin-dashboard.html';
    }catch(err){
      if(homeAdminStatus) homeAdminStatus.textContent = 'Network error. Start the backend and try again.';
    }
  });
}

// initialize
loadProducts(); loadWishlist(); updateCartCount(); renderCart();

// search functionality
$('#search-input').addEventListener('keyup', function(){
  const query = this.value.toLowerCase().trim();
  if(query === '') { filteredProducts = []; renderProducts(); return; }
  filteredProducts = products.filter(p => p.name.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query)));
  renderProducts();
});

$('#search-btn').addEventListener('click', function(){
  $('#search-input').dispatchEvent(new Event('keyup'));
});

// product dropdown filter
$$('#products-menu a').forEach(link => {
  link.addEventListener('click', function(e){
    e.preventDefault();
    const cat = this.dataset.cat;
    if(cat === 'All') { filteredProducts = []; }
    else { filteredProducts = products.filter(p => p.category === cat); }
    renderProducts();
    $('#products-dropdown').closest('.dropdown').classList.remove('open');
  });
});

// dropdown toggle
$('#products-dropdown').addEventListener('click', function(){
  this.closest('.dropdown').classList.toggle('open');
});
