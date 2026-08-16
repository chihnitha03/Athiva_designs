const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;
const loginForm = document.getElementById('admin-login-form');
const message = document.getElementById('admin-message');

function saveAdminToken(token){
  localStorage.setItem('admin_token', token);
}

function getAdminToken(){
  return localStorage.getItem('admin_token');
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();
  
  if(!username || !password){
    message.textContent = 'Please enter username and password';
    message.style.color = '#c53030';
    return;
  }

  try{
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if(!res.ok){
      message.textContent = data.error || 'Login failed';
      message.style.color = '#c53030';
      return;
    }

    saveAdminToken(data.token);
    alert('Admin login successful!');
    window.location.href = 'admin-dashboard.html';
  }catch(err){
    message.textContent = 'Network error. Please try again.';
    message.style.color = '#c53030';
    console.error(err);
  }
});

// Check if already logged in
if(getAdminToken()){
  window.location.href = 'admin-dashboard.html';
}
