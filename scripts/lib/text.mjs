// Outils texte : normalisation pour les jointures et mise en forme des libellés.

/** Clé de comparaison : minuscules, sans accents, ponctuation réduite à des espaces. */
export function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/['’`´]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bst\b/g, 'saint')
    .replace(/\bste\b/g, 'sainte')
    .trim()
    .replace(/\s+/g, ' ');
}

const ACRONYMS = new Set([
  'meef', 'miage', 'staps', 'miashs', 'ia', 'ai', 'pme', 'pmi', 'rh', 'aes', 'lea', 'llcer', 'tic', 'qhse',
  'btp', 'it', 'ii', 'mbfa', 'cca', 'grh', 'ue', 'fle', 'sig', 'meci', 'cnam', 'bts', 'but', 'dut', 'cpge',
  'iut', 'ufr', 'inspe', 'msc', 'mba', 'iae', 'ecg', 'mpsi', 'pcsi', 'ptsi', 'bcpst', 'tsi', 'mp2i', 'ens',
  'ifsi', 'pass', 'las', 'dcg', 'dscg', 'nsi', 'svt', 'ses', 'hggsp', 'llce'
]);

/** "DROIT DES AFFAIRES" → "Droit des affaires" (en conservant les sigles). */
export function sentenceCase(s) {
  const lower = String(s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
  const words = lower.split(/(\s+|-|'|’|\/|\(|\)|:|,)/);
  const out = words.map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w)).join('');
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Première lettre en majuscule, reste inchangé. */
export function capitalize(s) {
  const t = String(s ?? '').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
