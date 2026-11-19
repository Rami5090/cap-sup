// Montants officiels et hypothèses de calcul, avec leur source.
// Toute valeur « hypothèse » est un ordre de grandeur affiché comme tel dans l'application.
import type { HousingKind, OfferType, TransportMode } from './types';

export const ACADEMIC_YEAR = '2026-2027';

/** Droits d'inscription annuels 2026-2027 (établissements publics) — service-public.gouv.fr, fiche F36520. */
export const FEES = { licence: 178, master: 255, ingenieur: 630, cvec: 105 };
export const FEES_SOURCE = {
  label: 'Service-public.gouv.fr — coût d’une inscription dans l’enseignement supérieur (2026-2027)',
  url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F36520'
};

/** Bourse sur critères sociaux 2026-2027 : montants annuels, versés en 10 mensualités. */
export const BOURSES: Record<string, number> = {
  '0bis': 1454, '1': 2163, '2': 3071, '3': 3828, '4': 4587, '5': 5212, '6': 5506, '7': 6335
};
export const BOURSES_SOURCE = {
  label: 'Service-public.gouv.fr — bourse sur critères sociaux (montants 2026-2027, identiques à 2025-2026)',
  url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F12214'
};
export const SIMULATEUR_BOURSE = 'https://simulateur.lescrous.fr/';
export const SIMULATEUR_APL = 'https://wwwd.caf.fr/wps/portal/caffr/aidesetdemarches/mesdemarches/faireunesimulation/lelogement';

/** Aide à la mobilité en master : 1 000 €, boursiers changeant de région académique entre licence et M1. */
export const AIDE_MOBILITE_MASTER = 1000;
export const AIDE_MOBILITE_SOURCE = {
  label: 'etudiant.gouv.fr — aide à la mobilité en master',
  url: 'https://www.etudiant.gouv.fr/fr/aide-la-mobilite-en-master-1504'
};

/** SMIC mensuel brut au 1er janvier 2026 (35 h). */
export const SMIC_BRUT = 1823.03;
/** Rémunération minimale des apprentis en % du SMIC, 1re année de contrat (Code du travail, art. D6222-26). */
export function apprenticePct(age: number): number {
  if (age < 18) return 0.27;
  if (age <= 20) return 0.43;
  if (age <= 25) return 0.53;
  return 1;
}
export const APPRENTI_SOURCE = {
  label: 'Service-public.gouv.fr — rémunération de l’apprenti (SMIC 2026 : 1 823,03 € brut)',
  url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2918'
};

/**
 * Facteurs d'émission par passager·km (kg CO2e/km), ADEME — Impact CO2 (impactco2.fr, API transport, 2026).
 * "bus" = bus thermique ; "metro" = moyenne métro / tramway ; "train" = TER.
 */
export const CO2_PER_KM: Record<TransportMode, number> = {
  voiture: 0.1106,
  covoit: 0.0553,
  bus: 0.1135,
  metro: 0.004,
  train: 0.0229,
  velo: 0,
  vae: 0.0022,
  marche: 0,
  scooter: 0.0604
};
export const CO2_SOURCE = { label: 'ADEME — Impact CO2, comparateur des modes de transport', url: 'https://impactco2.fr/outils/transport' };

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  voiture: 'Voiture',
  covoit: 'Covoiturage',
  bus: 'Bus / car',
  metro: 'Tram / métro',
  train: 'Train (TER, RER)',
  velo: 'Vélo',
  vae: 'Vélo électrique',
  marche: 'À pied',
  scooter: 'Scooter'
};

/**
 * Hypothèses de temps de trajet porte-à-porte (aller) : distance routière ≈ 1,3 × vol d'oiseau.
 * Vitesse moyenne (km/h) et temps fixe (min : stationnement, attente, marche d'accès).
 */
export const DETOUR = 1.3;
export const SPEED: Record<TransportMode, { kmh: (roadKm: number) => number; fixedMin: number }> = {
  voiture: { kmh: (d) => (d < 10 ? 28 : d < 30 ? 45 : 70), fixedMin: 6 },
  covoit: { kmh: (d) => (d < 10 ? 28 : d < 30 ? 45 : 70), fixedMin: 12 },
  bus: { kmh: (d) => (d < 15 ? 17 : 35), fixedMin: 10 },
  metro: { kmh: () => 24, fixedMin: 8 },
  train: { kmh: (d) => (d < 20 ? 35 : 60), fixedMin: 20 },
  velo: { kmh: () => 15, fixedMin: 2 },
  vae: { kmh: () => 20, fixedMin: 2 },
  marche: { kmh: () => 4.5, fixedMin: 0 },
  scooter: { kmh: (d) => (d < 10 ? 28 : 40), fixedMin: 3 }
};

/** Pénibilité relative d'une heure de trajet (1 = conduite ; < 1 si l'on peut lire, réviser, se reposer). Hypothèse. */
export const PENIBILITE: Record<TransportMode, number> = {
  voiture: 1, covoit: 0.9, bus: 0.8, metro: 0.75, train: 0.6, velo: 0.85, vae: 0.8, marche: 0.75, scooter: 1
};

/** Coût mensuel des trajets quotidiens (hypothèses) : coût marginal au km ou abonnement. */
export function commuteCostMonth(mode: TransportMode, roadKm: number, crowKm: number): number {
  const monthlyKm = roadKm * 2 * 5 * 4.3;
  switch (mode) {
    case 'voiture': return monthlyKm * 0.15; // carburant + usure, voiture déjà disponible
    case 'covoit': return monthlyKm * 0.07;
    case 'scooter': return monthlyKm * 0.08;
    case 'bus':
    case 'metro': return 30; // abonnement jeune urbain typique
    case 'train': return Math.min(160, 25 + crowKm * 1.1); // abonnement régional étudiant
    case 'velo': return 10;
    case 'vae': return 15;
    case 'marche': return 0;
  }
}

