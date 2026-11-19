// Catalogue des sources ouvertes officielles utilisées par Cap Sup.
// Chaque entrée est téléchargée dans data-raw/ par scripts/fetch-sources.mjs.

const ESR = 'https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets';
const q = (s) => encodeURIComponent(s);

const MM_FIELDS = [
  'session', 'eta_uai', 'eta_nom', 'ifc', 'inm', 'mention', 'inmp', 'parcours', 'alternance',
  'modalite_enseignement', 'lieux', 'lieu_acad_lib', 'discipline', 'disci_lib', 'secteur_disci',
  'secteur_disci_lib', 'col', 'n_can_pp', 'n_can_pc', 'n_prop_total', 'n_accept_total',
  'n_can_lg3_pp', 'n_can_lg3_pc', 'n_can_lp3_pp', 'n_can_lp3_pc', 'n_can_but3_pp', 'n_can_but3_pc',
  'n_can_master_pp', 'n_can_master_pc', 'n_can_autre_pp', 'n_can_autre_pc',
  'n_prop_lg3_total', 'n_prop_lp3_total', 'n_prop_but3_total', 'n_prop_master_total', 'n_prop_autre_total',
  'pct_accept_lg3', 'pct_accept_lp3', 'pct_accept_but3', 'pct_accept_master', 'pct_accept_autre'
];

const PSUP_FIELDS = [
  'session', 'cod_aff_form', 'contrat_etab', 'cod_uai', 'g_ea_lib_vx', 'dep', 'ville_etab', 'lib_for_voe_ins',
  'select_form', 'fili', 'form_lib_voe_acc', 'fil_lib_voe_acc', 'detail_forma', 'g_olocalisation_des_formations',
  'capa_fin', 'voe_tot', 'taux_acces_ens', 'pct_mention_nonrenseignee', 'pct_sansmention', 'pct_ab', 'pct_b',
  'pct_tb', 'pct_tbf', 'pct_bg', 'pct_bt', 'pct_bp', 'pct_bours', 'lien_form_psup'
];

const INSERSUP_FIELDS = [
  'promo', 'type_diplome_long', 'uo_lib', 'etablissement', 'diplome', 'libelle_diplome', 'discipli', 'discipli_lib',
  'sectdis', 'sectdis_lib', 'nb_sortants_12', 'nb_sortants_18', 'tx_sortants_en_emploi_sal_fr_12',
  'tx_sortants_en_emploi_sal_fr_18', 'tx_sortants_en_emploi_sal_fr_30', 'tx_sortants_en_emploi_stable_12',
  'tx_sortants_en_emploi_stable_18', 'salaire_q2_12', 'salaire_q2_18', 'salaire_q2_30'
];
const INSERSUP_TYPES = [
  'Master LMD', 'Master MEEF', 'Licence professionnelle', "Diplôme d'ingénieurs",
  'Diplôme visé niveau bac + 5 grade master', 'Diplôme visé niveau bac + 5'
];
const INSERSUP_WHERE = [
  'genre="ensemble"', 'nationalite="ensemble"', 'regime_inscription="ensemble"', 'obtention_diplome="diplômé"',
  '(' + INSERSUP_TYPES.map((t) => `type_diplome_long="${t}"`).join(' or ') + ')'
].join(' and ');

