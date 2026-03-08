const KEYS = {
  users: 'lumichess.users',
  session: 'lumichess.session'
};

const demoUsers = [
  {
    id: crypto.randomUUID(),
    username: 'LumiKnight',
    email: 'demo@lumichess.app',
    password: 'LumiChess123',
    createdAt: '2025-01-08',
    bio: 'Joueur orienté tactique, en montée vers 1200 Elo.',
    eloHistory: [842, 917, 965, 1012],
    accuracyHistory: [71, 73, 77, 79],
    sessions: [
      { date: '2026-02-22', type: 'Tactique', score: '+18 Elo' },
      { date: '2026-02-21', type: 'Finales', score: '31 min' },
      { date: '2026-02-19', type: 'Analyse', score: 'Précision 82%' }
    ],
    weakThemes: [
      { label: 'Finales', weakness: 78 },
      { label: 'Calcul', weakness: 69 },
      { label: 'Clouages défensifs', weakness: 61 }
    ],
    goals: [
      {
        id: crypto.randomUUID(),
        title: '+100 Elo en 3 mois',
        type: 'elo',
        targetDate: '2026-05-30',
        current: 42,
        target: 100,
        status: 'en cours'
      }
    ]
  }
];

export function initStorage() {
  if (!localStorage.getItem(KEYS.users)) {
    localStorage.setItem(KEYS.users, JSON.stringify(demoUsers));
  }
}

export function getUsers() {
  return JSON.parse(localStorage.getItem(KEYS.users) || '[]');
}

export function saveUsers(users) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

export function getSession() {
  return localStorage.getItem(KEYS.session);
}

export function saveSession(userId) {
  localStorage.setItem(KEYS.session, userId);
}

export function clearSession() {
  localStorage.removeItem(KEYS.session);
}
