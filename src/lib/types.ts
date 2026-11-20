// Modèle de données de Cap Sup.

export type DomainId =
  | 'agri' | 'armee' | 'arts' | 'banque' | 'commerce' | 'btp' | 'droit' | 'elec' | 'envir' | 'gestion'
  | 'shs' | 'hotel' | 'com' | 'info' | 'lettres' | 'logist' | 'indus' | 'meca' | 'sante' | 'sciences';

/** Niveau de l'utilisateur à la rentrée visée : 3 = titulaire d'un Bac+3, 2 = d'un Bac+2, 0 = bachelier. */
export type Level = 3 | 2 | 0;

export type OfferType =
  // après un Bac+3
  | 'master' | 'inge' | 'ecom' | 'msc' | 'ecole5' | 'de'
  // après un Bac+2
  | 'lp' | 'l3' | 'but3' | 'bachelor'
  // après le bac (Parcoursup)
  | 'bts' | 'but' | 'cpge' | 'licence' | 'las' | 'pass' | 'ifsi' | 'efts' | 'inge_post' | 'ecom_post' | 'autre';

/** Offre telle que stockée dans public/data/offres-*.json (clés courtes). */
export interface RawOffer {
  id: string;
  ty: OfferType;
  nm: string; // intitulé (mention, formation)
  pc?: string; // parcours / précision
  et: number; // index établissement
  cm: number; // index commune
  la?: number;
  lo?: number;
  dm: DomainId[];
  al?: 0 | 1 | 2; // alternance : 0 non, 1 possible, 2 uniquement
  st?: 0 | 1 | 2 | 3; // statut : public, privé sous contrat, privé, privé hors contrat
  fe?: number; // frais de scolarité annuels (€)
  fs?: 'o' | 'n' | 'e'; // source des frais : officiel, ONISEP, estimation
  cy?: number; // durée restante (années)
  en: Level[];
  sec?: number; // index secteur disciplinaire
  ca?: number; // capacité
  nc?: number; // candidats
  ta?: number; // taux de proposition global (%)
  ao?: Partial<Record<'l3' | 'lp' | 'but' | 'm' | 'au', number>>; // taux de proposition par origine (%)
  ad?: Partial<Record<'l3' | 'lp' | 'but' | 'm' | 'au', number>>; // origine des admis (%)
  in?: [number | null, number | null, number | null, 0 | 1 | 2, number, number]; // emploi 18 mois, stable, salaire, niveau, promo, sortants
  ur?: string;
  uo?: string;
  hb?: 0 | 1 | 2; // hébergement : aucun/inconnu, internat, résidence/partenaires
  sel?: 0 | 1;
  mt?: [number, number, number, number, number]; // mentions des admis : sans, AB, B, TB, TBF (%)
  bc?: [number, number, number]; // bacs des admis : général, techno, pro (%)
  bo?: number; // % boursiers
  fo?: number; // identifiant de formation ONISEP (FOR.xxx) : lien vers les fiches métiers
  ki?: number; // index des mots-clés (Trouver mon master, sous-domaines ONISEP)
}

/** [code, nom, lat, lon, loyer €/m², loyer communal (1) ou maille (0), zone ABC, nb Crous ≤ 10 km, Crous le plus proche (km), dép., population] */
export type RawCommune = [string, string, number, number, number | null, 0 | 1 | null, string | null, number, number, string, number];

export interface OfferDataset {
  v: number;
  etabs: [string, string][];
  communes: RawCommune[];
  sectors: string[];
  keywords?: string[];
  offers: RawOffer[];
}

/** Métier ONISEP : [id MET, nom, synonymes « | », secteurs, niveau d'accès (années après le bac), statuts, domaines, formations FOR, accroche] */
export type RawMetier = [number, string, string, number[], number | null, number[], DomainId[], number[], string];

export interface MetiersDataset {
  v: number;
  sectors: string[];
  statuts: string[];
  metiers: RawMetier[];
}

export interface Metier {
  id: number;
  name: string;
  synonyms: string[];
  sectors: number[];
  level: number | null;
  statuts: number[];
  domains: DomainId[];
  fors: number[];
  accroche: string;
  url: string;
}

export interface Commune {
  code: string;
  nom: string;
  lat: number;
  lon: number;
  loyerM2: number | null;
  loyerCommunal: boolean;
  zone: string | null;
  crous10: number;
  crousNearestKm: number;
  dep: string;
  pop: number;
}

export interface Offer extends RawOffer {
  etab: string;
  uai: string;
  commune: Commune;
  lat: number;
  lon: number;
  sector?: string;
  keywords?: string;
  url: string;
  urlLabel: string;
}

export interface Place {
  nom: string;
  code: string;
  dep: string;
  lat: number;
  lon: number;
}

