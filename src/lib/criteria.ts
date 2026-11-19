import type { CriterionId, Weights } from './types';

export type FamilyId = 'projet' | 'reussite' | 'avenir' | 'argent' | 'quotidien' | 'planete';

export interface CriterionInfo {
  id: CriterionId;
  family: FamilyId;
  label: string;
  short: string; // libellé court (graphiques)
  question: string; // formulation dans l'écran « Tes priorités »
  help: string; // ce que mesure le critère
  icon: string;
}

export const FAMILIES: { id: FamilyId; label: string; icon: string }[] = [
  { id: 'projet', label: 'Ton projet', icon: 'target' },
  { id: 'reussite', label: 'Réussite', icon: 'chart' },
  { id: 'avenir', label: 'Débouchés', icon: 'briefcase' },
  { id: 'argent', label: 'Argent', icon: 'euro' },
  { id: 'quotidien', label: 'Vie quotidienne', icon: 'home' },
  { id: 'planete', label: 'Planète', icon: 'leaf' }
];

export const CRITERIA: CriterionInfo[] = [
  {
    id: 'interet', family: 'projet', label: 'Intérêt pour le domaine', short: 'Intérêt', icon: 'sparkles',
    question: 'Que la formation corresponde à ce qui te passionne',
    help: 'Compare les domaines de la formation (nomenclature ONISEP) avec tes centres d’intérêt.'
  },
  {
    id: 'format', family: 'projet', label: 'Format et rythme', short: 'Format', icon: 'layers',
    question: 'Le type de formation et l’alternance que tu souhaites',
    help: 'Type de diplôme préféré, alternance souhaitée ou non.'
  },
  {
    id: 'parcours', family: 'reussite', label: 'Cohérence avec ton parcours', short: 'Parcours', icon: 'route',
    question: 'Rester dans la continuité de ce que tu as étudié',
    help: 'Compatibilité officielle mention de licence → master, proximité des domaines et profil des admis (L3, licence pro, BUT).'
  },
  {
    id: 'admission', family: 'reussite', label: 'Chances d’admission', short: 'Admission', icon: 'door',
    question: 'Avoir de bonnes chances d’être accepté·e',
    help: 'Taux de proposition Mon Master / Parcoursup 2025 pour les candidats comme toi, ajusté selon ton niveau.'
  },
  {
    id: 'matieres', family: 'reussite', label: 'Niveau dans les matières clés', short: 'Matières', icon: 'book',
    question: 'Être à l’aise dans les matières importantes de la formation',
    help: 'Tes notes dans les matières utiles au domaine, comparées au niveau attendu.'
  },
  {
    id: 'competences', family: 'reussite', label: 'Compétences', short: 'Compétences', icon: 'brain',
    question: 'Avoir les compétences que la formation demande',
    help: 'Ton auto-évaluation comparée aux compétences mobilisées par le domaine et le type de formation.'
  },
  {
    id: 'insertion', family: 'avenir', label: 'Insertion professionnelle', short: 'Insertion', icon: 'briefcase',
    question: 'Trouver facilement un emploi après le diplôme',
    help: 'Taux d’emploi salarié à 18 mois, part d’emplois stables et salaire médian des diplômés (InserSup).'
  },
  {
    id: 'budget', family: 'argent', label: 'Budget', short: 'Budget', icon: 'wallet',
    question: 'Pouvoir financer tes études sans te mettre en difficulté',
    help: 'Tes ressources (aides, bourse, salaire d’apprenti…) face au coût total : scolarité, logement, transport, vie courante.'
  },
  {
    id: 'immobilier', family: 'argent', label: 'Coût de l’immobilier', short: 'Immobilier', icon: 'key',
    question: 'Habiter dans une ville où se loger coûte peu cher',
    help: 'Loyer moyen au m² des T1-T2 dans la commune (carte des loyers ANIL 2025). Non concerné si tu restes chez toi.'
  },
  {
    id: 'logement', family: 'quotidien', label: 'Logement disponible', short: 'Logement', icon: 'building',
    question: 'Trouver facilement un logement étudiant',
    help: 'Résidences Crous à moins de 10 km, tension du marché (zonage ABC) et hébergement proposé par l’établissement.'
  },
  {
    id: 'trajet', family: 'quotidien', label: 'Trajet', short: 'Trajet', icon: 'route',
    question: 'Ne pas passer trop de temps dans les transports',
    help: 'Temps de trajet estimé avec ton mode de transport, comparé au maximum que tu acceptes.'
  },
  {
    id: 'energie', family: 'quotidien', label: 'Énergie / charge', short: 'Énergie', icon: 'bolt',
    question: 'Garder un rythme de vie soutenable',
    help: 'Ton énergie disponible par semaine face à la charge totale : cours, travail perso, trajets, job.'
  },
  {
    id: 'carbone', family: 'planete', label: 'Empreinte carbone des trajets', short: 'Carbone', icon: 'leaf',
    question: 'Limiter l’impact climatique de tes déplacements',
    help: 'Émissions annuelles des trajets domicile-formation (facteurs ADEME Impact CO2).'
  }
];
export const CRITERION_BY_ID = Object.fromEntries(CRITERIA.map((c) => [c.id, c])) as Record<CriterionId, CriterionInfo>;

export const IMPORTANCE_LABELS = ['Ne compte pas', 'Peu important', 'Utile', 'Important', 'Très important', 'Essentiel'];

export const DEFAULT_WEIGHTS: Weights = {
  interet: 5, format: 3, parcours: 4, admission: 4, matieres: 3, competences: 3, insertion: 3,
  budget: 4, immobilier: 2, logement: 3, trajet: 3, energie: 3, carbone: 1
};

export interface Preset { id: string; label: string; description: string; weights: Weights }
export const PRESETS: Preset[] = [
  { id: 'equilibre', label: 'Équilibré', description: 'Un peu de tout, priorité à tes envies', weights: DEFAULT_WEIGHTS },
  {
    id: 'budget', label: 'Petit budget', description: 'Coût, logement et aides avant tout',
    weights: { interet: 4, format: 2, parcours: 3, admission: 3, matieres: 2, competences: 2, insertion: 2, budget: 5, immobilier: 5, logement: 4, trajet: 3, energie: 2, carbone: 1 }
  },
  {
    id: 'ambition', label: 'Ambition et débouchés', description: 'Insertion, niveau et cohérence du parcours',
    weights: { interet: 4, format: 2, parcours: 4, admission: 3, matieres: 4, competences: 4, insertion: 5, budget: 2, immobilier: 1, logement: 2, trajet: 1, energie: 2, carbone: 1 }
  },
  {
    id: 'proche', label: 'Rester près de chez moi', description: 'Trajets courts, pas de déménagement',
    weights: { interet: 4, format: 2, parcours: 3, admission: 3, matieres: 2, competences: 2, insertion: 2, budget: 3, immobilier: 1, logement: 1, trajet: 5, energie: 4, carbone: 2 }
  },
  {
    id: 'equilibre_vie', label: 'Équilibre de vie', description: 'Rythme soutenable, peu de fatigue',
    weights: { interet: 4, format: 3, parcours: 3, admission: 3, matieres: 3, competences: 3, insertion: 2, budget: 3, immobilier: 2, logement: 3, trajet: 4, energie: 5, carbone: 2 }
  }
];
