// Métiers ONISEP (fiches métiers + Idéo-Métiers) et liens métiers → formations ;
// mots-clés des mentions de master (Trouver mon master).
import { domainsFromOnisep } from './domains.mjs';
import { norm } from './text.mjs';

function block(text, tag) {
  const i = text.indexOf(`<${tag}>`);
  if (i < 0) return '';
  const j = text.indexOf(`</${tag}>`, i);
  return j < 0 ? '' : text.slice(i + tag.length + 2, j);
}
const libelles = (text) => [...text.matchAll(/<libelle>([^<]*)<\/libelle>/g)].map((x) => x[1].trim()).filter(Boolean);
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'").replace(/&nbsp;/g, ' ');

function plainText(html) {
  return decode(
    html
      .replace(/<!\[CDATA\[|\]\]>/g, '')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Niveau d'accès minimum ONISEP → nombre d'années après le bac (CAP = -1, avant le bac = -2). */
export function levelFromLabel(label) {
  const t = norm(label);
  const m = t.match(/bac (\d+)/);
  if (m) return Number(m[1]);
  if (t.startsWith('bac')) return 0;
  if (t.startsWith('cap')) return -1;
  if (/brevet|3e|sans diplome/.test(t)) return -2;
  return null;
}

/** Fiches métiers ONISEP (XML) → liste de métiers. */
export function parseFichesMetiers(xml) {
  const out = [];
  for (const m of xml.split('<metier>').slice(1)) {
    const id = Number((m.match(/<identifiant>MET\.(\d+)<\/identifiant>/) ?? [])[1]);
    const name = decode((m.match(/<nom_metier>([^<]*)<\/nom_metier>/) ?? [])[1] ?? '').trim();
    if (!id || !name) continue;
    const synonyms = [...block(m, 'synonymes').matchAll(/<nom_metier>([^<]*)<\/nom_metier>/g)].map((x) => decode(x[1]).trim());
    const accroche = plainText(block(m, 'accroche_metier'));
    out.push({
      id,
      name,
      synonyms,
      sectors: libelles(block(m, 'secteurs_activite')),
      level: levelFromLabel(libelles(block(m, 'niveau_acces_min'))[0] ?? ''),
      statuts: libelles(block(m, 'statuts')),
      fors: [...block(m, 'formations_min_requise').matchAll(/<id>FOR\.(\d+)<\/id>/g)].map((x) => Number(x[1])),
      forLabels: [...block(m, 'formations_min_requise').matchAll(/<id>FOR\.(\d+)<\/id>\s*<libelle>([^<]*)<\/libelle>/g)].map((x) => [Number(x[1]), decode(x[2])]),
      accroche: accroche.length > 230 ? `${accroche.slice(0, 227).replace(/\s+\S*$/, '')}…` : accroche
    });
  }
  return out;
}

/** Idéo-Métiers (CSV) : domaines ONISEP de chaque métier, indexés par numéro MET. */
export function domainsByMetier(rows) {
  const map = new Map();
  for (const r of rows) {
    const id = Number((r['lien site onisep.fr']?.match(/MET\.(\d+)/) ?? [])[1]);
    if (!id || map.has(id)) continue;
    map.set(id, domainsFromOnisep(r['domaine/sous-domaine']));
  }
  return map;
}

// Clé de rapprochement des intitulés de mention (Mon Master ↔ ONISEP).
const STOP = new Set(['et', 'de', 'des', 'du', 'la', 'le', 'les', 'l', 'd', 'a', 'aux', 'au', 'en', 'pour', 'par', 'sur']);
const DROP = new Set(['meef', 'miage', 'miashs', 'llcer', 'mention', 'master']);
export function mentionKey(label) {
  let t = norm(String(label ?? '').replace(/\(.*?\)/g, ' '));
  t = t.replace(/\bstaps\b/g, 'sciences et techniques des activites physiques et sportives');
  return t
    .split(' ')
    .filter((w) => w && !STOP.has(w) && !DROP.has(w))
    .map((w) => (w.length > 3 ? w.replace(/[sx]$/, '') : w))
    .join(' ');
}
const MENTION_ALIASES = new Map([
  [
    mentionKey("Métiers de l'enseignement, de l'éducation et de la formation (MEEF), 1er degré"),
    mentionKey('enseignement et éducation - professorat des écoles')
  ]
]);

/** Table « clé de mention de master » → numéro FOR ONISEP, à partir des fiches métiers et des actions de formation. */
export function masterForTable(metiers, onisepRows) {
  const table = new Map();
  for (const m of metiers) {
    for (const [id, label] of m.forLabels) {
      const mm = label.match(/^master mention (.+)$/i);
      if (mm) table.set(mentionKey(mm[1]), id);
    }
  }
  for (const r of onisepRows) {
    if (r['FOR type']?.trim() !== 'master') continue;
    const mm = r['Formation (FOR) libellé']?.match(/^master mention (.+?)(?: parcours |$)/i);
    const id = Number((r['FOR URL et ID Onisep']?.match(/FOR\.(\d+)/) ?? [])[1]);
    if (mm && id && !table.has(mentionKey(mm[1]))) table.set(mentionKey(mm[1]), id);
  }
  return {
    lookup(mention) {
      const k = mentionKey(mention);
      return table.get(k) ?? table.get(MENTION_ALIASES.get(k)) ?? null;
    },
    size: table.size
  };
}

const NOISE = /^-+|compétences (professionnelles|et développement)|^autres?$/i;
/** Trouver mon master : mots-clés (métiers, secteurs, disciplines) réunis par mention (INM). */
export function keywordsByMention(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.for_inm) continue;
    if (!map.has(r.for_inm)) map.set(r.for_inm, new Set());
    const set = map.get(r.for_inm);
    for (const k of [...(r.for_mc_metier ?? []), ...(r.for_mc_sectoriel ?? []), ...(r.for_mc_disciplinaire ?? [])]) {
      const t = String(k).trim();
      if (t && !NOISE.test(t) && set.size < 30) set.add(t);
    }
  }
  return new Map([...map].map(([k, v]) => [k, [...v].join(', ')]));
}
