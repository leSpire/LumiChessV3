import {
  getUsers,
  saveUsers,
  saveSession,
  clearSession,
  getSession,
  createGuestSession,
  getGuests
} from './storage.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;

  if (session.mode === 'account') {
    const account = getUsers().find((u) => u.id === session.userId);
    return account ? { ...account, accountType: 'compte' } : null;
  }

  if (session.mode === 'guest') {
    const guest = getGuests().find((g) => g.id === session.guestId);
    return guest ? { ...guest, accountType: 'invité', isGuest: true } : null;
  }

  return null;
}

export function logout() {
  clearSession();
}

export function playAsGuest() {
  const guest = createGuestSession();
  return { ok: true, user: { ...guest, accountType: 'invité', isGuest: true }, message: 'Session invité démarrée.' };
}

export function register(payload) {
  const { username, email, password, confirmPassword } = payload;
  if (!username || username.trim().length < 3) return { ok: false, message: 'Pseudo invalide (min 3 caractères).' };
  if (!emailRegex.test(email)) return { ok: false, message: 'Email invalide.' };
  if (password.length < 8) return { ok: false, message: 'Mot de passe trop court (min 8).' };
  if (password !== confirmPassword) return { ok: false, message: 'Les mots de passe ne correspondent pas.' };

  const users = getUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase());
  if (exists) return { ok: false, message: 'Compte déjà existant (email ou pseudo).' };

  const user = {
    id: crypto.randomUUID(),
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
    createdAt: new Date().toISOString().slice(0, 10),
    bio: 'Nouveau joueur LumiChess',
    eloHistory: [800, 820, 845],
    accuracyHistory: [68, 70, 73],
    sessions: [
      { date: new Date().toISOString().slice(0, 10), type: 'Onboarding', score: 'Profil créé' }
    ],
    weakThemes: [
      { label: 'Ouvertures', weakness: 56 },
      { label: 'Finales', weakness: 62 }
    ],
    goals: []
  };

  users.push(user);
  saveUsers(users);
  saveSession({ mode: 'account', userId: user.id });
  return { ok: true, user: { ...user, accountType: 'compte' }, message: 'Compte créé avec succès.' };
}

export function login(identifier, password) {
  const users = getUsers();
  const user = users.find(
    (u) =>
      (u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()) &&
      u.password === password
  );
  if (!user) return { ok: false, message: 'Identifiants invalides.' };
  saveSession({ mode: 'account', userId: user.id });
  return { ok: true, user: { ...user, accountType: 'compte' }, message: 'Connexion réussie.' };
}