/** Logement (hypothèses) : studio de 25 m² au loyer T1-T2 de la commune (ANIL, charges comprises). */
export const STUDIO_M2 = 25;
export const COLOC_FACTOR = 0.65;
/** Loyer indicatif d'un logement Crous selon la tension du marché (zonage ABC). Hypothèse : ordre de grandeur. */
export const CROUS_RENT: Record<string, number> = { Abis: 480, A: 420, B1: 370, B2: 330, C: 310 };
export const HOUSING_LABELS: Record<HousingKind, string> = {
  crous: 'Résidence Crous',
  studio: 'Studio (location privée)',
  coloc: 'Colocation'
};
export const RENT_SOURCE = {
  label: 'Carte des loyers 2025 — Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin',
  url: 'https://www.data.gouv.fr/fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/'
};
export const ZONAGE_SOURCE = {
  label: 'Zonage ABC des communes en vigueur au 26 juin 2026 (Ministère du Logement)',
  url: 'https://www.data.gouv.fr/fr/datasets/liste-des-communes-selon-le-zonage-abc/'
};
export const ZONE_LABELS: Record<string, string> = {
  Abis: 'A bis : marché du logement très tendu',
  A: 'A : marché tendu',
  B1: 'B1 : marché assez tendu',
  B2: 'B2 : marché intermédiaire',
  C: 'C : marché détendu'
};

/** Libellés et caractéristiques des types de formation. */
export interface TypeInfo {
  label: string;
  short: string;
  load: number; // charge de travail hebdomadaire estimée (cours + travail personnel, h) — hypothèse
  admissionGuess: number; // taux d'admission indicatif quand aucune donnée publique n'existe (%)
  expectedAvg: number; // moyenne indicative attendue quand aucune donnée n'existe (/20)
}
export const TYPES: Record<OfferType, TypeInfo> = {
  master: { label: 'Master universitaire', short: 'Master', load: 37, admissionGuess: 35, expectedAvg: 13 },
  inge: { label: 'École d’ingénieurs (admission parallèle)', short: 'Ingénieur', load: 45, admissionGuess: 25, expectedAvg: 14 },
  ecom: { label: 'École de commerce, grade master', short: 'École de commerce', load: 38, admissionGuess: 30, expectedAvg: 13.5 },
  msc: { label: 'MSc d’école', short: 'MSc', load: 40, admissionGuess: 45, expectedAvg: 12.5 },
  ecole5: { label: 'Diplôme ou titre bac+5 d’école', short: 'Bac+5 d’école', load: 38, admissionGuess: 55, expectedAvg: 12 },
  de: { label: 'Diplôme d’État ou diplôme spécialisé', short: 'Diplôme spécialisé', load: 38, admissionGuess: 35, expectedAvg: 13 },
  lp: { label: 'Licence professionnelle', short: 'Licence pro', load: 37, admissionGuess: 45, expectedAvg: 12.5 },
  l3: { label: 'Licence (entrée en 3e année)', short: 'L3', load: 36, admissionGuess: 55, expectedAvg: 12 },
  but3: { label: 'BUT (entrée en 3e année)', short: 'BUT 3', load: 38, admissionGuess: 60, expectedAvg: 12.5 },
  bachelor: { label: 'Bachelor / bac+3 d’école', short: 'Bachelor', load: 36, admissionGuess: 55, expectedAvg: 12 },
  bts: { label: 'BTS', short: 'BTS', load: 38, admissionGuess: 50, expectedAvg: 12 },
  but: { label: 'BUT', short: 'BUT', load: 38, admissionGuess: 40, expectedAvg: 13 },
  cpge: { label: 'Classe préparatoire (CPGE)', short: 'Prépa', load: 55, admissionGuess: 40, expectedAvg: 15 },
  licence: { label: 'Licence', short: 'Licence', load: 35, admissionGuess: 70, expectedAvg: 12 },
  las: { label: 'Licence accès santé (L.AS)', short: 'L.AS', load: 42, admissionGuess: 50, expectedAvg: 14 },
  pass: { label: 'Parcours accès santé (PASS)', short: 'PASS', load: 50, admissionGuess: 50, expectedAvg: 15 },
  ifsi: { label: 'Soins infirmiers (IFSI)', short: 'IFSI', load: 40, admissionGuess: 30, expectedAvg: 13 },
  efts: { label: 'Travail social (EFTS)', short: 'Travail social', load: 38, admissionGuess: 30, expectedAvg: 12.5 },
  inge_post: { label: 'École d’ingénieurs post-bac', short: 'Ingénieur', load: 45, admissionGuess: 30, expectedAvg: 15 },
  ecom_post: { label: 'École de commerce post-bac', short: 'École de commerce', load: 38, admissionGuess: 45, expectedAvg: 13 },
  autre: { label: 'Autre formation', short: 'Autre', load: 36, admissionGuess: 50, expectedAvg: 12.5 }
};
export const ALTERNANCE_LOAD = 40; // semaine type en alternance (entreprise + école), hypothèse

export const STATUT_LABELS = ['Public', 'Privé sous contrat', 'Privé', 'Privé hors contrat'];

export const TYPES_BY_LEVEL: Record<number, OfferType[]> = {
  3: ['master', 'inge', 'ecom', 'msc', 'ecole5', 'de'],
  2: ['lp', 'l3', 'but3', 'bachelor', 'inge', 'ecom', 'de'],
  0: ['licence', 'but', 'bts', 'cpge', 'las', 'pass', 'ifsi', 'efts', 'inge_post', 'ecom_post', 'autre']
};
