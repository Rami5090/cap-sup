// Domaines (nomenclature ONISEP), matières et compétences, avec les exigences associées à chaque domaine.
// Les exigences sont une grille de lecture inspirée des attendus nationaux et des fiches ONISEP : ce sont des
// pondérations indicatives, explicitées dans la page « Méthode ».
import type { DomainId, OfferType, SkillId, SubjectId } from './types';

export interface DomainInfo {
  id: DomainId;
  label: string; // libellé ONISEP
  short: string;
  icon: string;
}

export const DOMAINS: DomainInfo[] = [
  { id: 'info', label: 'Informatique, Internet', short: 'Informatique', icon: 'code' },
  { id: 'sciences', label: 'Sciences', short: 'Sciences', icon: 'atom' },
  { id: 'sante', label: 'Santé, social, sport', short: 'Santé, social, sport', icon: 'heart' },
  { id: 'droit', label: 'Économie, droit, politique', short: 'Économie, droit', icon: 'scale' },
  { id: 'gestion', label: 'Gestion des entreprises, comptabilité', short: 'Gestion', icon: 'briefcase' },
  { id: 'commerce', label: 'Commerce, marketing, vente', short: 'Commerce, marketing', icon: 'cart' },
  { id: 'banque', label: 'Banque, assurances, immobilier', short: 'Banque, finance', icon: 'bank' },
  { id: 'com', label: 'Information-communication, audiovisuel', short: 'Communication', icon: 'mic' },
  { id: 'lettres', label: 'Lettres, langues, enseignement', short: 'Lettres, langues, enseignement', icon: 'book' },
  { id: 'shs', label: 'Histoire-géographie, psychologie, sociologie', short: 'Sciences humaines', icon: 'users' },
  { id: 'arts', label: 'Arts, culture, artisanat', short: 'Arts, culture', icon: 'palette' },
  { id: 'envir', label: 'Environnement, énergies, propreté', short: 'Environnement, énergie', icon: 'leaf' },
  { id: 'agri', label: 'Agriculture, animaux', short: 'Agriculture, animaux', icon: 'sprout' },
  { id: 'btp', label: 'Construction, architecture, travaux publics', short: 'BTP, architecture', icon: 'building' },
  { id: 'indus', label: 'Matières premières, fabrication, industries', short: 'Industrie', icon: 'factory' },
  { id: 'meca', label: 'Mécanique', short: 'Mécanique', icon: 'gear' },
  { id: 'elec', label: 'Électricité, électronique, robotique', short: 'Électronique, robotique', icon: 'cpu' },
  { id: 'logist', label: 'Logistique, transport', short: 'Logistique, transport', icon: 'truck' },
  { id: 'hotel', label: 'Hôtellerie-restauration, tourisme', short: 'Hôtellerie, tourisme', icon: 'plane' },
  { id: 'armee', label: 'Armée, sécurité', short: 'Défense, sécurité', icon: 'shield' }
];
export const DOMAIN_BY_ID = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<DomainId, DomainInfo>;

export interface SubjectInfo { id: SubjectId; label: string; hint: string }
export const SUBJECTS: SubjectInfo[] = [
  { id: 'maths', label: 'Mathématiques, statistiques', hint: 'Analyse, algèbre, probabilités, statistiques' },
  { id: 'info', label: 'Informatique', hint: 'Programmation, algorithmique, bases de données, réseaux' },
  { id: 'physique', label: 'Physique, chimie, sciences de l’ingénieur', hint: 'Physique, chimie, électronique, mécanique' },
  { id: 'svt', label: 'Sciences de la vie et de la Terre', hint: 'Biologie, géologie, écologie, physiologie' },
  { id: 'eco', label: 'Économie, gestion', hint: 'Économie, comptabilité, marketing, management' },
  { id: 'droit', label: 'Droit, science politique', hint: 'Droit civil, public, des affaires, institutions' },
  { id: 'lettres', label: 'Lettres, philosophie, expression', hint: 'Dissertation, synthèse, culture générale' },
  { id: 'langues', label: 'Langues vivantes', hint: 'Anglais et autres langues' },
  { id: 'shs', label: 'Histoire, géographie, sciences sociales', hint: 'Histoire, géographie, sociologie, psychologie' },
  { id: 'arts', label: 'Arts, design', hint: 'Arts plastiques, design, musique, audiovisuel' },
  { id: 'techno', label: 'Enseignements techno et pros', hint: 'Projets, ateliers, matières professionnelles, stages' },
  { id: 'sport', label: 'Activités physiques et sportives', hint: 'Pratique sportive, sciences du sport' }
];

