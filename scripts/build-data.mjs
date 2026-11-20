// Construit les fichiers de données de l'application (public/data/*.json) à partir des sources officielles
// téléchargées dans data-raw/ (voir scripts/fetch-sources.mjs).
// Usage : node scripts/build-data.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { num, parseCSV, toObjects } from './lib/csv.mjs';
import { classifyMaster, classifyText, domainsFromOnisep } from './lib/domains.mjs';
import { CommuneIndex, depFromPostalCode, haversineKm, parentCommune } from './lib/geo.mjs';
import { domainsByMetier, keywordsByMention, masterForTable, parseFichesMetiers } from './lib/metiers.mjs';
import { capitalize, norm, sentenceCase } from './lib/text.mjs';
import { unzip } from './lib/unzip.mjs';
import { SOURCES } from './sources.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data-raw');
const OUT = join(ROOT, 'public', 'data');

// Droits d'inscription 2026-2027 (service-public.gouv.fr, fiche F36520) — avant exonération des boursiers.
const FEES = { licence: 178, master: 255, ingePublic: 630 };

const readJSON = async (f) => JSON.parse(await readFile(join(RAW, f), 'utf8'));
const readText = async (f, encoding = 'utf-8') => new TextDecoder(encoding).decode(await readFile(join(RAW, f)));
const round = (x, d = 0) => (x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
const pct = (num_, den) => (den > 0 && num_ != null ? Math.round(Math.min(1, num_ / den) * 100) : null);
const stats = { warnings: [] };

function quantiles(values, qs) {
  const v = values.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return qs.map(() => null);
  return qs.map((q) => {
    const pos = (v.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return round(v[lo] + (v[hi] - v[lo]) * (pos - lo), 2);
  });
}
const median = (values) => quantiles(values, [0.5])[0];

// ---------------------------------------------------------------- 1. Communes
const communeIndex = new CommuneIndex(await readJSON('communes.json'));
console.log(`Communes : ${communeIndex.byCode.size}`);

// ---------------------------------------------------------------- 2. Loyers (ANIL 2025, appartements T1-T2)
const loyers = new Map();
for (const r of toObjects(parseCSV(await readText('loyers-app12-2025.csv', 'windows-1252'), ';'))) {
  const m2 = num(r.loypredm2);
  if (m2 == null) continue;
  loyers.set(r.INSEE_C, { m2, lo: num(r['lwr.IPm2']), hi: num(r['upr.IPm2']), communal: r.TYPPRED === 'commune', nobs: num(r.nbobs_com) ?? 0 });
}
// Paris, Lyon, Marseille : moyenne des arrondissements pondérée par la population.
for (const [parent, prefix] of [['75056', /^751\d\d$/], ['69123', /^6938\d$/], ['13055', /^132\d\d$/]]) {
  let s = 0;
  let w = 0;
  for (const [code, l] of loyers) {
    if (!prefix.test(code)) continue;
    const pop = communeIndex.byCode.get(code)?.pop || 1;
    s += l.m2 * pop;
    w += pop;
  }
  if (w) loyers.set(parent, { m2: s / w, lo: null, hi: null, communal: true, nobs: 0 });
}
console.log(`Loyers communaux : ${loyers.size}`);

// ---------------------------------------------------------------- 3. Zonage ABC
const zonage = new Map();
for (const r of toObjects(parseCSV(await readText('zonage-abc-2026.csv'), ';'))) {
  const zone = Object.entries(r).find(([k]) => k.startsWith('Zonage'))?.[1]?.trim();
  if (r.CODGEO && zone) zonage.set(r.CODGEO.padStart(5, '0'), zone);
}
console.log(`Zonage ABC : ${zonage.size}`);

// ---------------------------------------------------------------- 4. Résidences Crous
const crous = (await readJSON('crous-logements.json'))
  .filter((r) => r.geocalisation?.lat != null)
  .map((r) => ({
    nom: r.title?.trim(),
    zone: r.zone?.trim() ?? '',
    adresse: r.address?.trim() ?? '',
    lat: r.geocalisation.lat,
    lon: r.geocalisation.lon,
    url: r.bookingurl || r.interneturl || 'https://trouverunlogement.lescrous.fr/'
  }));
console.log(`Résidences Crous : ${crous.length}`);

// ---------------------------------------------------------------- 5. Mentions licence → master (accents + compatibilités)
const lmRows = await readJSON('mentions-licence-master.json');
const masterAccents = new Map();
const compat = new Map();
for (const r of lmRows) {
  if (!r.licence || !r.master) continue;
  masterAccents.set(norm(r.master), r.master.trim());
  const k = norm(r.licence);
  if (!compat.has(k)) compat.set(k, { label: r.licence.trim(), masters: new Set() });
  compat.get(k).masters.add(norm(r.master));
}
console.log(`Compatibilités licence → master : ${lmRows.length} (${compat.size} mentions de licence)`);

// ---------------------------------------------------------------- 6. ONISEP (statut, localisation par UAI, offres)
const onisep = toObjects(parseCSV(await readText('onisep-actions-formation-sup.csv'), ';'));
const uaiInfo = new Map();
const STATUT = { public: 0, 'privé sous contrat': 1, privé: 2, 'privé hors contrat': 3 };
for (const r of onisep) {
  const uai = r['ENS code UAI']?.trim();
  if (!uai || uaiInfo.has(uai)) continue;
  uaiInfo.set(uai, {
    statut: STATUT[r['ENS statut']?.trim()] ?? 0,
    lat: num(r['ENS latitude']),
    lon: num(r['ENS longitude']),
    commune: r['ENS commune'],
    cp: r['ENS code postal']
  });
}
console.log(`ONISEP : ${onisep.length} actions de formation, ${uaiInfo.size} lieux`);

// ---------------------------------------------------------------- 6 bis. Métiers ONISEP et mots-clés des masters
const fichesXml = unzip(await readFile(join(RAW, 'onisep-fiches-metiers.zip'))).find((f) => f.name.endsWith('.xml'));
const metiers = parseFichesMetiers(fichesXml.data.toString('utf8'));
const metierDomains = domainsByMetier(toObjects(parseCSV(await readText('onisep-ideo-metiers.csv'), ';')));
const masterFor = masterForTable(metiers, onisep);
const tmmKeywords = keywordsByMention(await readJSON('tmm-parcours-2021.json'));
const forFromUrl = (url) => Number((String(url ?? '').match(/FOR\.(\d+)/) ?? [])[1]) || null;
/** Sous-domaines ONISEP d'une action de formation (« mécanique/aéronautique » → « aéronautique »). */
const subDomains = (indexation) =>
  [...new Set(String(indexation ?? '').split('|').map((p) => p.split('/')[1]?.trim()).filter(Boolean))].join(', ');
console.log(`Métiers ONISEP : ${metiers.length} ; mentions de master reliées : ${masterFor.size} ; mots-clés TMM : ${tmmKeywords.size} mentions`);

// ---------------------------------------------------------------- 7. InserSup
const insersup = await readJSON('insersup.json');
const INS_KIND = {
  'Master LMD': 'M',
  'Master MEEF': 'MEEF',
  'Licence professionnelle': 'LP',
  "Diplôme d'ingénieurs": 'I',
  'Diplôme visé niveau bac + 5 grade master': 'C',
  'Diplôme visé niveau bac + 5': 'V'
};
const insIndex = new Map();
const insByUai = new Map(); // kind|uai -> meilleure ligne (plus grand nombre de sortants)
for (const r of insersup) {
  const kind = INS_KIND[r.type_diplome_long];
  if (!kind) continue;
  const promos = (Array.isArray(r.promo) ? r.promo : String(r.promo).split(',')).map(Number).filter(Boolean);
  const year = Math.max(...promos);
  const e18 = num(r.tx_sortants_en_emploi_sal_fr_18) ?? num(r.tx_sortants_en_emploi_sal_fr_12);
  if (e18 == null) continue;
  const v = {
    e: round(e18),
    s: round(num(r.tx_sortants_en_emploi_stable_18) ?? num(r.tx_sortants_en_emploi_stable_12)),
    w: round(num(r.salaire_q2_18) ?? num(r.salaire_q2_12) ?? num(r.salaire_q2_30)),
    n: num(r.nb_sortants_18) ?? num(r.nb_sortants_12) ?? 0,
    y: year,
    lib: r.libelle_diplome
  };
  const uai = r.uo_lib === 'National' ? 'FR' : r.etablissement;
  const lib = r.diplome === 'all' ? 'all' : norm(r.libelle_diplome);
  const key = `${kind}|${uai}|${lib}`;
  const prev = insIndex.get(key);
  if (!prev || prev.y < v.y || (prev.y === v.y && prev.n < v.n)) insIndex.set(key, v);
  if (uai !== 'FR') {
    const k2 = `${kind}|${uai}`;
    const p2 = insByUai.get(k2);
    const better = !p2 || (lib === 'all' && p2.lib !== 'all') || (p2.lib !== 'all' && (p2.y < v.y || (p2.y === v.y && p2.n < v.n)));
    if (better) insByUai.set(k2, { ...v, lib: lib === 'all' ? 'all' : v.lib });
  }
}
console.log(`InserSup : ${insIndex.size} indicateurs indexés`);

/** Renvoie [emploi 18 mois %, emplois stables %, salaire médian €, niveau, année, sortants]. */
function insertion(kind, uai, libelle) {
  const lib = norm(libelle);
  const tries = [
    [`${kind}|${uai}|${lib}`, 0],
    [`${kind}|FR|${lib}`, 1],
    [`${kind}|${uai}|all`, 2]
  ];
  for (const [key, level] of tries) {
    const v = insIndex.get(key);
    if (v && v.n >= 10) return [v.e, v.s, v.w, level, v.y, v.n];
  }
  return null;
}
function insertionByUai(kinds, uai) {
  for (const kind of kinds) {
    const v = insByUai.get(`${kind}|${uai}`);
    if (v && v.n >= 10) return [v.e, v.s, v.w, 2, v.y, v.n];
  }
  return null;
}

// ---------------------------------------------------------------- 8. Tables partagées (communes, établissements)
function createTables() {
  const communes = [];
  const communeIdx = new Map();
  const etabs = [];
  const etabIdx = new Map();
  const sectors = [];
  const sectorIdx = new Map();
  const keywords = [];
  const keywordIdx = new Map();
  return {
    commune(c) {
      if (communeIdx.has(c.code)) return communeIdx.get(c.code);
      const l = loyers.get(c.code) ?? loyers.get(parentCommune(c.code));
      const zone = zonage.get(parentCommune(c.code)) ?? zonage.get(c.code) ?? null;
      let n10 = 0;
      let nearest = Infinity;
      for (const r of crous) {
        const d = haversineKm(c.lat, c.lon, r.lat, r.lon);
        if (d <= 10) n10++;
        if (d < nearest) nearest = d;
      }
      const idx = communes.length;
      communes.push([c.code, c.nom, round(c.lat, 4), round(c.lon, 4), round(l?.m2, 1), l ? (l.communal ? 1 : 0) : null, zone, n10, round(nearest, 1), c.dep, c.pop]);
      communeIdx.set(c.code, idx);
      return idx;
    },
    etab(nom, uai) {
      const key = `${uai ?? ''}|${nom}`;
      if (etabIdx.has(key)) return etabIdx.get(key);
      const idx = etabs.length;
      etabs.push([nom, uai ?? '']);
      etabIdx.set(key, idx);
      return idx;
    },
    sector(label) {
      if (!label) return null;
      if (!sectorIdx.has(label)) { sectorIdx.set(label, sectors.length); sectors.push(label); }
      return sectorIdx.get(label);
    },
    keyword(text) {
      if (!text) return null;
      if (!keywordIdx.has(text)) { keywordIdx.set(text, keywords.length); keywords.push(text); }
      return keywordIdx.get(text);
    },
    communes,
    etabs,
    sectors,
    keywords
  };
}

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)));

