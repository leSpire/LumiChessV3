import { initStorage } from './storage.js';
import { getCurrentUser } from './auth.js';

initStorage();

const currentUser = getCurrentUser();
const accountChip = document.getElementById('homeAccountChip');
const authBtn = document.getElementById('homeAuthBtn');
const profileBtn = document.getElementById('homeProfileBtn');
const heroMainCta = document.getElementById('heroMainCta');
const heroSecondaryCta = document.getElementById('heroSecondaryCta');

if (currentUser) {
  const isGuest = Boolean(currentUser.isGuest);
  const displayName = currentUser.username || 'Joueur';

  if (accountChip) {
    accountChip.classList.remove('hidden');
    accountChip.textContent = isGuest ? `Session invité · ${displayName}` : `Connecté · ${displayName}`;
  }

  if (authBtn) {
    authBtn.textContent = isGuest ? 'Changer de session' : 'Changer de compte';
  }

  if (profileBtn) {
    profileBtn.textContent = 'Accéder à mon profil';
  }

  if (heroMainCta) {
    heroMainCta.textContent = 'Continuer mon parcours →';
    heroMainCta.href = 'profile.html';
  }

  if (heroSecondaryCta) {
    heroSecondaryCta.textContent = 'Gérer mon compte';
    heroSecondaryCta.href = 'auth.html';
  }
}