export interface SkillInfo { id: SkillId; label: string; hint: string }
export const SKILLS: SkillInfo[] = [
  { id: 'raisonnement', label: 'Raisonnement logique et chiffré', hint: 'Résoudre des problèmes, manier les chiffres' },
  { id: 'sciences', label: 'Démarche scientifique et technique', hint: 'Expérimenter, modéliser, analyser des données' },
  { id: 'redaction', label: 'Rédaction et argumentation', hint: 'Écrire clairement, construire un raisonnement' },
  { id: 'oral', label: 'Aisance à l’oral et relationnel', hint: 'Présenter, convaincre, échanger' },
  { id: 'langues', label: 'Anglais et langues étrangères', hint: 'Lire, échanger, travailler en langue étrangère' },
  { id: 'creativite', label: 'Créativité', hint: 'Imaginer, concevoir, proposer des idées' },
  { id: 'numerique', label: 'Outils numériques, programmation', hint: 'Tableurs, logiciels métiers, code' },
  { id: 'autonomie', label: 'Autonomie et organisation', hint: 'Planifier, travailler seul, tenir des délais' },
  { id: 'equipe', label: 'Travail en équipe', hint: 'Coopérer, animer, gérer un projet collectif' },
  { id: 'pratique', label: 'Sens pratique, habileté technique', hint: 'Manipuler, fabriquer, intervenir sur le terrain' },
  { id: 'empathie', label: 'Écoute et sens du service', hint: 'Accompagner, soigner, conseiller' }
];

/** Poids (0-3) des blocs de matières pour chaque domaine. */
export const DOMAIN_SUBJECTS: Record<DomainId, Partial<Record<SubjectId, number>>> = {
  agri: { svt: 3, techno: 2, physique: 1, eco: 1, maths: 1 },
  armee: { sport: 3, droit: 1, langues: 1, shs: 1, techno: 1 },
  arts: { arts: 3, lettres: 1, shs: 1, techno: 1 },
  banque: { eco: 3, maths: 2, droit: 2, langues: 1 },
  commerce: { eco: 3, langues: 2, lettres: 1, maths: 1 },
  btp: { physique: 3, techno: 3, maths: 2 },
  droit: { droit: 3, lettres: 2, shs: 2, eco: 1, langues: 1 },
  elec: { maths: 3, physique: 3, techno: 2, info: 1 },
  envir: { svt: 2, physique: 2, maths: 1, shs: 1, techno: 1 },
  gestion: { eco: 3, maths: 2, droit: 1, langues: 1, lettres: 1 },
  shs: { shs: 3, lettres: 2, langues: 1, maths: 1 },
  hotel: { langues: 3, techno: 2, eco: 1 },
  com: { lettres: 3, langues: 2, shs: 1, arts: 1, info: 1 },
  info: { maths: 3, info: 3, physique: 1, langues: 1 },
  lettres: { lettres: 3, langues: 2, shs: 1 },
  logist: { eco: 2, maths: 2, techno: 2, langues: 1 },
  indus: { physique: 3, techno: 3, maths: 2 },
  meca: { physique: 3, techno: 3, maths: 2 },
  sante: { svt: 3, physique: 2, maths: 1, sport: 1 },
  sciences: { maths: 3, physique: 3, svt: 2, info: 1 }
};

