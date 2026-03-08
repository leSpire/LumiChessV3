const KEYS = {
  users: 'lumichess.users',
  guestProfiles: 'lumichess.guests',
  session: 'lumichess.session.v2'
};

const demoUsers = [
  {
    id: crypto.randomUUID(),
    username: 'LumiKnight',
    email: 'demo@lumichess.app',
    password: 'LumiChess123',
    createdAt: '2025-01-08',
    bio: 'Joueur orienté tactique, en montée vers 1200 Elo.',
    eloHistory: [842, 917, 965, 1012, 1044, 1088],
    accuracyHistory: [71, 73, 77, 79, 81, 83],
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

function defaultGuestProfile(name = 'Invité Lumi') {
  return {
    id: crypto.randomUUID(),
    username: name,
    createdAt: new Date().toISOString().slice(0, 10),
    bio: 'Session invité · découverte de LumiChess.',
    eloHistory: [780, 792, 805, 812],
    accuracyHistory: [63, 67, 69, 71],
    sessions: [
      { date: new Date().toISOString().slice(0, 10), type: 'Puzzle', score: 'Précision 71%' }
    ],
    weakThemes: [
      { label: 'Ouvertures', weakness: 64 },
      { label: 'Vision tactique', weakness: 58 }
    ],
    goals: []
  };
}

export function initStorage() {
  if (!localStorage.getItem(KEYS.users)) {
    localStorage.setItem(KEYS.users, JSON.stringify(demoUsers));
  }
  if (!localStorage.getItem(KEYS.guestProfiles)) {
    localStorage.setItem(KEYS.guestProfiles, JSON.stringify([]));
  }
  migrateLegacySession();
}

function migrateLegacySession() {
  const legacy = localStorage.getItem('lumichess.session');
  const current = localStorage.getItem(KEYS.session);
  if (legacy && !current) {
    saveSession({ mode: 'account', userId: legacy });
    localStorage.removeItem('lumichess.session');
  }
}

export function getUsers() {
  return JSON.parse(localStorage.getItem(KEYS.users) || '[]');
}

export function saveUsers(users) {
  localStorage.setItem(KEYS.users, JSON.stringify(users));
}

export function getGuests() {
  return JSON.parse(localStorage.getItem(KEYS.guestProfiles) || '[]');
}

export function saveGuests(guests) {
  localStorage.setItem(KEYS.guestProfiles, JSON.stringify(guests));
}

export function createGuestSession() {
  const guests = getGuests();
  const guestName = `Invité #${guests.length + 1}`;
  const guest = defaultGuestProfile(guestName);
  guests.push(guest);
  saveGuests(guests);
  saveSession({ mode: 'guest', guestId: guest.id });
  return guest;
}

export function updateGuest(guestId, updater) {
  const guests = getGuests();
  const index = guests.findIndex((g) => g.id === guestId);
  if (index < 0) return null;
  guests[index] = updater(guests[index]);
  saveGuests(guests);
  return guests[index];
}

export function getSession() {
  const raw = localStorage.getItem(KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(sessionData) {
  localStorage.setItem(KEYS.session, JSON.stringify(sessionData));
}

export function clearSession() {
  localStorage.removeItem(KEYS.session);
}
