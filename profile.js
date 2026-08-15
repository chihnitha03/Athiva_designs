const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;
const profileUsername = document.getElementById('profile-username');
const profileCreated = document.getElementById('profile-created');
const wishlistItems = document.getElementById('wishlist-items');
const orderHistory = document.getElementById('order-history');
const profileStatus = document.getElementById('profile-status');
const logoutBtn = document.getElementById('logout-btn');

function getToken(){
  return localStorage.getItem('token');
}

function redirectToAuth(){
  window.location.href = 'auth.html';
}

function renderWishlist(items){
  if(!items.length){
    wishlistItems.innerHTML = '<p>No wishlist items yet. Add some from the store.</p>';
    return;
  }
  wishlistItems.innerHTML = items.map(item => `
    <div class="wishlist-card">
      <img src="${item.image}" alt="${item.name}">
      <div>
        <strong>${item.name}</strong>
        <div>₹${item.price}</div>
        <div class="small-text">${item.category || 'Saree'}</div>
      </div>
    </div>
  `).join('');
}

function renderOrders(orders){
  if(!orders.length){
    orderHistory.innerHTML = '<p>No orders placed yet.</p>';
    return;
  }
  orderHistory.innerHTML = orders.map(order => `
    <div class="order-card">
      <div class="order-header">
        <strong>Order #${order.id}</strong>
        <span>₹${order.total}</span>
      </div>
      <div class="small-text">Placed on ${new Date(order.created_at).toLocaleDateString()}</div>
      <div class="order-items">
        ${order.items.map(item => `<div>${item.product_id} × ${item.qty} @ ₹${item.price}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

async function loadProfile(){
  const token = getToken();
  if(!token) return redirectToAuth();
  try{
    const res = await fetch(`${API_BASE}/profile`, { headers:{ 'Authorization': 'Bearer '+token } });
    const data = await res.json();
    if(!res.ok){
      profileStatus.textContent = data.error || 'Unable to load profile.';
      return;
    }
    profileUsername.textContent = data.user.username;
    profileCreated.textContent = new Date(data.user.created_at).toLocaleDateString();
    renderWishlist(data.wishlist || []);
    renderOrders(data.orders || []);
    profileStatus.textContent = 'Welcome back!';
  }catch(err){
    profileStatus.textContent = 'Network error while loading profile.';
  }
}

logoutBtn.addEventListener('click', ()=>{
  localStorage.removeItem('token');
  window.location.href = 'auth.html';
});

loadProfile();
