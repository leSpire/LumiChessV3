import { initStorage } from './storage.js';
import { register, login, playAsGuest, getCurrentUser } from './auth.js';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const guestBtn = document.getElementById('guestBtn');
const toRegisterBtn = document.getElementById('toRegisterBtn');
const toLoginBtn = document.getElementById('toLoginBtn');

function feedback(name, message, type = '') {
  const el = document.querySelector(`[data-form-feedback="${name}"]`);
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback ${type}`;
}

function clearFeedback() {
  feedback('login', '');
  feedback('register', '');
  feedback('guest', '');
}

function switchView(view) {
  const isLogin = view === 'login';
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  clearFeedback();
}

function redirectToHome() {
  window.location.href = 'index.html';
}

initStorage();

if (getCurrentUser()) {
  redirectToHome();
}

toRegisterBtn?.addEventListener('click', () => switchView('register'));
toLoginBtn?.addEventListener('click', () => switchView('login'));

guestBtn?.addEventListener('click', () => {
  const result = playAsGuest();
  feedback('guest', result.message, result.ok ? 'success' : 'error');
  if (result.ok) redirectToHome();
});

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fd = new FormData(loginForm);
  const identifier = String(fd.get('identifier') || '').trim();
  const password = String(fd.get('password') || '').trim();

  if (!identifier || !password) {
    feedback('login', 'Veuillez renseigner tous les champs.', 'error');
    return;
  }

  const result = login(identifier, password);
  feedback('login', result.message, result.ok ? 'success' : 'error');
  if (result.ok) redirectToHome();
});

registerForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const fd = new FormData(registerForm);
  const payload = Object.fromEntries(fd);
  const result = register(payload);

  feedback('register', result.message, result.ok ? 'success' : 'error');
  if (result.ok) redirectToHome();
});
