const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4000/api'
  : `${window.location.origin}/api`;
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');
const googleSignin = document.getElementById('google-signin');

function showLogin(){
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  authMessage.textContent = 'New here? Switch to Register to create an account.';
  document.getElementById('register-email').required = false;
  updateAuthState();
}

function showRegister(){
  loginTab.classList.remove('active');
  registerTab.classList.add('active');
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  authMessage.textContent = 'Already have an account? Switch to Login to continue.';
  document.getElementById('register-email').required = true;
  updateAuthState();
}

loginTab.addEventListener('click', showLogin);
registerTab.addEventListener('click', showRegister);

function saveToken(token){
  localStorage.setItem('token', token);
}

async function readResponse(res){
  const text = await res.text();
  if(!text) return {};
  try{
    return JSON.parse(text);
  }catch(err){
    return { error: text };
  }
}

async function sendAuthRequest(url, body){
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body)
  });
  const data = await readResponse(response);
  return { ok: response.ok, data };
}

async function setupGoogleSignIn(){
  try{
    const configRes = await fetch(`${API_BASE}/auth/google-config`);
    const { clientId } = await configRes.json();
    if(!clientId) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      google.accounts.id.initialize({ client_id: clientId, callback: async response => {
        const result = await sendAuthRequest(`${API_BASE}/auth/google`, { credential: response.credential });
        if(!result.ok) return alert(result.data.error || 'Google sign-in failed');
        saveToken(result.data.token);
        window.location.href = 'profile.html';
      }});
      google.accounts.id.renderButton(googleSignin, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
    };
    document.head.appendChild(script);
  }catch(err){ console.error('Google sign-in setup failed', err); }
}

const logoutBtn = document.getElementById('logout-btn');

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const username = loginForm.username.value.trim();
  const password = loginForm.password.value.trim();
  if(!username || !password) return alert('Enter username and password');
  const { ok, data } = await sendAuthRequest(`${API_BASE}/auth/login`, { username, password });
  if(!ok){ return alert(data.error || 'Login failed'); }
  saveToken(data.token);
  alert('Login successful!');
  window.location.href = 'profile.html';
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  const username = registerForm.username.value.trim();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value.trim();
  const confirmPassword = registerForm.passwordConfirm.value.trim();
  if(!username || !email || !password || !confirmPassword) return alert('Fill all registration fields');
  if(password !== confirmPassword) return alert('Passwords do not match');
  const { ok, data } = await sendAuthRequest(`${API_BASE}/auth/register`, { username, email, password });
  if(!ok){ return alert(data.error || 'Registration failed'); }
  saveToken(data.token);
  alert('Registration successful! You are now logged in.');
  window.location.href = 'profile.html';
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  alert('You have been logged out.');
  showLogin();
  logoutBtn.classList.add('hidden');
});

function updateAuthState(){
  if(localStorage.getItem('token')){
    logoutBtn.classList.remove('hidden');
  } else {
    logoutBtn.classList.add('hidden');
  }
}

// Show login form by default
showLogin();
updateAuthState();
setupGoogleSignIn();
