import { initStorage } from './storage.js';
import { register, login, logout, getCurrentUser, playAsGuest } from './auth.js';
import { drawChart, renderStats, renderSessions, renderGoals, upsertGoal, deleteGoal } from './dashboard.js';

const authView = document.getElementById('authView');
const dashboardView = document.getElementById('dashboardView');
const logoutBtn = document.getElementById('logoutBtn');
const guestBtn = document.getElementById('guestBtn');
const accountChip = document.getElementById('accountChip');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const goalForm = document.getElementById('goalForm');
const addGoalBtn = document.getElementById('addGoalBtn');
const cancelGoalBtn = document.getElementById('cancelGoalBtn');
let editingGoalId = null;

function feedback(name, message, type = '') {
  const el = document.querySelector(`[data-form-feedback="${name}"]`);
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback ${type}`;
}

function formatDelta(values, suffix = '') {
  if (values.length < 2) return 'Données insuffisantes';
  const delta = values.at(-1) - values.at(-2);
  const sign = delta >= 0 ? '+' : '';
  return `Variation récente : ${sign}${delta}${suffix}`;
}

function refresh() {
  const user = getCurrentUser();
  authView.classList.toggle('hidden', !!user);
  dashboardView.classList.toggle('hidden', !user);
  logoutBtn.classList.toggle('hidden', !user);
  accountChip.classList.toggle('hidden', !user);

  if (!user) return;

  accountChip.textContent = user.isGuest ? 'Mode invité actif' : 'Compte connecté';
  document.getElementById('profileAvatar').textContent = user.username.slice(0, 2).toUpperCase();
  document.getElementById('profileUsername').textContent = user.username;
  document.getElementById('profileType').textContent = user.accountType;
  document.getElementById('profileSince').textContent = `Session créée le ${user.createdAt}`;
  document.getElementById('profileBio').textContent = user.bio || 'Aucune bio définie.';
  document.getElementById('profileMainGoal').textContent = `Objectif principal : ${user.goals[0]?.title || 'Définir votre premier objectif'}`;
  document.getElementById('profileSummary').textContent = `Progression récente : Elo ${user.eloHistory.at(-1)} · précision ${user.accuracyHistory.at(-1)}%`;

  renderStats(document.getElementById('statsGrid'), user);
  drawChart(document.getElementById('eloChart'), user.eloHistory, '#dba56f');
  drawChart(document.getElementById('accuracyChart'), user.accuracyHistory, '#9cc2ff', '%');
  document.getElementById('eloDelta').textContent = formatDelta(user.eloHistory);
  document.getElementById('accuracyDelta').textContent = formatDelta(user.accuracyHistory, '%');

  renderSessions(document.getElementById('sessionList'), user.sessions);
  renderGoals(document.getElementById('goalsList'), user, startEditGoal, handleDeleteGoal);
}

function startEditGoal(goalId) {
  const user = getCurrentUser();
  if (!user) return;
  const goal = user.goals.find((g) => g.id === goalId);
  if (!goal) return;
  editingGoalId = goal.id;
  goalForm.title.value = goal.title;
  goalForm.type.value = goal.type;
  goalForm.targetDate.value = goal.targetDate;
  goalForm.current.value = goal.current;
  goalForm.target.value = goal.target;
  goalForm.classList.remove('hidden');
}

function handleDeleteGoal(goalId) {
  const user = getCurrentUser();
  if (!user) return;
  deleteGoal(user, goalId);
  refresh();
}

initStorage();
refresh();

logoutBtn.addEventListener('click', () => {
  logout();
  feedback('login', '');
  feedback('register', '');
  refresh();
});

guestBtn?.addEventListener('click', () => {
  const result = playAsGuest();
  feedback('login', result.message, 'success');
  refresh();
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  const identifier = String(fd.get('identifier') || '').trim();
  const password = String(fd.get('password') || '');
  if (!identifier || !password) {
    feedback('login', 'Veuillez renseigner tous les champs.', 'error');
    return;
  }

  const result = login(identifier, password);
  feedback('login', result.message, result.ok ? 'success' : 'error');
  if (result.ok) {
    loginForm.reset();
    refresh();
  }
});

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(registerForm);
  const payload = Object.fromEntries(fd);
  const result = register(payload);
  feedback('register', result.message, result.ok ? 'success' : 'error');
  if (result.ok) {
    registerForm.reset();
    refresh();
  }
});

addGoalBtn.addEventListener('click', () => {
  editingGoalId = null;
  goalForm.reset();
  goalForm.classList.toggle('hidden');
});

cancelGoalBtn.addEventListener('click', () => {
  editingGoalId = null;
  goalForm.reset();
  goalForm.classList.add('hidden');
  feedback('goal', '');
});

goalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = getCurrentUser();
  if (!user) return;
  const fd = new FormData(goalForm);
  const data = Object.fromEntries(fd);

  const current = Number(data.current);
  const target = Number(data.target);
  if (!data.title || data.title.length < 5 || !data.targetDate || current < 0 || target <= 0) {
    feedback('goal', 'Formulaire objectif invalide.', 'error');
    return;
  }

  upsertGoal(user, {
    id: editingGoalId,
    title: data.title,
    type: data.type,
    targetDate: data.targetDate,
    current,
    target,
    status: current >= target ? 'terminé' : 'en cours'
  });

  feedback('goal', 'Objectif sauvegardé.', 'success');
  goalForm.reset();
  goalForm.classList.add('hidden');
  editingGoalId = null;
  refresh();
});
