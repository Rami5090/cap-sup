import type { Diploma, Level, Profile } from './types';

export function defaultProfile(level: Level = 3): Profile {
  return {
    level,
    diploma: level === 3 ? 'licence' : level === 2 ? 'bts' : 'bac_general',
    licenceMention: null,
    currentDomains: [],
    average: 12.5,
    rank: 'unknown',
    subjects: {},
    skills: {
      raisonnement: 3, sciences: 3, redaction: 3, oral: 3, langues: 3, creativite: 3, numerique: 3, autonomie: 3,
      equipe: 3, pratique: 3, empathie: 3
    },
    interests: {},
    types: [],
    alternance: 'indifferent',
    home: null,
    maxDistanceKm: 150,
    canMove: true,
    housing: 'crous',
    transport: 'bus',
    maxCommuteMin: 60,
    weeklyEnergyH: 50,
    jobHours: 0,
    monthlyResources: 450,
    savings: 0,
    bourse: 'non',
    apl: 0,
    livingCosts: 300,
    age: level === 3 ? 21 : level === 2 ? 20 : 18,
    regime: 'initiale',
    company: { name: '', sector: null, place: null, canKeep: 'peut-etre' },
    missions: '',
    subject: '',
    projectText: '',
    metiers: [],
    sectors: [],
    goals: []
  };
}

export const REGIME_LABELS: Record<Profile['regime'], string> = {
  initiale: 'Formation initiale',
  apprentissage: 'Alternance (apprentissage)',
  contrat_pro: 'Alternance (contrat de professionnalisation)',
  emploi: 'En emploi / reprise d’études',
  autre: 'Autre (césure, pause…)'
};

export const isAlternant = (p: Pick<Profile, 'regime'>) => p.regime === 'apprentissage' || p.regime === 'contrat_pro';

export const DIPLOMAS_BY_LEVEL: Record<Level, { id: Diploma; label: string; hint: string }[]> = {
  3: [
    { id: 'licence', label: 'Licence (L3)', hint: 'Licence générale à l’université' },
    { id: 'but', label: 'BUT', hint: 'Bachelor universitaire de technologie' },
    { id: 'lp', label: 'Licence pro', hint: 'Licence professionnelle' },
    { id: 'bachelor', label: 'Bachelor d’école', hint: 'Bac+3 d’école, visé ou non' },
    { id: 'autre_bac3', label: 'Autre Bac+3', hint: 'Diplôme d’État, titre RNCP…' }
  ],
  2: [
    { id: 'bts', label: 'BTS', hint: 'Brevet de technicien supérieur' },
    { id: 'but', label: 'BUT (2e année)', hint: 'Bachelor universitaire de technologie' },
    { id: 'licence', label: 'Licence (L2)', hint: '2e année de licence' },
    { id: 'cpge', label: 'Classe prépa', hint: 'CPGE, 2e année' },
    { id: 'deust', label: 'DEUST', hint: 'Diplôme d’études universitaires scientifiques et techniques' },
    { id: 'autre_bac2', label: 'Autre Bac+2', hint: 'Titre RNCP, DE…' }
  ],
  0: [
    { id: 'bac_general', label: 'Bac général', hint: 'Spécialités de la voie générale' },
    { id: 'bac_techno', label: 'Bac technologique', hint: 'STMG, STI2D, ST2S…' },
    { id: 'bac_pro', label: 'Bac professionnel', hint: 'Voie professionnelle' }
  ]
};

export const LEVEL_LABELS: Record<Level, string> = { 3: 'Bac+3', 2: 'Bac+2', 0: 'Post-bac' };
