// Où tourne Cap Sup : seul (GitHub Pages), ou comme module d'Unaa OS (adresse /apps/<id>/), où chaque membre de la
// famille a ses propres réponses, même sur un appareil partagé.

export const UNAA = typeof location !== 'undefined' && /^\/apps\//.test(location.pathname);
export const UNAA_API = UNAA ? `/api/modules/${location.pathname.split('/')[2] || 'capsup'}/state` : '';

export const scope = { uid: '' };
const LAST = 'capsup:membre';

/** Dans Unaa OS : quel membre est connecté (hors ligne : le dernier connu sur cet appareil). */
export async function initScope(): Promise<void> {
  if (!UNAA) return;
  let uid = '';
  try {
    const res = await fetch(UNAA_API, { cache: 'no-store' });
    if (res.ok) uid = String(((await res.json()) as { user_id: number }).user_id);
  } catch {
    /* hors ligne */
  }
  try {
    if (uid) localStorage.setItem(LAST, uid);
    else uid = localStorage.getItem(LAST) ?? '';
  } catch {
    /* stockage indisponible */
  }
  scope.uid = uid || 'invite';
}

/** Clé du navigateur propre au membre connecté (dans Unaa OS) ; inchangée hors d'Unaa OS. */
export const scoped = (key: string): string => (UNAA ? `${key}:${scope.uid}` : key);