// ---------------------------------------------------------------- 9. Offres Bac+3 → Mon Master 2025
function parseLieux(lieux, etaNom) {
  const parts = String(lieux ?? '').split('|').map((s) => s.trim()).filter(Boolean);
  const parsed = parts
    .map((p) => {
      const m = p.match(/^(.*) - (.+?) \((\w{2,3})\)\s*$/);
      return m ? { site: m[1].trim(), ville: m[2].trim(), dep: m[3].toUpperCase().padStart(2, '0') } : null;
    })
    .filter(Boolean);
  const specific = parsed.find((p) => norm(p.site) !== norm(etaNom));
  return specific ?? parsed[0] ?? null;
}

const onisepCostByUaiType = new Map();
function parseCost(s, years) {
  const t = String(s ?? '').replace(/ /g, ' ');
  const m = t.match(/^\s*(\d[\d ]*)\s*euros?/i);
  if (!m) return null;
  const total = Number(m[1].replace(/ /g, ''));
  const perYear = t.match(/(\d[\d ]*)\s*euros? par an/i);
  if (perYear) return Number(perYear[1].replace(/ /g, ''));
  const first = t.match(/(\d[\d ]*)\s*euros? (?:la |en )?1re année/i);
  if (first) return Number(first[1].replace(/ /g, ''));
  return Math.round(total / Math.max(1, years || 1));
}
for (const r of onisep) {
  const years = parseInt(r['AF durée cycle standard'], 10) || 1;
  const c = parseCost(r['AF coût scolarité'], years);
  if (c == null) continue;
  const key = `${r['ENS code UAI']}|${r['FOR type']?.trim()}`;
  if (!onisepCostByUaiType.has(key)) onisepCostByUaiType.set(key, []);
  onisepCostByUaiType.get(key).push(c);
}
const privateMasterCosts = [];
for (const [key, arr] of onisepCostByUaiType) {
  const [uai, type] = key.split('|');
  if (type === 'master' && (uaiInfo.get(uai)?.statut ?? 0) >= 1) privateMasterCosts.push(median(arr));
}
const PRIVATE_MASTER_MEDIAN = median(privateMasterCosts) ?? 6000;
const PRIVATE_NAME = /catholique|facult[ée]s libres|institut libre|junia|commerce et management/i;

