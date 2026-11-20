// Métiers ONISEP, secteurs d'activité et enjeux d'avenir.
import { norm } from './text';
import type { DomainId, GoalId, Metier, MetiersDataset } from './types';

export interface JobsIndex {
  metiers: Metier[];
  byId: Map<number, Metier>;
  /** Formation ONISEP (FOR) → métiers auxquels elle prépare (fiches métiers). */
  byFor: Map<number, Metier[]>;
  sectors: string[];
  statuts: string[];
}

export function buildJobsIndex(ds: MetiersDataset): JobsIndex {
  const metiers: Metier[] = ds.metiers.map(([id, name, syn, sectors, level, statuts, domains, fors, accroche]) => ({
    id,
    name,
    synonyms: syn ? syn.split('|') : [],
    sectors,
    level,
    statuts,
    domains,
    fors,
    accroche,
    url: `https://www.onisep.fr/http/redirection/metier/slug/MET.${id}`
  }));
  const byFor = new Map<number, Metier[]>();
  for (const m of metiers) {
    for (const f of m.fors) {
      if (!byFor.has(f)) byFor.set(f, []);
      byFor.get(f)!.push(m);
    }
  }
  return { metiers, byId: new Map(metiers.map((m) => [m.id, m])), byFor, sectors: ds.sectors, statuts: ds.statuts };
}

/** Recherche de métiers par nom ou synonyme (tous les mots doivent apparaître). */
export function searchMetiers(index: JobsIndex, query: string, limit = 12): Metier[] {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const scored: [Metier, number][] = [];
  for (const m of index.metiers) {
    const names = [m.name, ...m.synonyms].map(norm);
    const hay = names.join(' ');
    if (!tokens.every((t) => hay.includes(t))) continue;
    const starts = names.some((n) => n.startsWith(tokens[0])) ? 0 : 1;
    scored.push([m, starts]);
  }
  return scored.sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name, 'fr')).slice(0, limit).map(([m]) => m);
}

export const LEVEL_LABEL = (n: number | null) =>
  n == null ? 'niveau variable' : n < 0 ? 'avant le bac' : n === 0 ? 'bac' : `bac + ${n}`;

export interface GoalInfo {
  id: GoalId;
  label: string;
  hint: string;
  icon: string;
}
export const GOALS: GoalInfo[] = [
  { id: 'emploi', label: 'Trouver vite un emploi', hint: 'Taux d’emploi des diplômés', icon: 'briefcase' },
  { id: 'salaire', label: 'Bien gagner ma vie', hint: 'Salaire médian des diplômés', icon: 'wallet' },
  { id: 'stabilite', label: 'Avoir un emploi stable', hint: 'CDI, fonctionnaire', icon: 'shield' },
  { id: 'international', label: 'Travailler à l’international', hint: 'Langues, échanges, carrière à l’étranger', icon: 'plane' },
  { id: 'entreprendre', label: 'Créer mon entreprise', hint: 'Entrepreneuriat, innovation, indépendance', icon: 'sparkles' },
  { id: 'public', label: 'Servir l’intérêt général', hint: 'Fonction publique, enseignement, santé publique', icon: 'scale' },
  { id: 'recherche', label: 'Faire de la recherche', hint: 'Doctorat, laboratoire, R&D', icon: 'atom' },
  { id: 'impact', label: 'Avoir un impact positif', hint: 'Environnement, social, santé', icon: 'leaf' },
  { id: 'alternance', label: 'Continuer en alternance', hint: 'Être payé·e et gagner de l’expérience', icon: 'layers' },
  { id: 'equilibre', label: 'Préserver mon équilibre', hint: 'Charge de travail et trajets raisonnables', icon: 'heart' },
  { id: 'proximite', label: 'Rester près de chez moi', hint: 'Pas de déménagement lointain', icon: 'home' }
];
export const GOAL_BY_ID = Object.fromEntries(GOALS.map((g) => [g.id, g])) as Record<GoalId, GoalInfo>;

/** Rapprochement des secteurs d'activité ONISEP avec les 20 domaines (utilisé quand aucun lien formation → métier n'existe). */
const SECTOR_DOMAINS_RAW: Record<string, DomainId[]> = {
  'fonction publique': ['droit'],
  'commerce et distribution': ['commerce'],
  sante: ['sante'],
  'industrie chimique': ['indus', 'sciences'],
  energie: ['envir', 'elec'],
  automobile: ['meca'],
  'construction aeronautique ferroviaire et navale': ['meca', 'indus'],
  'batiment et travaux publics btp': ['btp'],
  recherche: ['sciences'],
  enseignement: ['lettres'],
  'logistique et transport': ['logist'],
  mecanique: ['meca'],
  'industrie alimentaire': ['indus', 'agri'],
  'informatique et reseaux': ['info'],
  'banque assurances': ['banque'],
  'edition librairie bibliotheque': ['com'],
  environnement: ['envir'],
  agriculture: ['agri'],
  'mode et luxe': ['arts', 'commerce'],
  social: ['sante'],
  audiovisuel: ['com', 'arts'],
  'artisanat d art': ['arts'],
  defense: ['armee'],
  'audit conseil': ['gestion'],
  maintenance: ['indus', 'meca'],
  'droit et justice': ['droit'],
  electronique: ['elec'],
  sport: ['sante'],
  'marketing publicite': ['commerce', 'com'],
  'arts du spectacle': ['arts'],
  tourisme: ['hotel'],
  securite: ['armee'],
  communication: ['com'],
  'papiers cartons': ['indus'],
  'culture patrimoine': ['arts', 'shs'],
  'hotellerie restauration': ['hotel'],
  'filiere bois': ['indus', 'agri'],
  'architecture urbanisme paysage': ['btp', 'envir'],
  'art et design': ['arts'],
  agroequipement: ['meca', 'agri'],
  'verre beton ceramique': ['indus'],
  journalisme: ['com'],
  'jeu video': ['info', 'arts'],
  'comptabilite gestion ressources humaines': ['gestion'],
  immobilier: ['banque'],
  industries: ['indus'],
  'services a la personne': ['sante'],
  'traduction interpretation': ['lettres']
};
export function sectorDomains(sectorName: string): DomainId[] {
  return SECTOR_DOMAINS_RAW[norm(sectorName)] ?? [];
}
