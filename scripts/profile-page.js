import { initStorage } from './storage.js';
import { getCurrentUser, logout } from './auth.js';
import { drawChart, renderStats, renderSessions, renderGoals, upsertGoal, deleteGoal } from './dashboard.js';

const logoutBtn = document.getElementById('logoutBtn');
const accountChip = document.getElementById('accountChip');
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
  return `${sign}${delta}${suffix}`;
}

function getPrimaryWeakTheme(user) {
  if (!user.weakThemes?.length) return 'Aucun thème faible détecté';
  const weak = [...user.weakThemes].sort((a, b) => b.weakness - a.weakness)[0];
  return `${weak.label} (${weak.weakness}%)`;
}

function redirectToAuth() {
  window.location.href = 'auth.html';
}

function refresh() {
  const user = getCurrentUser();
  if (!user) {
    redirectToAuth();
    return;
  }

  accountChip.textContent = user.isGuest ? 'Mode invité' : 'Compte enregistré';
  document.getElementById('profileAvatar').textContent = user.username.slice(0, 2).toUpperCase();
  document.getElementById('profileUsername').textContent = user.username;
  document.getElementById('profileType').textContent = user.accountType;
  document.getElementById('profileSince').textContent = `Inscrit le ${user.createdAt}`;
  document.getElementById('profileBio').textContent = user.bio || 'Aucune bio définie';
  document.getElementById('profileFocus').textContent = `Thème faible principal : ${getPrimaryWeakTheme(user)}`;
  document.getElementById('profileMainGoal').textContent = `Objectif principal : ${user.goals[0]?.title || 'Définir votre premier objectif'}`;

  renderStats(document.getElementById('stats'), user);
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

  const goal = user.goals.find((entry) => entry.id === goalId);
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
  redirectToAuth();
});

addGoalBtn.addEventListener('click', () => {
  editingGoalId = null;
  goalForm.reset();
  feedback('goal', '');
  goalForm.classList.toggle('hidden');
});

cancelGoalBtn.addEventListener('click', () => {
  editingGoalId = null;
  goalForm.reset();
  feedback('goal', '');
  goalForm.classList.add('hidden');
});

goalForm.addEventListener('submit', (event) => {
  event.preventDefault();
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

  editingGoalId = null;
  goalForm.reset();
  goalForm.classList.add('hidden');
  feedback('goal', 'Objectif sauvegardé.', 'success');
  refresh();
});