function buildMasters(tables) {
  const rows = [];
  let skipped = 0;
  for (const r of mmRows) {
    const lieu = parseLieux(r.lieux, r.eta_nom);
    let com = lieu ? communeIndex.byName(lieu.ville, lieu.dep) : null;
    const u = uaiInfo.get(r.eta_uai);
    if (!com && u?.lat != null) com = communeIndex.nearest(u.lat, u.lon, depFromPostalCode(u.cp));
    if (!com && lieu) {
      // Dernier recours : premier lieu géocodable de la liste.
      for (const p of String(r.lieux).split('|')) {
        const m = p.match(/ - (.+?) \((\w{2,3})\)\s*$/);
        if (m) com = communeIndex.byName(m[1], m[2].toUpperCase());
        if (com) break;
      }
    }
    if (!com) { skipped++; continue; }

    const can = (n) => (r[`n_can_${n}_pp`] ?? 0) + (r[`n_can_${n}_pc`] ?? 0);
    const rate = (n) => (can(n) >= 5 ? pct(r[`n_prop_${n}_total`], can(n)) : null);
    const candidates = (r.n_can_pp ?? 0) + (r.n_can_pc ?? 0);
    const mods = Array.isArray(r.modalite_enseignement) ? r.modalite_enseignement : [r.modalite_enseignement].filter(Boolean);
    const alt = mods.includes('APPRENTISSAGE') || mods.includes('CONTRAT_PRO') || r.alternance === '1';
    const alternance = alt ? (mods.includes('INITIALE') ? 1 : 2) : 0;
    // Statut ONISEP du lieu ; à défaut, établissements privés reconnaissables à leur nom (instituts catholiques…).
    const statut = u?.statut ?? (PRIVATE_NAME.test(r.eta_nom ?? '') ? 2 : 0);
    let fee = FEES.master;
    let feeSrc = 'o';
    if (statut >= 1) {
      const known = onisepCostByUaiType.get(`${r.eta_uai}|master`);
      fee = known ? median(known) : PRIVATE_MASTER_MEDIAN;
      feeSrc = known ? 'n' : 'e';
    }
    const mentionKey = norm(r.mention);
    const isMeef = /metiers de l enseignement/.test(mentionKey);
    rows.push(
      clean({
        id: `mm-${r.ifc}`,
        ty: 'master',
        nm: masterAccents.get(mentionKey) ?? sentenceCase(r.mention),
        pc: r.parcours?.trim(),
        et: tables.etab(r.eta_nom?.trim(), r.eta_uai),
        cm: tables.commune(com),
        dm: classifyMaster(r.mention, r.secteur_disci_lib),
        al: alternance,
        st: statut,
        fe: fee,
        fs: feeSrc,
        cy: 2,
        en: [3],
        sec: tables.sector(r.secteur_disci_lib),
        ca: r.col,
        nc: candidates || null,
        ta: pct(r.n_prop_total, candidates),
        ao: clean({ l3: rate('lg3'), lp: rate('lp3'), but: rate('but3'), m: rate('master'), au: rate('autre') }),
        ad: clean({ l3: round(r.pct_accept_lg3), lp: round(r.pct_accept_lp3), but: round(r.pct_accept_but3), m: round(r.pct_accept_master), au: round(r.pct_accept_autre) }),
        in: insertion(isMeef ? 'MEEF' : 'M', r.eta_uai, r.mention) ?? (isMeef ? insertion('MEEF', 'FR', 'all') : null),
        fo: masterFor.lookup(r.mention),
        ki: tables.keyword(tmmKeywords.get(r.inm))
      })
    );
  }
  stats.mastersSkipped = skipped;
  return rows;
}

