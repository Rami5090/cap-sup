/** Clé de comparaison identique à celle du pipeline de données (minuscules, sans accents ni ponctuation). */
export function norm(s: string | null | undefined): string {
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

// Mots trop courants pour caractériser un projet ou une formation.
const STOPWORDS = new Set(
  (
    'a au aux avec ce ces cet cette dans de des du elle en et etc il ils je j la le les leur leurs lui ma mais me mes moi mon ' +
    'ne ni nos notre nous on ou par pas plus pour qu que qui sa se ses si son sur ta te tes toi ton tu un une vos votre vous ' +
    'y est sont suis etre avoir fait faire aussi tres bien comme entre tout tous toute toutes autre autres afin ainsi deja ' +
    'master licence mention parcours formation formations diplome diplomes etude etudes annee annees m1 m2 l3 bac niveau ' +
    'metier metiers domaine domaines option options general generale specialite specialites aujourd hui veux voudrais ' +
    'aimerais souhaite souhaiterais projet plutot vers apres avant'
  ).split(' ')
);

/** Racine grossière d'un mot français (6 premières lettres, sans pluriel) pour rapprocher « logistique » et « logistiques ». */
export function stem(word: string): string {
  const w = word.length > 4 ? word.replace(/(aux|eaux|s|x)$/, '') : word;
  return w.slice(0, 6);
}

/** Racines significatives d'un texte (sans mots vides ni mots de moins de 3 lettres). */
export function stems(text: string | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const w of norm(text).split(' ')) {
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    out.add(stem(w));
  }
  return out;
}

/** Associe à chaque racine un mot lisible, pour afficher les mots en commun. */
export function stemLabels(text: string | null | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const w of norm(text).split(' ')) {
    if (w.length < 3 || STOPWORDS.has(w)) continue;
    const s = stem(w);
    if (!out.has(s)) out.set(s, w);
  }
  return out;
}
