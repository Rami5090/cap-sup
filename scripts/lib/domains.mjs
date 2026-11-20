// Les 20 grands domaines de la nomenclature ONISEP (Idéo-Nomenclature domaines et sous-domaines),
// et les règles qui rattachent les formations Mon Master / Parcoursup à ces domaines.
import { norm } from './text.mjs';

export const ONISEP_DOMAINS = {
  'agriculture, animaux': 'agri',
  'armée, sécurité': 'armee',
  'arts, culture, artisanat': 'arts',
  'banque, assurances, immobilier': 'banque',
  'commerce, marketing, vente': 'commerce',
  'construction, architecture, travaux publics': 'btp',
  'économie, droit, politique': 'droit',
  'électricité, électronique, robotique': 'elec',
  'environnement, énergies, propreté': 'envir',
  'gestion des entreprises, comptabilité': 'gestion',
  'histoire-géographie, psychologie, sociologie': 'shs',
  'hôtellerie-restauration, tourisme': 'hotel',
  'information-communication, audiovisuel': 'com',
  'informatique, internet': 'info',
  'lettres, langues, enseignement': 'lettres',
  'logistique, transport': 'logist',
  'matières premières, fabrication, industries': 'indus',
  'mécanique': 'meca',
  'santé, social, sport': 'sante',
  'sciences': 'sciences'
};

/** Domaines ONISEP d'une action de formation (champ « FOR indexation domaine web Onisep »). */
export function domainsFromOnisep(indexation) {
  const out = [];
  for (const part of String(indexation ?? '').split('|')) {
    const top = part.split('/')[0].trim().toLowerCase();
    const id = ONISEP_DOMAINS[top];
    if (id && !out.includes(id)) out.push(id);
  }
  return out.slice(0, 3);
}

// Secteur disciplinaire (Mon Master / SISE) → domaines par défaut.
const SECTOR_DEFAULTS = {
  'administration economique et sociale': ['gestion', 'droit'],
  amenagement: ['envir', 'btp'],
  'archeologie ethnologie prehistoire anthropologie': ['shs'],
  arts: ['arts'],
  chimie: ['sciences', 'indus'],
  'francais langue etrangere': ['lettres'],
  'genie civil': ['btp'],
  'genie des procedes materiaux': ['indus', 'sciences'],
  geographie: ['shs', 'envir'],
  histoire: ['shs'],
  informatique: ['info'],
  'langues et litteratures francaises': ['lettres'],
  'langues et litteratures etrangeres': ['lettres'],
  'langues etrangeres appliquees': ['lettres', 'commerce'],
  'litterature generale et comparee': ['lettres'],
  'mathematique et informatique': ['info', 'sciences'],
  'mathematiques appliquees et sciences sociales': ['sciences', 'info', 'shs'],
  mathematiques: ['sciences'],
  'mecanique genie mecanique ingenierie mecanique': ['meca', 'indus'],
  'philosophie epistemologie': ['shs'],
  'physique et chimie': ['sciences'],
  physique: ['sciences'],
  'pluridisciplinaire droit sciences politiques': ['droit'],
  'pluridisciplinaire droit sciences economiques aes': ['droit', 'gestion'],
  'pluridisciplinaire lettres langues sciences humaines': ['lettres', 'shs'],
  'pluridisciplinaire lettres sciences du langage arts': ['lettres', 'arts'],
  'pluridisciplinaire sciences': ['sciences'],
  'pluridisciplinaire sciences fondamentales et applications': ['sciences', 'indus'],
  'pluridisciplinaire sciences humaines et sociales': ['shs'],
  'pluridisciplinaire sciences economiques et gestion': ['droit', 'gestion'],
  'psychologie sciences cognitives': ['shs', 'sante'],
  staps: ['sante'],
  'sciences de gestion': ['gestion'],
  'sciences de l information et la communication': ['com'],
  'sciences de l univers de la terre de l espace de la mer': ['sciences', 'envir'],
  'sciences de l education': ['lettres'],
  'sciences de la vie biologie sante': ['sciences', 'sante'],
  'sciences du langage linguistique': ['lettres'],
  'sciences juridiques': ['droit'],
  'sciences politiques': ['droit'],
  'sciences religieuses': ['shs'],
  'sciences economiques': ['droit'],
  'sociologie demographie': ['shs'],
  'technologie et sciences industrielles': ['indus'],
  'theologie catholique': ['shs'],
  'electronique genie electrique electronique electrotechnique automatique': ['elec']
};