// ---------------------------------------------------------------- 10. Offres ONISEP (Bac+2 → Bac+3, Bac+3 → Bac+5 en école)
function onisepType(r) {
  const t = r['FOR type']?.trim().toLowerCase();
  const sortie = parseInt((r['FOR niveau de sortie'].match(/bac \+ (\d+)/) ?? [])[1], 10);
  const duree = parseInt(r['AF durée cycle standard'], 10);
  if (!sortie || !duree) return null;
  const entree = sortie - duree;
  switch (t) {
    case 'licence pro':
      return entree === 2 ? { ty: 'lp', en: [2], cy: 1 } : null;
    case 'licence':
      return sortie === 3 ? { ty: 'l3', en: [2], cy: 1 } : null;
    case 'bachelor universitaire de technologie':
      return sortie === 3 ? { ty: 'but3', en: [2], cy: 1 } : null;
    case "diplôme d'ingénieur":
      return sortie === 5 && duree <= 3 ? { ty: 'inge', en: duree === 3 ? [2, 3] : [3], cy: duree } : null;
    case "diplôme d'école de commerce visé de niveau bac + 4 ou 5":
      return sortie >= 4 && duree <= 3 ? { ty: 'ecom', en: duree === 3 ? [2, 3] : [3], cy: duree } : null;
    case "diplôme d'école de commerce visé (bac + 3)":
      return duree === 1 ? { ty: 'bachelor', en: [2], cy: 1 } : null;
    case 'master of science':
      return entree === 3 ? { ty: 'msc', en: [3], cy: duree } : null;
    case "formation d'école spécialisée":
      if (sortie === 3 && duree === 1) return { ty: 'bachelor', en: [2], cy: 1 };
      if (sortie === 5 && duree === 2) return { ty: 'ecole5', en: [3], cy: 2 };
      return null;
    case "diplôme des écoles d'architecture":
    case "diplôme national supérieur d'expression plastique":
      return sortie === 5 && duree === 2 ? { ty: 'ecole5', en: [3], cy: 2 } : null;
    case "diplôme d'état du paramédical":
    case "diplôme d'état du travail social":
    case "autre diplôme d'état":
      if (entree === 2 || entree === 3) return { ty: 'de', en: [entree], cy: duree };
      return null;
    default:
      return null;
  }
}

