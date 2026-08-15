const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;
const wishlistItems = document.getElementById('wishlist-items');
const statusEl = document.getElementById('wishlist-status');

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
  statusEl.textContent = `You have ${items.length} item${items.length === 1 ? '' : 's'} in your wishlist.`;
  wishlistItems.innerHTML = items.map(item => `
    <div class="wishlist-card">
      <img src="${item.image}" alt="${item.name}">
      <div>
        <strong>${item.name}</strong>
        <div>₹${item.price}</div>
        <div class="small-text">${item.category || 'Saree'}</div>
        <div style="margin-top:0.85rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
          <button class="button-secondary remove-wishlist" data-id="${item.id}">Remove</button>
          <a class="button-link" href="index.html">Continue Shopping</a>
        </div>
      </div>
    </div>
  `).join('');
}

async function loadWishlist(){
  const token = getToken();
  if(!token) return redirectToAuth();
  try{
    const res = await fetch(`${API_BASE}/wishlist`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if(res.status === 401){
      return redirectToAuth();
    }
    if(!res.ok){
      statusEl.textContent = 'Unable to load wishlist right now.';
      return;
    }
    const data = await res.json();
    renderWishlist(data);
  }catch(err){
    statusEl.textContent = 'Network error loading wishlist.';
  }
}

wishlistItems.addEventListener('click', async (event) => {
  const removeBtn = event.target.closest('.remove-wishlist');
  if(!removeBtn) return;
  const productId = Number(removeBtn.dataset.id);
  const token = getToken();
  if(!token) return redirectToAuth();

  try{
    const res = await fetch(`${API_BASE}/wishlist/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if(res.ok){
      loadWishlist();
    }
  }catch(err){
    statusEl.textContent = 'Could not remove item from wishlist.';
  }
});

loadWishlist();