export const SOURCES = [
  {
    key: 'monmaster',
    file: 'monmaster-2025.json',
    url: `${ESR}/fr-esr-mon_master/exports/json?where=${q('session="2025"')}&select=${q(MM_FIELDS.join(','))}`,
    label: 'Mon Master 2025 : vœux de poursuite d’études en master et réponses des établissements',
    producer: 'Ministère de l’Enseignement supérieur (SIES)',
    page: 'https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-mon_master/',
    licence: 'Licence Ouverte v2.0 (Etalab)'
  },
  {
    key: 'insersup',
    file: 'insersup.json',
    url: `${ESR}/fr-esr-insersup/exports/json?where=${q(INSERSUP_WHERE)}&select=${q(INSERSUP_FIELDS.join(','))}`,
    label: 'InserSup : insertion professionnelle des diplômés de l’enseignement supérieur',
    producer: 'Ministère de l’Enseignement supérieur (SIES)',
    page: 'https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-insersup/',
    licence: 'Licence Ouverte v2.0 (Etalab)'
  },
  {
    key: 'parcoursup',
    file: 'parcoursup-2025.json',
    url: `${ESR}/fr-esr-parcoursup/exports/json?select=${q(PSUP_FIELDS.join(','))}`,
    label: 'Parcoursup 2025 : vœux de poursuite d’études et réponses des établissements',
    producer: 'Ministère de l’Enseignement supérieur (SIES)',
    page: 'https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr-esr-parcoursup/',
    licence: 'Licence Ouverte v2.0 (Etalab)'
  },
  {
    key: 'licenceMaster',
    file: 'mentions-licence-master.json',
    url: `${ESR}/fr_esr_mentions_de_licence_vers_master/exports/json`,
    label: 'Compatibilité des mentions de licence avec les mentions de master',
    producer: 'Ministère de l’Enseignement supérieur',
    page: 'https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr_esr_mentions_de_licence_vers_master/',
    licence: 'Licence Ouverte (Etalab)'
  },
  {
    key: 'crous',
    file: 'crous-logements.json',
    url: `${ESR}/fr_crous_logement_france_entiere/exports/json?select=${q('id,title,zone,address,geocalisation,bookingurl,interneturl')}`,
    label: 'Résidences étudiantes proposées par le réseau des Crous',
    producer: 'CNOUS (réseau des Crous)',
    page: 'https://data.enseignementsup-recherche.gouv.fr/explore/dataset/fr_crous_logement_france_entiere/',
    licence: 'Licence Ouverte (Etalab)'
  },
  {
    key: 'onisep',
    file: 'onisep-actions-formation-sup.csv',
    url: 'https://data.onisep.fr/api/v1/downloads/605344579a7d7/605344579a7d7.csv',
    label: 'Idéo-Actions de formation initiale – Univers enseignement supérieur',
    producer: 'ONISEP',
    page: 'https://opendata.onisep.fr/',
    licence: 'Licence Ouverte (Etalab)'
  },
  {
    key: 'loyers',
    file: 'loyers-app12-2025.csv',
    url: 'https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/20251211-144934/pred-app12-mef-dhup.csv',
    label: 'Carte des loyers 2025 : indicateur de loyer des appartements T1-T2 par commune',
    producer: 'Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin (Ministère du Logement)',
    page: 'https://www.data.gouv.fr/fr/datasets/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/',
    licence: 'Licence Ouverte v2.0 (Etalab)'
  },
  {
    key: 'zonage',
    file: 'zonage-abc-2026.csv',
    url: 'https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-abc/20260703-091314/liste-ensemble-des-communes-zonage-abc-en-vigueur-26-juin-2026.csv',
    label: 'Zonage ABC des communes (tension du marché du logement), en vigueur au 26 juin 2026',
    producer: 'Ministère de la Transition écologique / Ministère du Logement',
    page: 'https://www.data.gouv.fr/fr/datasets/liste-des-communes-selon-le-zonage-abc/',
    licence: 'Licence Ouverte v2.0 (Etalab)'
  },
  {
    key: 'communes',
    file: 'communes.json',
    url: 'https://geo.api.gouv.fr/communes?type=commune-actuelle,arrondissement-municipal&fields=nom,code,codeDepartement,centre,population&format=json',
    label: 'API Découpage administratif (communes, centres géographiques, population)',
    producer: 'Etalab / IGN / INSEE (geo.api.gouv.fr)',
    page: 'https://geo.api.gouv.fr/decoupage-administratif',
    licence: 'Licence Ouverte (Etalab)'
  }
];