function buildOnisep(tables, level) {
  const rows = [];
  const seen = new Map(); // même formation, même lieu : une seule offre
  let skipped = 0;
  let duplicates = 0;
  for (const r of onisep) {
    const t = onisepType(r);
    if (!t || !t.en.includes(level)) continue;
    const lat = num(r['ENS latitude']);
    const lon = num(r['ENS longitude']);
    const dep = depFromPostalCode(r['ENS code postal']);
    const com = communeIndex.locate({ name: r['ENS commune'], dep, lat, lon });
    if (!com) { skipped++; continue; }
    const dupKey = `${t.ty}|${norm(r['Formation (FOR) libellé'])}|${r['ENS code UAI']}|${norm(r["Lieu d'enseignement (ENS) libellé"])}`;
    if (seen.has(dupKey)) {
      const prev = seen.get(dupKey);
      const text = `${r['AF coût scolarité']} ${r['AF modalités scolarité']}`.toLowerCase();
      if (/apprentissage|alternance|contrat de professionnalisation/.test(text)) prev.al = 1;
      duplicates++;
      continue;
    }
    const statut = STATUT[r['ENS statut']?.trim()] ?? 0;
    const years = parseInt(r['AF durée cycle standard'], 10) || 1;
    const costText = r['AF coût scolarité'];
    let fee = parseCost(costText, years);
    let feeSrc = fee != null ? 'n' : null;
    if (fee == null && statut === 0) {
      fee = t.ty === 'inge' ? FEES.ingePublic : ['lp', 'l3', 'but3'].includes(t.ty) ? FEES.licence : t.ty === 'msc' || t.ty === 'ecole5' ? FEES.master : t.ty === 'de' ? FEES.licence : FEES.master;
      feeSrc = ['lp', 'l3', 'but3'].includes(t.ty) ? 'o' : 'e';
    }
    const text = `${costText} ${r['AF modalités scolarité']} ${r['Formation (FOR) libellé']}`.toLowerCase();
    const alternance = /apprentissage|alternance|contrat de professionnalisation/.test(text) ? 1 : 0;
    const heb = String(r['ENS hébergement'] ?? '').toLowerCase();
    const hb = heb.startsWith('internat') ? 1 : /résidence|hébergement organisé|logement|crous|partenariat/.test(heb) ? 2 : 0;
    let dm = domainsFromOnisep(r['FOR indexation domaine web Onisep']);
    if (!dm.length) dm = classifyText(r['Formation (FOR) libellé']);
    const libelle = capitalize(r['Formation (FOR) libellé']);
    let ins = null;
    if (t.ty === 'lp') {
      const mention = (r['Formation (FOR) libellé'].match(/mention (.+?)(?: parcours |$)/i) ?? [])[1];
      ins = mention ? insertion('LP', r['ENS code UAI'], mention) : null;
    } else if (t.ty === 'inge') ins = insertionByUai(['I'], r['ENS code UAI']);
    else if (t.ty === 'ecom' || t.ty === 'msc' || t.ty === 'ecole5') ins = insertionByUai(['C', 'V'], r['ENS code UAI']);
    const offer = clean({
        id: `on-${r['Action de Formation (AF) identifiant Onisep']}`,
        ty: t.ty,
        nm: libelle,
        et: tables.etab(r["Lieu d'enseignement (ENS) libellé"]?.trim(), r['ENS code UAI']),
        cm: tables.commune(com),
        la: lat != null ? round(lat, 4) : null,
        lo: lon != null ? round(lon, 4) : null,
        dm,
        al: alternance,
        st: statut,
        fe: fee,
        fs: feeSrc,
        cy: level === 3 && t.en.length > 1 ? Math.max(1, t.cy - 1) : t.cy,
        en: t.en,
        in: ins,
        ur: r['AF page web'] && r['AF page web'] !== r['FOR URL et ID Onisep'] ? r['AF page web'] : null,
        uo: r['FOR URL et ID Onisep'],
        hb,
        fo: forFromUrl(r['FOR URL et ID Onisep']),
        ki: tables.keyword(subDomains(r['FOR indexation domaine web Onisep']))
      });
    seen.set(dupKey, offer);
    rows.push(offer);
  }
  stats[`onisepSkipped${level}`] = skipped;
  stats[`onisepDuplicates${level}`] = duplicates;
  return rows;
}