/** Exigences (0-3) en compétences pour chaque domaine. */
export const DOMAIN_SKILLS: Record<DomainId, Partial<Record<SkillId, number>>> = {
  agri: { sciences: 2, pratique: 3, autonomie: 1, equipe: 1 },
  armee: { equipe: 3, pratique: 2, oral: 1, autonomie: 1, empathie: 1 },
  arts: { creativite: 3, pratique: 2, autonomie: 2, oral: 1 },
  banque: { raisonnement: 3, oral: 2, redaction: 1, numerique: 1 },
  commerce: { oral: 3, langues: 2, equipe: 2, creativite: 1 },
  btp: { pratique: 3, raisonnement: 2, sciences: 2, equipe: 2 },
  droit: { redaction: 3, raisonnement: 2, oral: 2, autonomie: 2 },
  elec: { raisonnement: 3, sciences: 3, pratique: 2, numerique: 2 },
  envir: { sciences: 3, raisonnement: 2, redaction: 1, equipe: 1 },
  gestion: { raisonnement: 2, redaction: 2, oral: 2, equipe: 2, numerique: 1 },
  shs: { redaction: 3, raisonnement: 2, autonomie: 2, empathie: 1 },
  hotel: { oral: 3, langues: 3, equipe: 2, pratique: 2, empathie: 1 },
  com: { redaction: 3, oral: 2, creativite: 2, numerique: 2 },
  info: { raisonnement: 3, numerique: 3, autonomie: 2, sciences: 1, langues: 1 },
  lettres: { redaction: 3, oral: 2, langues: 2, autonomie: 2 },
  logist: { raisonnement: 2, equipe: 2, numerique: 1, oral: 1, pratique: 1 },
  indus: { pratique: 3, sciences: 2, raisonnement: 2, equipe: 2 },
  meca: { pratique: 3, sciences: 2, raisonnement: 2, numerique: 1 },
  sante: { sciences: 3, empathie: 3, equipe: 2, autonomie: 1 },
  sciences: { raisonnement: 3, sciences: 3, autonomie: 2, redaction: 1 }
};

/** Exigences supplémentaires liées au type de formation (rythme, pédagogie). */
export const TYPE_SKILLS: Partial<Record<OfferType, Partial<Record<SkillId, number>>>> = {
  master: { autonomie: 1, redaction: 1, langues: 1 },
  inge: { raisonnement: 1, sciences: 1, equipe: 1 },
  ecom: { oral: 1, langues: 1, equipe: 1 },
  msc: { langues: 2 },
  ecole5: { equipe: 1 },
  lp: { pratique: 1, equipe: 1 },
  l3: { autonomie: 1, redaction: 1 },
  but3: { pratique: 1, equipe: 1 },
  bachelor: { oral: 1 },
  de: { empathie: 1, pratique: 1 },
  licence: { autonomie: 2 },
  cpge: { raisonnement: 1, autonomie: 1 },
  bts: { pratique: 1 },
  pass: { autonomie: 2, sciences: 1 },
  las: { autonomie: 1 }
};
export const ALTERNANCE_SKILLS: Partial<Record<SkillId, number>> = { autonomie: 1, oral: 1, equipe: 1 };

/** Proximité entre domaines (pour la cohérence de parcours) : paires de domaines voisins. */
const NEIGHBOURS: [DomainId, DomainId][] = [
  ['info', 'sciences'], ['info', 'elec'], ['info', 'gestion'], ['info', 'com'],
  ['sciences', 'sante'], ['sciences', 'envir'], ['sciences', 'elec'], ['sciences', 'indus'], ['sciences', 'agri'],
  ['droit', 'gestion'], ['droit', 'banque'], ['droit', 'shs'], ['gestion', 'commerce'], ['gestion', 'banque'],
  ['gestion', 'logist'], ['commerce', 'hotel'], ['commerce', 'com'], ['com', 'lettres'], ['com', 'arts'],
  ['lettres', 'shs'], ['shs', 'sante'], ['arts', 'lettres'], ['envir', 'agri'], ['envir', 'btp'],
  ['btp', 'indus'], ['indus', 'meca'], ['meca', 'elec'], ['indus', 'elec'], ['logist', 'indus'], ['armee', 'droit'],
  ['armee', 'sante']
];
const NEIGHBOUR_SET = new Set(NEIGHBOURS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
export function domainsAreNeighbours(a: DomainId, b: DomainId): boolean {
  return a === b || NEIGHBOUR_SET.has(`${a}|${b}`);
}
