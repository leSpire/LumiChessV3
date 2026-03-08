import { getUsers, saveUsers } from './storage.js';

function linePath(values, width = 500, height = 160, padding = 16) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
      const y = height - padding - ((value - min) / span) * (height - padding * 2);
      return `${index ? 'L' : 'M'}${x},${y}`;
    })
    .join(' ');
}

export function drawChart(svg, values, color) {
  const d = linePath(values);
  svg.innerHTML = `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" />`;
}

export function renderStats(container, user) {
  const elo = user.eloHistory.at(-1) || 0;
  const bestElo = Math.max(...user.eloHistory);
  const avgAcc = Math.round(user.accuracyHistory.reduce((a, b) => a + b, 0) / user.accuracyHistory.length);

  container.innerHTML = `
    <article class="stat-card"><p>Elo actuel</p><h5>${elo}</h5></article>
    <article class="stat-card"><p>Meilleur Elo</p><h5>${bestElo}</h5></article>
    <article class="stat-card"><p>Précision moyenne</p><h5>${avgAcc}%</h5></article>
    <article class="stat-card"><p>Sessions</p><h5>${user.sessions.length}</h5></article>
    <article class="stat-card" style="grid-column: 1/-1;">
      <p>Thèmes faibles détectés</p>
      <div class="tag-wrap">${user.weakThemes.map((t) => `<span class="tag">${t.label} · ${t.weakness}%</span>`).join('')}</div>
    </article>
  `;
}

export function renderSessions(listEl, sessions) {
  if (!sessions.length) {
    listEl.innerHTML = '<li>Aucune session pour le moment.</li>';
    return;
  }
  listEl.innerHTML = sessions.map((s) => `<li>${s.date} · ${s.type} · ${s.score}</li>`).join('');
}

export function renderGoals(container, user, onEdit, onDelete) {
  if (!user.goals.length) {
    container.innerHTML = '<p class="muted">Aucun objectif. Ajoutez un premier cap pour piloter votre progression.</p>';
    return;
  }
  container.innerHTML = user.goals
    .map((g) => {
      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
      const status = pct >= 100 ? 'terminé' : g.status;
      return `<article class="goal-item">
        <div class="goal-item-head"><strong>${g.title}</strong><span class="tag">${status}</span></div>
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <div class="goal-meta"><span>${g.current}/${g.target}</span><span>Échéance: ${g.targetDate}</span><span>${pct}%</span></div>
        <div class="goal-actions">
          <button class="ghost-btn" data-action="edit" data-id="${g.id}">Modifier</button>
          <button class="ghost-btn" data-action="delete" data-id="${g.id}">Supprimer</button>
        </div>
      </article>`;
    })
    .join('');

  container.querySelectorAll('button[data-action="edit"]').forEach((btn) => btn.addEventListener('click', () => onEdit(btn.dataset.id)));
  container.querySelectorAll('button[data-action="delete"]').forEach((btn) => btn.addEventListener('click', () => onDelete(btn.dataset.id)));
}

export function upsertGoal(userId, goal) {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;
  if (goal.id) {
    user.goals = user.goals.map((g) => (g.id === goal.id ? goal : g));
  } else {
    user.goals.push({ ...goal, id: crypto.randomUUID(), status: 'en cours' });
  }
  saveUsers(users);
}

export function deleteGoal(userId, goalId) {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return;
  user.goals = user.goals.filter((g) => g.id !== goalId);
  saveUsers(users);
}