// Coût estimé des formations privées sans information : médiane ONISEP par type et statut.
function fillPrivateCosts(offers) {
  const byType = new Map();
  for (const o of offers) {
    if (o.st >= 1 && o.fs === 'n') {
      const k = o.ty;
      if (!byType.has(k)) byType.set(k, []);
      byType.get(k).push(o.fe);
    }
  }
  const medians = Object.fromEntries([...byType].map(([k, v]) => [k, median(v)]));
  for (const o of offers) {
    if (o.fe == null) {
      o.fe = medians[o.ty] ?? 6000;
      o.fs = 'e';
    }
  }
  return medians;
}

// ---------------------------------------------------------------- 11. Offres post-bac → Parcoursup 2025
const PSUP_TYPE = {
  BTS: 'bts', BUT: 'but', CPGE: 'cpge', Licence: 'licence', Licence_Las: 'las', PASS: 'pass', IFSI: 'ifsi',
  EFTS: 'efts', "Ecole d'Ingénieur": 'inge_post', 'Ecole de Commerce': 'ecom_post', 'Autre formation': 'autre'
};
const PSUP_STATUT = { Public: 0, "Privé sous contrat d'association": 1, 'Privé enseignement supérieur': 2, 'Privé hors contrat': 3 };
const PSUP_FALLBACK = {
  ifsi: ['sante'], efts: ['sante'], pass: ['sante', 'sciences'], las: ['sante'], cpge: ['sciences'],
  inge_post: ['sciences', 'indus'], ecom_post: ['gestion', 'commerce']
};