export type TransportMode = 'voiture' | 'covoit' | 'bus' | 'metro' | 'train' | 'velo' | 'vae' | 'marche' | 'scooter';
export type HousingKind = 'crous' | 'studio' | 'coloc';
export type Diploma =
  | 'licence' | 'but' | 'lp' | 'bts' | 'cpge' | 'bachelor' | 'deust' | 'autre_bac2' | 'autre_bac3'
  | 'bac_general' | 'bac_techno' | 'bac_pro';
export type Rank = 'top10' | 'top25' | 'mid' | 'low' | 'unknown';
export type AlternancePref = 'indifferent' | 'oui' | 'uniquement' | 'non';
export type SubjectId =
  | 'maths' | 'info' | 'physique' | 'svt' | 'eco' | 'droit' | 'lettres' | 'langues' | 'shs' | 'arts' | 'techno' | 'sport';
export type SkillId =
  | 'raisonnement' | 'sciences' | 'redaction' | 'oral' | 'langues' | 'creativite' | 'numerique' | 'autonomie'
  | 'equipe' | 'pratique' | 'empathie';

/** Situation actuelle de l'étudiant. */
export type Regime = 'initiale' | 'apprentissage' | 'contrat_pro' | 'emploi' | 'autre';
/** Enjeux pour plus tard. */
export type GoalId =
  | 'emploi' | 'salaire' | 'stabilite' | 'international' | 'entreprendre' | 'public' | 'recherche' | 'impact'
  | 'alternance' | 'equilibre' | 'proximite';

export interface Company {
  name: string;
  sector: number | null; // index dans la liste des secteurs d'activité ONISEP
  place: Place | null;
  canKeep: 'oui' | 'peut-etre' | 'non';
}

export interface Profile {
  level: Level;
  diploma: Diploma;
  licenceMention: string | null; // clé normalisée (liste officielle des mentions de licence)
  currentDomains: DomainId[];
  average: number; // moyenne générale /20
  rank: Rank;
  subjects: Partial<Record<SubjectId, number | null>>;
  skills: Record<SkillId, number>; // 1 à 5
  interests: Partial<Record<DomainId, 1 | 2 | 3>>;
  types: OfferType[];
  alternance: AlternancePref;
  home: Place | null;
  maxDistanceKm: number; // 0 = toute la France
  canMove: boolean;
  housing: HousingKind;
  transport: TransportMode;
  maxCommuteMin: number;
  weeklyEnergyH: number;
  jobHours: number;
  monthlyResources: number;
  savings: number;
  bourse: 'non' | '0bis' | '1' | '2' | '3' | '4' | '5' | '6' | '7';
  apl: number;
  livingCosts: number;
  age: number;
  // Situation actuelle
  regime: Regime;
  company: Company;
  missions: string; // poste, missions en entreprise
  subject: string; // sujet traité : mémoire, projet tutoré, missions
  // Projet et avenir
  projectText: string; // projet de formation, en quelques mots
  metiers: number[]; // identifiants MET des métiers visés
  sectors: number[]; // secteurs d'activité visés (index ONISEP)
  goals: GoalId[];
}

export type CriterionId =
  | 'interet' | 'format' | 'thematique' | 'entreprise' | 'parcours' | 'admission' | 'matieres' | 'competences'
  | 'metiers' | 'insertion' | 'enjeux' | 'budget' | 'immobilier' | 'logement' | 'trajet' | 'energie' | 'carbone';

export type Weights = Record<CriterionId, number>; // 0 à 5

export type Confidence = 'data' | 'estimate' | 'na';

export interface CriterionScore {
  id: CriterionId;
  score: number | null; // null = non concerné (exclu de la moyenne)
  confidence: Confidence;
  summary: string; // phrase courte
  details?: string[]; // lignes de détail
  source?: string;
}

export interface Mobility {
  distanceKm: number; // à vol d'oiseau
  roadKm: number;
  commuteMin: number; // aller, mode choisi
  moves: boolean; // l'étudiant déménage
  tooFar: boolean; // trajet trop long et pas de déménagement possible
  localMode: TransportMode;
  weeklyCommuteH: number;
  co2KgYear: number;
  transportCostMonth: number;
}

export interface Budget {
  resources: number; // €/mois
  costs: number; // €/mois
  balance: number;
  lines: { label: string; amount: number; kind: 'in' | 'out'; note?: string }[];
}

export interface Evaluation {
  offer: Offer;
  total: number; // 0-100
  scores: Record<CriterionId, CriterionScore>;
  mobility: Mobility;
  budget: Budget;
  reliability: number; // part du poids reposant sur des données (0-1)
  alerts: string[];
}
