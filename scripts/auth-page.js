import { initStorage } from './storage.js';
import { register, login, playAsGuest, getCurrentUser } from './auth.js';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const guestBtn = document.getElementById('guestBtn');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');

function feedback(name, message, type = '') {
  const el = document.querySelector(`[data-form-feedback="${name}"]`);
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback ${type}`;
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  showLoginBtn.classList.toggle('active', isLogin);
  showRegisterBtn.classList.toggle('active', !isLogin);
  feedback('login', '');
  feedback('register', '');
}

function redirectToProfile() {
  window.location.href = 'profile.html';
}

initStorage();

if (getCurrentUser()) {
  redirectToProfile();
}

showLoginBtn.addEventListener('click', () => switchTab('login'));
showRegisterBtn.addEventListener('click', () => switchTab('register'));

guestBtn.addEventListener('click', () => {
  const result = playAsGuest();
  feedback('guest', result.message, result.ok ? 'success' : 'error');
  if (result.ok) redirectToProfile();
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fd = new FormData(loginForm);
  const identifier = String(fd.get('identifier') || '').trim();
  const password = String(fd.get('password') || '');

  if (!identifier || !password) {
    feedback('login', 'Veuillez renseigner tous les champs.', 'error');
    return;
  }

  const result = login(identifier, password);
  feedback('login', result.message, result.ok ? 'success' : 'error');
  if (result.ok) redirectToProfile();
});

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fd = new FormData(registerForm);
  const payload = Object.fromEntries(fd);
  const result = register(payload);

  feedback('register', result.message, result.ok ? 'success' : 'error');
  if (result.ok) redirectToProfile();
});