function buildParcoursup(tables) {
  const rows = [];
  let skipped = 0;
  for (const r of psupRows) {
    const g = r.g_olocalisation_des_formations;
    const com = communeIndex.locate({ name: r.ville_etab, dep: r.dep, lat: g?.lat, lon: g?.lon });
    if (!com) { skipped++; continue; }
    const ty = PSUP_TYPE[r.fili] ?? 'autre';
    const statut = PSUP_STATUT[r.contrat_etab] ?? 0;
    const apprenti = /apprentissage/i.test(r.lib_for_voe_ins ?? '');
    let fee = null;
    let feeSrc = 'o';
    if (statut === 0) {
      fee = ty === 'bts' ? 0 : ty === 'cpge' ? 0 : ty === 'inge_post' ? FEES.ingePublic : FEES.licence;
      if (ty === 'inge_post' || ty === 'autre' || ty === 'ecom_post') feeSrc = 'e';
    } else if (statut === 1 && (ty === 'bts' || ty === 'cpge')) {
      fee = null; // établissements privés sous contrat : frais variables → estimation plus bas
    }
    if (apprenti) { fee = 0; feeSrc = 'o'; }
    const text = `${r.fil_lib_voe_acc ?? ''} ${r.form_lib_voe_acc ?? ''} ${r.detail_forma ?? ''}`;
    let dm = classifyText(text, PSUP_FALLBACK[ty] ?? []);
    if (ty === 'cpge') {
      const t = norm(text);
      dm = /ecg|economique|commerciale|ect\b/.test(t) ? ['gestion', 'droit'] : /litteraire|lettres|khagne|chartes|ens d2|ens d1/.test(t) ? ['lettres', 'shs'] : /bcpst|tb\b/.test(t) ? ['sciences', 'agri'] : /mp2i/.test(t) ? ['sciences', 'info'] : /ptsi|tsi|pt\b/.test(t) ? ['sciences', 'meca'] : ['sciences'];
    }
    if (!dm.length) dm = ['sciences'];
    rows.push(
      clean({
        id: `ps-${r.cod_aff_form}`,
        ty,
        nm: r.fil_lib_voe_acc?.trim() || r.form_lib_voe_acc?.trim(),
        pc: [r.form_lib_voe_acc?.trim(), r.detail_forma?.trim()].filter(Boolean).join(' · '),
        et: tables.etab(r.g_ea_lib_vx?.trim(), r.cod_uai),
        cm: tables.commune(com),
        la: g?.lat != null ? round(g.lat, 4) : null,
        lo: g?.lon != null ? round(g.lon, 4) : null,
        dm,
        al: apprenti ? 2 : 0,
        st: statut,
        fe: fee,
        fs: fee == null ? null : feeSrc,
        cy: ty === 'bts' || ty === 'cpge' ? 2 : ty === 'inge_post' || ty === 'ecom_post' ? 5 : 3,
        en: [0],
        sel: r.select_form === 'formation sélective' ? 1 : 0,
        ca: r.capa_fin,
        nc: r.voe_tot,
        ta: r.taux_acces_ens,
        mt: [r.pct_sansmention, r.pct_ab, r.pct_b, r.pct_tb, r.pct_tbf].map((x) => round(x ?? 0)),
        bc: [r.pct_bg, r.pct_bt, r.pct_bp].map((x) => round(x ?? 0)),
        bo: round(r.pct_bours)
      })
    );
  }
  stats.psupSkipped = skipped;
  return rows;
}

// ---------------------------------------------------------------- 12. Assemblage et écriture
const mmRows = await readJSON('monmaster-2025.json');
const psupRows = await readJSON('parcoursup-2025.json');
await mkdir(OUT, { recursive: true });

async function writeLevel(file, build) {
  const tables = createTables();
  const offers = build(tables);
  const medians = fillPrivateCosts(offers);
  const payload = { v: 2, etabs: tables.etabs, communes: tables.communes, sectors: tables.sectors, keywords: tables.keywords, offers };
  const json = JSON.stringify(payload);
  await writeFile(join(OUT, file), json);
  console.log(`→ ${file} : ${offers.length} offres, ${tables.communes.length} communes, ${(json.length / 1e6).toFixed(2)} Mo`);
  return { offers, tables, medians };
}

