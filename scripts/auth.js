import { getUsers, saveUsers, saveSession, clearSession, getSession } from './storage.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return getUsers().find((u) => u.id === session) || null;
}

export function logout() {
  clearSession();
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
    eloHistory: [800, 820],
    accuracyHistory: [68, 70],
    sessions: [],
    weakThemes: [
      { label: 'Ouvertures', weakness: 56 },
      { label: 'Finales', weakness: 62 }
    ],
    goals: []
  };

  users.push(user);
  saveUsers(users);
  saveSession(user.id);
  return { ok: true, user, message: 'Compte créé avec succès.' };
}

export function login(identifier, password) {
  const users = getUsers();
  const user = users.find(
    (u) => (u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()) && u.password === password
  );
  if (!user) return { ok: false, message: 'Identifiants invalides.' };
  saveSession(user.id);
  return { ok: true, user, message: 'Connexion réussie.' };
}