// Règles par mots-clés (texte normalisé, sans accents). Toutes les règles qui correspondent s'additionnent.
const RULES = [
  [/\b(miage|systemes d information)\b/, ['info', 'gestion']],
  [/cyber|reseaux et tele|telecom/, ['info', 'elec']],
  [/intelligence artificielle|\bia\b|science des donnees|donnees|\bdata\b|statistique et informatique decisionnelle/, ['info', 'sciences']],
  [/informatique|informaticien|logiciel|developpeur|developpement (web|logiciel|informatique|d applications)|programmation|numerique|\bweb\b|jeux video|calcul haute|traitement automatique des langues/, ['info']],
  [/logisti|transport|supply|mobilites?\b|douane|transit/, ['logist']],
  [/tourisme|hotel|restauration (collective|rapide|commerciale)|hotellerie|gastronom|hospitality|cuisine|patisserie|boulangerie|sommelier|evenementiel|arts culinaires/, ['hotel']],
  [/agri|agro|vigne|\bvins?\b|viticult|oenolog|forest|foret|animal|animaux|elevage|halieu|peche|horticult|aquacult|amenagements paysagers|productions vegetales|productions animales|alimentation|veterinaire|equin|canin/, ['agri']],
  [/electroni|electrotech|automati|robot|energie electrique|instrumentation|mesures physiques|signal|embarque|domotique/, ['elec']],
  [/mecani|aeronaut|aerospat|automobile|navale|naval|acoustique|thermique|energetique|moteur|maintenance des (vehicules|materiels)/, ['meca']],
  [/industri|procedes|materiaux|production|qualite|nanotech|plasturg|textile|agroalimentaire|metallurg|maintenance|methodes|chaudronn|fonderie|microtechni|packaging|emballage|\bbois\b/, ['indus']],
  [/genie civil|batiment|btp|travaux publics|architect|construction|geotechni|genie urbain|geometre|topograph|amenagement finition/, ['btp']],
  [/environnement|ecolog|biodiversite|\beau\b|eaux|climat|durab|risques|dechets|transition|solaire|geoenergies|energie|ocean|\bmer\b|paysag|urbanisme|amenagement|territoire|\bville/, ['envir']],
  [/mathemat|(?<!activite )physique|chimi|biolog|sciences de la terre|geoscience|planete|univers|spatial|astro|sciences de la matiere|actuariat|statisti|econometrie|neuroscien|microbio|genomique|genetique|immunolog|biochimie|biotechno|sciences du vivant|toxicolog|ethologie|optique|nucleaire|\bvision/, ['sciences']],
  [/sante|medic|pharma|\bsoins?\b|infirm|kinesi|paramedic|nutrition|dietet|staps|\bsports?\b|sporti|activite physique|handicap|cancer|epidemio|psychomot|orthophon|ergotherap|orthopt|audioprothes|radiolog|manipulateur|podolog|sage femme|maieut|odonto|dentaire|\bsocial\b|travail social|intervention sociale|socio educati|educateur|assistant de service|cosmeti|coiffure|soins esthetiques/, ['sante']],
  [/gestion|management|manager|comptab|controle|audit|ressources humaines|\brh\b|administration (des|economique)|entrepreneur|\bpme\b|organisations|secretari|assistant de direction|assistanat|support a l action manageriale|business administration/, ['gestion']],
  [/commerce|commercial|marketing|vente|distribution|achat|negociation|business|relation client/, ['commerce']],
  [/banque|financ|assurance|immobili|gestion de patrimoine|conseil en patrimoine|monnaie|actuariat|fiscal|bancaire|\bcredit|notari/, ['banque']],
  [/droit|juridi|justice|science politique|politique|relations internationales|administration publique|economi|geopolitique|institutions|affaires publiques|sciences po|diplomatie|etudes europeennes|carrieres juridiques/, ['droit']],
  [/histoire|geographi|psycholog|sociolog|philosoph|anthropolog|archeolog|ethnolog|demograph|sciences sociales|sciences humaines|\bgenre\b|religion|theolog|civilisation|geomatique|cognitiv|psychanalyse|patrimoine et musees|mondes anciens|mondes medievaux|archives|epistemologie/, ['shs']],
  [/lettres|langue|litteratur|linguisti|traduction|interpretation|enseignement|meef|education|didactique|\bfle\b|humanites|creation litteraire|langage|llcer|\blea\b|professorat|inspe/, ['lettres']],
  [/communication|journalis|information (communication|documentation|et mediation)|information communication|sciences de l information|audiovisuel|cinema|medias|multimedia|edition|\blivre|documentation|bibliotheque|publicite|museo|evenementiel|graphique|imprim/, ['com']],
  [/\barts?\b|design|musique|musicolog|theatre|danse|spectacle|creation (artistique|numerique|litteraire|graphique)|\bmode\b|histoire de l art|conservation|restauration d|\bculture|culturel|metiers d art|dn made|artisanat|photograph|cirque|cinema d animation|animation (2d|3d|numerique)|jeu d acteur|joaillerie|ebenist|lutherie|ceramique|\bverre/, ['arts']],
  [/defense|securite|police|gendarm|armee|militaire|surete|criminel|pompier|prevention/, ['armee']]
];

/**
 * Classe un texte libre (intitulé de formation…) dans 1 à 3 domaines.
 * Les premières règles qui correspondent ont la priorité ; la valeur par défaut sert si rien ne correspond.
 */
export function classifyText(text, fallback = []) {
  const t = norm(text);
  const hits = new Map();
  RULES.forEach(([re, ids], idx) => {
    if (re.test(t)) {
      ids.forEach((id, j) => {
        const score = 100 - idx + (ids.length - j);
        if (!hits.has(id) || hits.get(id) < score) hits.set(id, score);
      });
    }
  });
  const ranked = [...hits.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const out = ranked.length ? ranked : [...fallback];
  for (const f of fallback) if (out.length < 3 && !out.includes(f) && ranked.length && ranked.length < 2) out.push(f);
  return out.slice(0, 3);
}

/** Mention de master : règles sur l'intitulé, sinon domaines du secteur disciplinaire. */
export function classifyMaster(mention, sector) {
  const fallback = SECTOR_DEFAULTS[norm(sector)] ?? [];
  const t = norm(mention);
  // Cas où le secteur est plus fiable que les mots-clés.
  if (/^meef|metiers de l enseignement/.test(t)) return ['lettres'];
  if (/^staps/.test(t)) return /management/.test(t) ? ['sante', 'gestion'] : ['sante'];
  if (/^psycholog|psychanalyse|psychopatholog|neuropsycholog/.test(t)) return ['shs', 'sante'];
  if (/^droit|^justice|^juriste/.test(t)) {
    const extra = classifyText(t).filter((d) => d !== 'droit');
    return ['droit', ...extra].slice(0, 2);
  }
  return classifyText(t, fallback);
}
