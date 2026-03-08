import { getUsers, saveUsers, getGuests, saveGuests } from './storage.js';

function linePath(values, width = 500, height = 180, padding = 24) {
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

function buildStoreForMode(mode) {
  if (mode === 'guest') {
    return {
      list: getGuests,
      save: saveGuests
    };
  }
  return {
    list: getUsers,
    save: saveUsers
  };
}

function updateProfile(mode, profileId, updater) {
  const store = buildStoreForMode(mode);
  const profiles = store.list();
  const target = profiles.find((entry) => entry.id === profileId);
  if (!target) return null;
  updater(target);
  store.save(profiles);
  return target;
}

export function drawChart(svg, values, color, suffix = '') {
  const width = 500;
  const height = 180;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const d = linePath(values, width, height);
  const points = values
    .map((value, index) => {
      const x = 24 + (index * (width - 48)) / Math.max(values.length - 1, 1);
      const y = height - 24 - ((value - min) / (max - min || 1)) * (height - 48);
      return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" />`;
    })
    .join('');
  const labels = [max, Math.round((max + min) / 2), min]
    .map((label, idx) => `<text x="10" y="${30 + idx * 62}" fill="rgba(225,230,245,.65)" font-size="11">${label}${suffix}</text>`)
    .join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartGradient-${svg.id}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.45"></stop>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="500" height="180" fill="transparent" />
    <path d="${d} L476,156 L24,156 Z" fill="url(#chartGradient-${svg.id})"></path>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" />
    ${points}
    ${labels}
  `;
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
    <article class="stat-card stat-card-wide">
      <p>Thèmes faibles détectés</p>
      <div class="weak-list">
        ${user.weakThemes
          .map(
            (t) => `<div class="weak-theme"><span>${t.label}</span><strong>${t.weakness}%</strong><div class="weak-meter"><span style="width:${t.weakness}%"></span></div></div>`
          )
          .join('')}
      </div>
    </article>
  `;
}

export function renderSessions(listEl, sessions) {
  if (!sessions.length) {
    listEl.innerHTML = '<li class="empty">Aucune session pour le moment.</li>';
    return;
  }
  listEl.innerHTML = sessions
    .map((s) => `<li><span>${s.date}</span><strong>${s.type}</strong><em>${s.score}</em></li>`)
    .join('');
}

export function renderGoals(container, user, onEdit, onDelete) {
  if (!user.goals.length) {
    container.innerHTML = '<p class="empty-state">Aucun objectif. Définissez un premier cap pour orienter votre progression.</p>';
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

export function upsertGoal(profile, goal) {
  return updateProfile(profile.isGuest ? 'guest' : 'account', profile.id, (targetProfile) => {
    if (goal.id) {
      targetProfile.goals = targetProfile.goals.map((g) => (g.id === goal.id ? goal : g));
      return;
    }

    targetProfile.goals.push({ ...goal, id: crypto.randomUUID(), status: 'en cours' });
  });
}

export function deleteGoal(profile, goalId) {
  return updateProfile(profile.isGuest ? 'guest' : 'account', profile.id, (targetProfile) => {
    targetProfile.goals = targetProfile.goals.filter((g) => g.id !== goalId);
  });
}