const bac3 = await writeLevel('offres-bac3.json', (t) => [...buildMasters(t), ...buildOnisep(t, 3)]);
const bac2 = await writeLevel('offres-bac2.json', (t) => buildOnisep(t, 2));
const bac0 = await writeLevel('offres-bac.json', (t) => buildParcoursup(t));

// Références nationales pour normaliser les scores.
const rentValues = [];
for (const lvl of [bac3, bac2]) for (const o of lvl.offers) rentValues.push(lvl.tables.communes[o.cm][4]);
const insValues = bac3.offers.filter((o) => o.in).map((o) => o.in[0]);
const salValues = [...bac3.offers, ...bac2.offers].filter((o) => o.in?.[2]).map((o) => o.in[2]);
const count = (offers) => offers.reduce((acc, o) => ((acc[o.ty] = (acc[o.ty] ?? 0) + 1), acc), {});

const meta = {
  generatedAt: new Date().toISOString(),
  sources: SOURCES.map(({ key, label, producer, page, licence }) => ({ key, label, producer, page, licence })),
  counts: { bac3: count(bac3.offers), bac2: count(bac2.offers), bac: count(bac0.offers), crous: crous.length },
  refs: {
    rentM2: quantiles(rentValues, [0.05, 0.25, 0.5, 0.75, 0.95]),
    employment18: quantiles(insValues, [0.1, 0.25, 0.5, 0.75, 0.9]),
    salary: quantiles(salValues, [0.1, 0.25, 0.5, 0.75, 0.9]),
    privateCostMedians: { bac3: bac3.medians, bac2: bac2.medians, bac: bac0.medians, masterPrive: PRIVATE_MASTER_MEDIAN }
  },
  quality: {
    mastersSkipped: stats.mastersSkipped,
    onisepSkipped: { bac3: stats.onisepSkipped3, bac2: stats.onisepSkipped2 },
    parcoursupSkipped: stats.psupSkipped,
    insertionCoverage: {
      bac3: round((bac3.offers.filter((o) => o.in).length / bac3.offers.length) * 100),
      bac2: round((bac2.offers.filter((o) => o.in).length / Math.max(1, bac2.offers.length)) * 100)
    }
  }
};
await writeFile(join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));

const licences = [...compat.values()]
  .map((c) => ({ label: c.label, key: norm(c.label), masters: [...c.masters], dm: classifyText(c.label) }))
  .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
await writeFile(join(OUT, 'licence-master.json'), JSON.stringify(licences));
await writeFile(join(OUT, 'crous.json'), JSON.stringify(crous.map((r) => [round(r.lat, 5), round(r.lon, 5), r.nom, r.zone, r.url])));

// Métiers : secteurs, niveau d'accès, statuts, domaines et formations (seulement celles présentes dans les offres).
const offerFors = new Set([...bac3.offers, ...bac2.offers].map((o) => o.fo).filter(Boolean));
const sectorList = [...new Set(metiers.flatMap((m) => m.sectors))].sort((a, b) => a.localeCompare(b, 'fr'));
const statutList = [...new Set(metiers.flatMap((m) => m.statuts))];
const metiersPayload = {
  v: 1,
  sectors: sectorList,
  statuts: statutList,
  metiers: metiers
    .map((m) => [
      m.id,
      m.name,
      m.synonyms.join('|'),
      m.sectors.map((s) => sectorList.indexOf(s)),
      m.level,
      m.statuts.map((s) => statutList.indexOf(s)),
      metierDomains.get(m.id) ?? [],
      m.fors.filter((f) => offerFors.has(f)),
      m.accroche
    ])
    .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
};
const metiersJson = JSON.stringify(metiersPayload);
await writeFile(join(OUT, 'metiers.json'), metiersJson);
const linked = (offers) => offers.filter((o) => o.fo && metiers.some((m) => m.fors.includes(o.fo))).length;
console.log(
  `→ metiers.json : ${metiers.length} métiers, ${sectorList.length} secteurs, ${(metiersJson.length / 1e6).toFixed(2)} Mo ; ` +
    `offres reliées à un métier : bac+3 ${linked(bac3.offers)}/${bac3.offers.length}, bac+2 ${linked(bac2.offers)}/${bac2.offers.length}`
);

console.log('\nRésumé :', JSON.stringify(meta.counts), '\nQualité :', JSON.stringify(meta.quality), '\nRéférences :', JSON.stringify(meta.refs));
