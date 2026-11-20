// Moteur de compatibilité : 17 sous-scores (0-100) indépendants des pondérations, puis moyenne pondérée.
// Un sous-score « null » signifie « non concerné » : il est exclu de la moyenne (ex. coût du logement si
// l'étudiant reste chez ses parents, continuité avec l'entreprise s'il n'est pas en alternance).
import {
  ALTERNANCE_LOAD, BOURSES, CO2_PER_KM, COLOC_FACTOR, CROUS_RENT, DETOUR, FEES, PENIBILITE, SMIC_BRUT, SPEED,
  STUDIO_M2, TRANSPORT_LABELS, TYPES, apprenticePct, commuteCostMonth
} from './constants';
import { CRITERIA } from './criteria';
import {
  ALTERNANCE_SKILLS, DOMAIN_BY_ID, DOMAIN_SKILLS, DOMAIN_SUBJECTS, SKILLS, SUBJECTS, TYPE_SKILLS, domainsAreNeighbours
} from './domains';
import { fmt1, fmtDuration, fmtEuro, fmtInt, fmtKm, fmtPct } from './format';
import { haversineKm } from './geo';
import { GOAL_BY_ID, sectorDomains, type JobsIndex } from './jobs';
import { isAlternant } from './profile';
import { norm, stemLabels, stems } from './text';
import type {
  Budget, CriterionId, CriterionScore, Diploma, DomainId, Evaluation, GoalId, Metier, Mobility, Offer, Profile, SkillId,
  SubjectId, TransportMode, Weights
} from './types';

export interface ScoringContext {
  /** Mention de licence (clé normalisée) → mentions de master compatibles (clés normalisées). */
  licenceToMasters: Map<string, Set<string>>;
  /** Médiane nationale du loyer au m² (T1-T2), utilisée si la commune n'a pas d'indicateur. */
  medianRentM2: number;
  /** Métiers ONISEP et liens formation → métier. */
  jobs?: JobsIndex;
  /** Rareté des mots parmi les formations (idf), pour le critère « thématique ». */
  idf?: Map<string, number>;
}

export type Assessment = Omit<Evaluation, 'total' | 'reliability'>;

// ------------------------------------------------------------------ outils
export const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

/** Interpolation linéaire par morceaux sur des points [x, y] triés par x croissant. */
export function lerp(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    if (x <= x1) {
      const [x0, y0] = pts[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return pts[pts.length - 1][1];
}

const DOMAIN_FACTORS = [1, 0.6, 0.4];

function aggregate<K extends string>(domains: DomainId[], table: Record<DomainId, Partial<Record<K, number>>>): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  domains.slice(0, 3).forEach((d, i) => {
    for (const [k, v] of Object.entries(table[d] ?? {}) as [K, number][]) {
      out[k] = Math.max(out[k] ?? 0, v * DOMAIN_FACTORS[i]);
    }
  });
  return out;
}

export function isApprentice(o: Offer, p: Profile): boolean {
  return o.al === 2 || (o.al === 1 && (p.alternance === 'oui' || p.alternance === 'uniquement'));
}

export type Origin = 'l3' | 'lp' | 'but' | 'au';
export function originOf(d: Diploma): Origin {
  if (d === 'licence') return 'l3';
  if (d === 'lp') return 'lp';
  if (d === 'but') return 'but';
  return 'au';
}
export const ORIGIN_LABELS: Record<Origin, string> = {
  l3: 'issus de L3', lp: 'issus de licence pro', but: 'issus de BUT', au: 'issus d’autres formations'
};

/** Position estimée de l'étudiant dans sa promotion (0 = dernier, 1 = premier). */
export function percentile(p: Profile): number {
  const fromAvg = clamp(0.05 + (p.average - 10) * 0.15, 0.03, 0.97);
  const byRank = { top10: 0.92, top25: 0.78, mid: 0.5, low: 0.25 } as const;
  if (p.rank === 'unknown') return fromAvg;
  return 0.7 * byRank[p.rank] + 0.3 * fromAvg;
}

/** Probabilité d'admission : le taux observé t, modulé selon la position q (q = 0,5 → t). */
export function admissionProbability(t: number, q: number): number {
  const tt = clamp(t, 0, 1);
  if (tt <= 0) return 0;
  if (tt >= 1) return 1;
  return tt ** (2 ** (3 * (0.5 - q)));
}

// ------------------------------------------------------------------ mobilité
export function travelMinutes(mode: TransportMode, roadKm: number): number {
  const s = SPEED[mode];
  return (roadKm / s.kmh(roadKm)) * 60 + s.fixedMin;
}

const LOCAL_KM = 3; // trajet local quand on habite dans la ville de la formation
const WEEKS = 32; // semaines de cours par an (hypothèse)
const HOME_TRIPS = 10; // allers-retours vers le domicile familial par an si l'on déménage (hypothèse)

export function computeMobility(o: Offer, p: Profile): Mobility {
  if (!p.home) {
    const local: TransportMode = o.commune.pop > 150000 ? 'metro' : 'bus';
    const min = travelMinutes(local, LOCAL_KM * DETOUR);
    return {
      distanceKm: NaN, roadKm: NaN, commuteMin: min, moves: true, tooFar: false, localMode: local,
      weeklyCommuteH: (2 * min * 5) / 60, co2KgYear: 2 * LOCAL_KM * DETOUR * 5 * WEEKS * CO2_PER_KM[local],
      transportCostMonth: commuteCostMonth(local, LOCAL_KM * DETOUR, LOCAL_KM)
    };
  }
  const d = haversineKm(p.home.lat, p.home.lon, o.lat, o.lon);
  // Les coordonnées sont souvent celles du centre de la commune : on compte au moins un trajet urbain.
  const road = Math.max(LOCAL_KM, d) * DETOUR;
  const commuteMin = travelMinutes(p.transport, road);
  const tooLong = commuteMin > p.maxCommuteMin;
  const moves = tooLong && p.canMove;
  const tooFar = tooLong && !p.canMove;
  if (!moves) {
    return {
      distanceKm: d, roadKm: road, commuteMin, moves: false, tooFar, localMode: p.transport,
      weeklyCommuteH: (2 * commuteMin * 5) / 60,
      co2KgYear: 2 * road * 5 * WEEKS * CO2_PER_KM[p.transport],
      transportCostMonth: commuteCostMonth(p.transport, road, d)
    };
  }
  const soft: TransportMode[] = ['velo', 'vae', 'marche'];
  const localMode: TransportMode = soft.includes(p.transport) ? p.transport : o.commune.pop > 150000 ? 'metro' : 'bus';
  const localRoad = LOCAL_KM * DETOUR;
  const localMin = travelMinutes(localMode, localRoad);
  const returnMode: TransportMode = d > 40 ? 'train' : p.transport;
  const co2 = 2 * localRoad * 5 * WEEKS * CO2_PER_KM[localMode] + HOME_TRIPS * 2 * road * CO2_PER_KM[returnMode];
  const returnCostMonth = (HOME_TRIPS * 2 * d * 0.1) / 10; // ≈ 0,10 €/km en train avec réduction jeune (hypothèse)
  return {
    distanceKm: d, roadKm: road, commuteMin: localMin, moves: true, tooFar: false, localMode,
    weeklyCommuteH: (2 * localMin * 5) / 60, co2KgYear: co2,
    transportCostMonth: commuteCostMonth(localMode, localRoad, LOCAL_KM) + returnCostMonth
  };
}

// ------------------------------------------------------------------ budget
export function monthlyRent(o: Offer, p: Profile, ctx: ScoringContext): { amount: number; label: string; estimated: boolean } {
  const m2 = o.commune.loyerM2 ?? ctx.medianRentM2;
  const studio = m2 * STUDIO_M2;
  if (p.housing === 'crous') {
    if (o.commune.crous10 > 0) {
      return { amount: CROUS_RENT[o.commune.zone ?? 'B2'] ?? 340, label: 'Loyer d’une résidence Crous (ordre de grandeur)', estimated: true };
    }
    return { amount: studio, label: 'Loyer d’un studio (aucune résidence Crous à moins de 10 km)', estimated: o.commune.loyerM2 == null };
  }
  if (p.housing === 'coloc') return { amount: studio * COLOC_FACTOR, label: 'Chambre en colocation', estimated: o.commune.loyerM2 == null };
  return { amount: studio, label: `Studio de ${STUDIO_M2} m² (loyer moyen de la commune)`, estimated: o.commune.loyerM2 == null };
}

export function annualTuition(o: Offer, p: Profile): { amount: number; note: string } {
  if (isApprentice(o, p)) return { amount: 0, note: 'Gratuit en apprentissage (pris en charge par l’employeur / l’OPCO)' };
  const fee = o.fe ?? 0;
  const boursier = p.bourse !== 'non';
  if ((o.st ?? 0) === 0 && o.fs === 'o') {
    return boursier ? { amount: 0, note: 'Exonéré : étudiant boursier, établissement public' } : { amount: fee, note: 'Droits nationaux 2026-2027' };
  }
  const src = o.fs === 'n' ? 'information ONISEP' : 'estimation (médiane des formations comparables)';
  return { amount: fee, note: `${fmtEuro(fee)} par an (${src})` };
}

export function computeBudget(o: Offer, p: Profile, mob: Mobility, ctx: ScoringContext): Budget {
  const lines: Budget['lines'] = [];
  if (p.monthlyResources > 0) lines.push({ label: 'Tes ressources (famille, job…)', amount: p.monthlyResources, kind: 'in' });
  if (p.bourse !== 'non') {
    lines.push({ label: `Bourse sur critères sociaux (échelon ${p.bourse})`, amount: (BOURSES[p.bourse] ?? 0) / 10, kind: 'in', note: '10 mensualités' });
  }
  if (p.savings > 0) lines.push({ label: 'Épargne lissée sur 10 mois', amount: p.savings / 10, kind: 'in' });
  if (isApprentice(o, p)) {
    const pctSmic = apprenticePct(p.age);
    lines.push({ label: `Salaire d’apprenti (${Math.round(pctSmic * 100)} % du SMIC, 1re année)`, amount: SMIC_BRUT * pctSmic, kind: 'in', note: 'montant brut minimal' });
  }
  if (mob.moves) {
    const rent = monthlyRent(o, p, ctx);
    lines.push({ label: rent.label, amount: rent.amount, kind: 'out' });
    if (p.apl > 0) lines.push({ label: 'Aide au logement (APL) estimée', amount: p.apl, kind: 'in' });
  }
  if (p.livingCosts > 0) lines.push({ label: 'Vie courante (alimentation, téléphone, loisirs)', amount: p.livingCosts, kind: 'out' });
  if (mob.transportCostMonth > 0) {
    lines.push({
      label: mob.moves ? 'Transports (trajets locaux + retours à la maison)' : `Transport quotidien (${TRANSPORT_LABELS[mob.localMode].toLowerCase()})`,
      amount: mob.transportCostMonth,
      kind: 'out'
    });
  }
  const tuition = annualTuition(o, p);
  if (tuition.amount > 0) lines.push({ label: 'Frais de scolarité', amount: tuition.amount / 10, kind: 'out', note: tuition.note });
  const cvecDue = p.bourse === 'non' && !(o.ty === 'bts' && (o.st ?? 0) <= 1);
  if (cvecDue) lines.push({ label: 'CVEC (contribution vie étudiante)', amount: FEES.cvec / 10, kind: 'out', note: `${FEES.cvec} € par an` });
  const resources = lines.filter((l) => l.kind === 'in').reduce((s, l) => s + l.amount, 0);
  const costs = lines.filter((l) => l.kind === 'out').reduce((s, l) => s + l.amount, 0);
  return { resources, costs, balance: resources - costs, lines };
}

// ------------------------------------------------------------------ critères
type Scorer = (o: Offer, p: Profile, ctx: ScoringContext, m: Mobility, b: Budget, x: boolean) => Omit<CriterionScore, 'id'>;

const INTEREST_SCORE = { 0: 0, 1: 45, 2: 75, 3: 100 } as const;
const INTEREST_LABEL = { 1: 'curiosité', 2: 'intérêt', 3: 'passion' } as const;

const scoreInteret: Scorer = (o, p) => {
  const entries = Object.entries(p.interests).filter(([, v]) => v);
  if (!entries.length) return { score: 50, confidence: 'estimate', summary: 'Choisis tes centres d’intérêt pour affiner ce critère.' };
  const levels = o.dm.map((d) => p.interests[d] ?? 0);
  const best = Math.max(0, ...levels) as 0 | 1 | 2 | 3;
  const names = o.dm.map((d) => DOMAIN_BY_ID[d]?.short).filter(Boolean).join(', ');
  if (best === 0) {
    const near = o.dm.some((d) => entries.some(([u, lvl]) => (lvl ?? 0) >= 2 && domainsAreNeighbours(d, u as DomainId)));
    return {
      score: near ? 25 : 5,
      confidence: 'data',
      summary: near ? `Domaine voisin de tes intérêts (${names})` : `Hors de tes centres d’intérêt (${names})`
    };
  }
  const bonus = levels.filter((l) => l >= 2).length >= 2 ? 5 : 0;
  const top = o.dm[levels.indexOf(best)];
  return {
    score: clamp(INTEREST_SCORE[best] + bonus),
    confidence: 'data',
    summary: `${DOMAIN_BY_ID[top].short} : ${INTEREST_LABEL[best as 1 | 2 | 3]}`,
    details: [`Domaines de la formation (nomenclature ONISEP) : ${names}`]
  };
};

const scoreFormat: Scorer = (o, p) => {
  const typeScore = p.types.length === 0 ? 80 : p.types.includes(o.ty) ? 100 : 35;
  const al = o.al ?? 0;
  let altScore = 100;
  let altText = '';
  switch (p.alternance) {
    case 'oui':
      altScore = al >= 1 ? 100 : 35;
      altText = al >= 1 ? 'alternance possible' : 'pas d’alternance identifiée';
      break;
    case 'uniquement':
      altScore = al >= 1 ? 100 : 0;
      altText = al >= 1 ? 'alternance possible' : 'pas d’alternance identifiée';
      break;
    case 'non':
      altScore = al === 2 ? 10 : 100;
      altText = al === 2 ? 'uniquement en alternance' : 'formation initiale possible';
      break;
    default:
      altText = al === 2 ? 'en alternance' : al === 1 ? 'alternance possible' : 'formation initiale';
  }
  const typeText = p.types.length === 0 ? TYPES[o.ty].label : p.types.includes(o.ty) ? `${TYPES[o.ty].label} (type souhaité)` : `${TYPES[o.ty].label} (autre type que ceux choisis)`;
  return { score: Math.round(0.6 * typeScore + 0.4 * altScore), confidence: 'data', summary: `${typeText} · ${altText}` };
};

function domainOverlap(a: DomainId[], b: DomainId[]): 'same' | 'near' | 'none' {
  if (a.some((x) => b.includes(x))) return 'same';
  if (a.some((x) => b.some((y) => domainsAreNeighbours(x, y)))) return 'near';
  return 'none';
}

const scoreParcours: Scorer = (o, p, ctx, _m, _b, x) => {
  const details: string[] = [];
  if (p.level === 0) {
    const idx = p.diploma === 'bac_techno' ? 1 : p.diploma === 'bac_pro' ? 2 : 0;
    const share = o.bc?.[idx];
    if (share == null) return { score: 60, confidence: 'estimate', summary: 'Pas de données sur le profil des admis' };
    const kind = ['généraux', 'technologiques', 'professionnels'][idx];
    return {
      score: Math.round(clamp(25 + share * 1.5)),
      confidence: 'data',
      summary: `${fmtPct(share)} des admis 2025 sont des bacheliers ${kind}`
    };
  }
  if (!p.currentDomains.length && !(p.diploma === 'licence' && p.licenceMention)) {
    return { score: 50, confidence: 'estimate', summary: 'Indique le domaine de tes études actuelles pour évaluer la continuité' };
  }
  let base: number;
  let summary: string;
  const overlap = domainOverlap(p.currentDomains, o.dm);
  if (o.ty === 'master' && p.diploma === 'licence' && p.licenceMention) {
    const compatible = ctx.licenceToMasters.get(p.licenceMention)?.has(norm(o.nm)) ?? false;
    if (compatible) {
      base = 100;
      summary = 'Ta mention de licence fait partie des licences conseillées pour cette mention de master';
    } else {
      base = overlap === 'same' ? 65 : overlap === 'near' ? 45 : 20;
      summary = overlap === 'same' ? 'Même domaine, mais mention de licence non listée comme compatible' : overlap === 'near' ? 'Domaine voisin de ta licence' : 'Changement de domaine par rapport à ta licence';
    }
    details.push('Source : liste officielle des compatibilités mentions de licence → master');
  } else {
    base = overlap === 'same' ? 85 : overlap === 'near' ? 55 : 20;
    summary = overlap === 'same' ? 'Dans la continuité de ton domaine d’études' : overlap === 'near' ? 'Domaine voisin de tes études actuelles' : 'Changement de domaine (réorientation)';
  }
  if (p.level === 3 && o.ad && Object.keys(o.ad).length) {
    const origin = originOf(p.diploma);
    const share = o.ad[origin] ?? 0;
    const total = Object.values(o.ad).reduce((s, v) => s + (v ?? 0), 0);
    if (share >= 20) base += 10;
    else if (share === 0 && total > 0) base -= 15;
    if (x) details.push(share === 0 && total > 0 ? `Aucun admis 2025 ${ORIGIN_LABELS[origin]}` : `${fmtPct(share)} des admis 2025 étaient ${ORIGIN_LABELS[origin]}`);
  }
  if (p.level === 2) {
    const d = p.diploma;
    if (o.ty === 'but3') base += d === 'but' ? 15 : d === 'bts' ? -20 : -10;
    if (o.ty === 'l3') base += ['licence', 'cpge', 'deust'].includes(d) ? 10 : d === 'bts' ? -15 : 0;
    if (o.ty === 'lp') base += ['bts', 'but', 'deust'].includes(d) ? 10 : 0;
    if (o.ty === 'inge') base += ['cpge', 'but'].includes(d) ? 10 : d === 'bts' ? -10 : 0;
    if (o.ty === 'ecom') base += ['cpge', 'licence'].includes(d) ? 5 : 0;
  }
  return { score: Math.round(clamp(base)), confidence: 'data', summary, details };
};

/** Taux de référence et libellé selon les données disponibles pour l'origine de l'étudiant. */
function referenceRate(o: Offer, p: Profile, x = true): { rate: number; text: string; confidence: 'data' | 'estimate' } {
  if (p.level === 3 && o.ao) {
    const origin = originOf(p.diploma);
    const r = o.ao[origin];
    if (r != null) return { rate: r, text: x ? `Taux de proposition Mon Master 2025 pour les candidats ${ORIGIN_LABELS[origin]} : ${fmtPct(r)}` : '', confidence: 'data' };
  }
  if (o.ta != null) {
    const src = o.id.startsWith('ps-') ? 'Taux d’accès Parcoursup 2025' : 'Taux de proposition Mon Master 2025 (tous candidats)';
    return { rate: o.ta, text: x ? `${src} : ${fmtPct(o.ta)}` : '', confidence: 'data' };
  }
  const g = TYPES[o.ty].admissionGuess;
  return { rate: g, text: x ? `Pas de statistique publique : ordre de grandeur ${fmtPct(g)} pour ce type de formation` : '', confidence: 'estimate' };
}

/** Mention estimée au bac à partir de la moyenne (0 = sans mention … 4 = TB félicitations ; -1 = risque d'échec). */
export function mentionIndex(avg: number): number {
  if (avg < 10) return -1;
  if (avg < 12) return 0;
  if (avg < 14) return 1;
  if (avg < 16) return 2;
  if (avg < 18) return 3;
  return 4;
}

const scoreAdmission: Scorer = (o, p, _ctx, _m, _b, x) => {
  const ref = referenceRate(o, p, x);
  let q = percentile(p);
  if (p.level === 0 && o.mt) {
    const k = mentionIndex(p.average);
    const tot = o.mt.reduce((s, v) => s + v, 0) || 1;
    const dist = o.mt.map((v) => v / tot);
    q = k < 0 ? 0.02 : dist.slice(0, k).reduce((s, v) => s + v, 0) + dist[k] * 0.5;
  }
  const prob = admissionProbability(ref.rate / 100, q);
  const score = 100 * (1 - (1 - prob) ** 1.6);
  if (!x) return { score: Math.round(clamp(score)), confidence: ref.confidence, summary: '' };
  const details = [
    ref.text,
    p.level === 0 && o.mt
      ? `Ta mention estimée te place vers le ${Math.round(q * 100)}e centile des admis 2025`
      : `Ton niveau (moyenne ${fmt1(p.average)}/20${p.rank !== 'unknown' ? ', classement indiqué' : ''}) te situe vers le ${Math.round(q * 100)}e centile`
  ];
  return {
    score: Math.round(clamp(score)),
    confidence: ref.confidence,
    summary: `Chances estimées ≈ ${fmtPct(prob * 100)}`,
    details,
    source: o.id.startsWith('mm-') ? 'Mon Master 2025 (MESR-SIES)' : o.id.startsWith('ps-') ? 'Parcoursup 2025 (MESR-SIES)' : undefined
  };
};

const MENTION_MID = [11, 13, 15, 16.8, 18.5];

function expectedAverage(o: Offer, p: Profile, x = true): { value: number; text: string } {
  if (o.mt) {
    const tot = o.mt.reduce((s, v) => s + v, 0);
    if (tot > 0) {
      const v = o.mt.reduce((s, x, i) => s + x * MENTION_MID[i], 0) / tot;
      return { value: v, text: x ? `Niveau moyen des admis 2025 ≈ ${fmt1(v)}/20 (d’après leurs mentions au bac)` : '' };
    }
  }
  const ref = referenceRate(o, p, false);
  if (ref.confidence === 'data') {
    const v = 11.5 + 3.5 * (1 - ref.rate / 100);
    return { value: v, text: x ? `Niveau attendu ≈ ${fmt1(v)}/20 (formation ${ref.rate < 25 ? 'très sélective' : ref.rate < 50 ? 'sélective' : 'accessible'})` : '' };
  }
  const v = TYPES[o.ty].expectedAvg;
  return { value: v, text: x ? `Niveau attendu ≈ ${fmt1(v)}/20 (ordre de grandeur pour ce type de formation)` : '' };
}

const scoreMatieres: Scorer = (o, p, _ctx, _m, _b, x) => {
  const weights = aggregate<SubjectId>(o.dm, DOMAIN_SUBJECTS);
  let sw = 0;
  let sg = 0;
  const used: string[] = [];
  for (const [subj, w] of Object.entries(weights) as [SubjectId, number][]) {
    const g = p.subjects[subj];
    if (g == null || !w) continue;
    sw += w;
    sg += w * g;
    if (x) used.push(`${SUBJECTS.find((s) => s.id === subj)?.label} : ${fmt1(g)}`);
  }
  const exp = expectedAverage(o, p, x);
  const grade = sw > 0 ? sg / sw : p.average;
  const score = clamp(70 + (grade - exp.value) * 12);
  if (!x) return { score: Math.round(score), confidence: sw > 0 ? 'data' : 'estimate', summary: '' };
  return {
    score: Math.round(score),
    confidence: sw > 0 ? 'data' : 'estimate',
    summary: sw > 0 ? `Tes notes dans les matières clés : ${fmt1(grade)}/20` : `Moyenne générale utilisée : ${fmt1(grade)}/20`,
    details: [...(used.length ? [`Matières prises en compte : ${used.join(' · ')}`] : ['Renseigne tes notes par matière pour affiner']), exp.text]
  };
};

const scoreCompetences: Scorer = (o, p, _ctx, _m, _b, x) => {
  const req = aggregate<SkillId>(o.dm, DOMAIN_SKILLS);
  const add = (extra?: Partial<Record<SkillId, number>>) => {
    for (const [k, v] of Object.entries(extra ?? {}) as [SkillId, number][]) req[k] = (req[k] ?? 0) + v;
  };
  add(TYPE_SKILLS[o.ty]);
  if (isApprentice(o, p)) add(ALTERNANCE_SKILLS);
  let sw = 0;
  let ss = 0;
  const strong: string[] = [];
  const weak: string[] = [];
  for (const [k, r] of Object.entries(req) as [SkillId, number][]) {
    if (!r) continue;
    const target = Math.min(5, 2 + r);
    const user = p.skills[k] ?? 3;
    const gap = Math.max(0, target - user);
    sw += r;
    ss += r * (1 - gap / 4);
    if (!x) continue;
    const label = SKILLS.find((s) => s.id === k)?.label.toLowerCase() ?? k;
    if (r >= 2 && gap === 0) strong.push(label);
    if (gap >= 1.5) weak.push(`${label} (attendu ${Math.round(target)}/5, toi ${user}/5)`);
  }
  const score = sw ? (100 * ss) / sw : 50;
  if (!x) return { score: Math.round(clamp(score)), confidence: 'estimate', summary: '' };
  const details: string[] = [];
  if (strong.length) details.push(`Points forts : ${strong.slice(0, 4).join(', ')}`);
  if (weak.length) details.push(`À renforcer : ${weak.slice(0, 3).join(' ; ')}`);
  return {
    score: Math.round(clamp(score)),
    confidence: 'estimate',
    summary: weak.length ? `${weak.length} compétence${weak.length > 1 ? 's' : ''} à renforcer` : 'Tes compétences couvrent bien les attentes',
    details
  };
};

const INS_LEVEL = ['pour ce diplôme dans cet établissement', 'moyenne nationale de cette mention', 'moyenne de l’établissement (tous diplômes de ce type)'];

const scoreInsertion: Scorer = (o, _p, _ctx, _m, _b, x) => {
  if (!o.in) return { score: null, confidence: 'na', summary: 'Pas de donnée d’insertion publique pour cette formation' };
  const [e, st, w, level, year, n] = o.in;
  const parts: [number, number][] = [];
  if (e != null) parts.push([lerp(e, [[30, 0], [47, 25], [67, 60], [87, 100]]), 0.6]);
  if (st != null) parts.push([lerp(st, [[30, 10], [50, 35], [70, 65], [90, 100]]), 0.25]);
  if (w != null) parts.push([lerp(w, [[1600, 10], [2200, 35], [2500, 60], [3000, 100]]), 0.15]);
  const sw = parts.reduce((s, [, k]) => s + k, 0);
  const score = sw ? parts.reduce((s, [v, k]) => s + v * k, 0) / sw : null;
  if (!x) return { score: score == null ? null : Math.round(score), confidence: level <= 1 ? 'data' : 'estimate', summary: '' };
  const details = [
    `Emplois stables : ${fmtPct(st)}${w != null ? ` · salaire net médian : ${fmtEuro(w)}/mois` : ''}`,
    `Diplômés ${year} (${fmtInt(n)} sortants), ${INS_LEVEL[level]}`
  ];
  return {
    score: score == null ? null : Math.round(score),
    confidence: level <= 1 ? 'data' : 'estimate',
    summary: `${fmtPct(e)} en emploi salarié 18 mois après le diplôme`,
    details,
    source: 'InserSup (MESR-SIES)'
  };
};

const scoreBudget: Scorer = (o, _p, _ctx, m, b, x) => {
  const score = lerp(b.balance, [[-500, 0], [-250, 20], [-100, 45], [0, 70], [150, 90], [300, 100]]);
  const estimated = o.fs === 'e' || (m.moves && o.commune.loyerM2 == null);
  if (!x) return { score: Math.round(score), confidence: estimated ? 'estimate' : 'data', summary: '' };
  return {
    score: Math.round(score),
    confidence: estimated ? 'estimate' : 'data',
    summary: b.balance >= 0 ? `Il te reste ≈ ${fmtEuro(b.balance)} par mois` : `Il te manque ≈ ${fmtEuro(-b.balance)} par mois`,
    details: [`Ressources ≈ ${fmtEuro(b.resources)} · dépenses ≈ ${fmtEuro(b.costs)} par mois`]
  };
};

const scoreImmobilier: Scorer = (o, _p, ctx, m, _b, x) => {
  if (!m.moves) return { score: null, confidence: 'na', summary: 'Tu restes chez toi : non concerné' };
  const m2 = o.commune.loyerM2 ?? ctx.medianRentM2;
  if (!x) return { score: Math.round(lerp(m2, [[11, 100], [14, 80], [17, 60], [21, 40], [27, 20], [33, 5]])), confidence: o.commune.loyerM2 != null ? 'data' : 'estimate', summary: '' };
  return {
    score: Math.round(lerp(m2, [[11, 100], [14, 80], [17, 60], [21, 40], [27, 20], [33, 5]])),
    confidence: o.commune.loyerM2 != null ? 'data' : 'estimate',
    summary: `${fmt1(m2)} €/m² charges comprises à ${o.commune.nom}`,
    details: [
      `Studio de ${STUDIO_M2} m² ≈ ${fmtEuro(m2 * STUDIO_M2)} par mois`,
      o.commune.loyerCommunal ? 'Indicateur calculé à l’échelle de la commune' : 'Indicateur estimé sur un groupe de communes voisines'
    ],
    source: 'Carte des loyers 2025 (ANIL)'
  };
};

const TENSION_SCORE: Record<string, number> = { Abis: 20, A: 35, B1: 55, B2: 75, C: 85 };

const scoreLogement: Scorer = (o, p, _ctx, m, _b, x) => {
  if (!m.moves) return { score: null, confidence: 'na', summary: 'Tu restes chez toi : non concerné' };
  const n = o.commune.crous10;
  const crousScore = lerp(n, [[0, 0], [1, 40], [3, 65], [8, 85], [20, 100]]);
  const tension = TENSION_SCORE[o.commune.zone ?? ''] ?? 60;
  const [wc, wt] = p.housing === 'crous' ? [0.7, 0.3] : [0.3, 0.7];
  const bonus = o.hb === 1 ? 15 : o.hb === 2 ? 10 : 0;
  if (!x) return { score: Math.round(clamp(wc * crousScore + wt * tension + bonus)), confidence: 'data', summary: '' };
  const details = [
    n > 0 ? `Résidence Crous la plus proche à ${fmtKm(o.commune.crousNearestKm)}` : `Résidence Crous la plus proche à ${fmtKm(o.commune.crousNearestKm)}`,
    `Zonage ABC : ${o.commune.zone ?? 'non renseigné'}`
  ];
  if (o.hb === 1) details.push('L’établissement propose un internat');
  if (o.hb === 2) details.push('L’établissement signale des solutions d’hébergement (résidence, partenariats)');
  return {
    score: Math.round(clamp(wc * crousScore + wt * tension + bonus)),
    confidence: 'data',
    summary: `${n} résidence${n > 1 ? 's' : ''} Crous à moins de 10 km · zone ${o.commune.zone ?? '?'}`,
    details,
    source: 'Crous (CNOUS) · zonage ABC 2026'
  };
};

const scoreTrajet: Scorer = (_o, p, _ctx, m, _b, x) => {
  if (!p.home) return { score: 70, confidence: 'estimate', summary: 'Indique ta commune pour calculer le trajet' };
  if (m.tooFar) {
    if (!x) return { score: 0, confidence: 'estimate', summary: '' };
    return {
      score: 0,
      confidence: 'estimate',
      summary: `≈ ${fmtDuration(m.commuteMin)} de trajet (ton maximum : ${fmtDuration(p.maxCommuteMin)}) et pas de déménagement envisagé`
    };
  }
  if (!m.moves) {
    const r = m.commuteMin / p.maxCommuteMin;
    if (!x) return { score: Math.round(lerp(r, [[0, 100], [0.4, 100], [1, 50]])), confidence: 'estimate', summary: '' };
    return {
      score: Math.round(lerp(r, [[0, 100], [0.4, 100], [1, 50]])),
      confidence: 'estimate',
      summary: `≈ ${fmtDuration(m.commuteMin)} en ${TRANSPORT_LABELS[p.transport].toLowerCase()} (${m.distanceKm < 1 ? 'trajet urbain dans ta commune' : `${fmtKm(m.distanceKm)} à vol d’oiseau`})`
    };
  }
  const d = m.distanceKm;
  const penalty = d > 700 ? 30 : d > 400 ? 20 : d > 150 ? 10 : 0;
  if (!x) return { score: 75 - penalty, confidence: 'estimate', summary: '' };
  return {
    score: 75 - penalty,
    confidence: 'estimate',
    summary: `Tu déménages, à ${fmtKm(d)} de chez toi · trajet local ≈ ${fmtDuration(m.commuteMin)}`
  };
};

/** Charge hebdomadaire (cours et travail perso, trajets pondérés, job) et ratio énergie / charge. */
function energyBalance(o: Offer, p: Profile, m: Mobility) {
  const apprentice = isApprentice(o, p);
  const load = apprentice ? ALTERNANCE_LOAD : TYPES[o.ty].load;
  const pen = PENIBILITE[m.localMode];
  const commuteLoad = m.weeklyCommuteH * pen;
  const job = apprentice ? 0 : p.jobHours;
  const total = load + commuteLoad + job;
  const ratio = p.weeklyEnergyH / total;
  return { apprentice, load, pen, commuteLoad, job, total, ratio, score: Math.round(lerp(ratio, [[0.6, 0], [0.8, 35], [0.95, 65], [1.1, 85], [1.3, 100]])) };
}

const scoreEnergie: Scorer = (o, p, _ctx, m, _b, x) => {
  const { apprentice, load, pen, commuteLoad, job, total, ratio, score } = energyBalance(o, p, m);
  if (!x) return { score, confidence: 'estimate', summary: '' };
  return {
    score,
    confidence: 'estimate',
    summary: `Charge ≈ ${fmtInt(total)} h/sem. pour ${fmtInt(p.weeklyEnergyH)} h d’énergie (ratio ${fmt1(ratio)})`,
    details: [
      `${apprentice ? 'Alternance (entreprise + cours)' : 'Cours et travail personnel'} ≈ ${fmtInt(load)} h`,
      `Trajets ≈ ${fmt1(m.weeklyCommuteH)} h, comptés ${fmt1(commuteLoad)} h (pénibilité ${fmt1(pen)})`,
      ...(job ? [`Job étudiant : ${fmtInt(job)} h`] : [])
    ]
  };
};

const scoreCarbone: Scorer = (_o, _p, _ctx, m, _b, x) => ({
  score: Math.round(lerp(m.co2KgYear, [[0, 100], [50, 95], [150, 80], [400, 55], [800, 30], [1500, 10], [2500, 0]])),
  confidence: 'estimate',
  summary: x ? `≈ ${fmtInt(m.co2KgYear)} kg CO2e par an` : '',
  details: !x ? undefined : [m.moves ? `Trajets locaux (${TRANSPORT_LABELS[m.localMode].toLowerCase()}) et ${HOME_TRIPS} allers-retours chez toi par an` : `${TRANSPORT_LABELS[m.localMode]} : ${fmtInt(2 * m.roadKm * 5 * WEEKS)} km par an`],
  source: 'ADEME Impact CO2'
});

// ------------------------------------------------------------------ projet, métiers et enjeux

const offerStemCache = new WeakMap<Offer, Set<string>>();
/** Racines des mots décrivant une formation : intitulé, parcours, secteur, mots-clés. */
export function offerStems(o: Offer): Set<string> {
  let s = offerStemCache.get(o);
  if (!s) {
    s = stems(`${o.nm} ${o.pc ?? ''} ${o.sector ?? ''} ${o.keywords ?? ''}`);
    offerStemCache.set(o, s);
  }
  return s;
}
const offerTextCache = new WeakMap<Offer, string>();
function offerText(o: Offer): string {
  let t = offerTextCache.get(o);
  if (t == null) {
    t = norm(`${o.nm} ${o.pc ?? ''} ${o.sector ?? ''} ${o.keywords ?? ''}`);
    offerTextCache.set(o, t);
  }
  return t;
}

/** Rareté de chaque racine parmi les formations : ln(N / nombre de formations qui la contiennent). */
export function computeIdf(offers: Offer[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const o of offers) for (const s of offerStems(o)) df.set(s, (df.get(s) ?? 0) + 1);
  const n = Math.max(1, offers.length);
  return new Map([...df].map(([s, d]) => [s, Math.log(n / d)]));
}

let userTextMemo: { text: string; stems: Set<string>; labels: Map<string, string> } = { text: '\u0000', stems: new Set(), labels: new Map() };
function userText(p: Profile) {
  const text = `${p.projectText} ${p.subject} ${p.missions}`.trim();
  if (userTextMemo.text !== text) userTextMemo = { text, stems: stems(text), labels: stemLabels(text) };
  return userTextMemo;
}

const scoreThematique: Scorer = (o, p, ctx, _m, _b, x) => {
  const u = userText(p);
  if (!u.text) return { score: null, confidence: 'na', summary: 'Décris ton projet ou ton sujet pour activer ce critère' };
  const idf = ctx.idf;
  // Seuls les mots présents dans au moins une formation peuvent départager les offres.
  const useful = [...u.stems].filter((s) => !idf || idf.has(s));
  if (!useful.length) return { score: null, confidence: 'na', summary: 'Aucun mot de ton projet ne figure dans les intitulés des formations' };
  const os = offerStems(o);
  let total = 0;
  let hit = 0;
  const matched: string[] = [];
  for (const s of useful) {
    const w = idf?.get(s) ?? 2;
    total += w;
    if (os.has(s)) {
      hit += w;
      matched.push(s);
    }
  }
  const ratio = total ? hit / total : 0;
  const score = Math.round(clamp(15 + ratio * 170));
  if (!x) return { score, confidence: 'estimate', summary: '' };
  const words = matched.sort((a, b) => (idf?.get(b) ?? 0) - (idf?.get(a) ?? 0)).slice(0, 6).map((s) => u.labels.get(s) ?? s);
  return {
    score,
    confidence: 'estimate',
    summary: words.length ? `Mots en commun : ${words.join(', ')}` : 'Peu de points communs avec ton projet et ton sujet',
    details: [
      `${matched.length} mot${matched.length > 1 ? 's' : ''} sur ${useful.length} de ta description se retrouve${matched.length > 1 ? 'nt' : ''} dans la formation (les mots rares comptent davantage)`,
      ...(o.keywords ? [`Mots-clés de la formation : ${o.keywords.slice(0, 160)}${o.keywords.length > 160 ? '…' : ''}`] : [])
    ]
  };
};

const scoreEntreprise: Scorer = (o, p, ctx, _m, _b, x) => {
  if (!isAlternant(p) || p.company.canKeep === 'non') {
    return { score: null, confidence: 'na', summary: 'Non concerné : tu n’es pas en alternance avec une entreprise qui peut te garder' };
  }
  const name = p.company.name.trim() || 'ton entreprise';
  if ((o.al ?? 0) < 1) {
    return { score: 10, confidence: 'data', summary: x ? `Pas d’alternance identifiée : tu ne pourrais pas rester chez ${name}` : '' };
  }
  const place = p.company.place;
  const dist = place ? haversineKm(place.lat, place.lon, o.lat, o.lon) : null;
  let score = dist == null ? 60 : lerp(dist, [[0, 100], [30, 100], [80, 70], [200, 40], [500, 15]]);
  const reach = o.fo ? ctx.jobs?.byFor.get(o.fo) ?? [] : [];
  const sameSector = p.company.sector != null && reach.some((m) => m.sectors.includes(p.company.sector!));
  if (sameSector) score += 10;
  score = Math.round(clamp(score));
  if (!x) return { score, confidence: dist == null ? 'estimate' : 'data', summary: '' };
  return {
    score,
    confidence: dist == null ? 'estimate' : 'data',
    summary: dist == null ? 'Alternance possible (indique la commune de ton entreprise pour estimer la distance)' : `Alternance possible, à ${fmtKm(dist)} de ${name}`,
    details: [
      ...(p.company.canKeep === 'peut-etre' ? ['Ton entreprise n’a pas encore confirmé qu’elle peut te garder'] : []),
      ...(sameSector && ctx.jobs ? [`Mène à des métiers du secteur de ton entreprise : ${ctx.jobs.sectors[p.company.sector!]}`] : []),
      'Au-delà d’une heure de trajet, l’alternance reste possible avec un rythme par périodes longues (semaines entières).'
    ]
  };
};

// Mots trop génériques dans les noms de métiers pour rapprocher un métier d'une formation.
const GENERIC_TITLES = new Set(
  'ingeni techni respon charge assist agent chef direct consei consul gestio specia expert operat employ attach cadre adjoin profes'.split(' ')
);

const scoreMetiers: Scorer = (o, p, ctx, _m, _b, x) => {
  const jobs = ctx.jobs;
  if (!jobs || (!p.metiers.length && !p.sectors.length)) {
    return { score: null, confidence: 'na', summary: 'Choisis des métiers ou des secteurs pour activer ce critère' };
  }
  const reach = o.fo ? jobs.byFor.get(o.fo) ?? [] : [];
  const targets = p.metiers.map((id) => jobs.byId.get(id)).filter((m): m is Metier => !!m);
  const reachLine = (list: Metier[]) => `Métiers accessibles selon l’ONISEP : ${list.slice(0, 5).map((m) => m.name).join(', ')}${list.length > 5 ? '…' : ''}`;

  const direct = reach.filter((m) => p.metiers.includes(m.id));
  if (direct.length) {
    return {
      score: 100,
      confidence: 'data',
      summary: x ? `Mène au${direct.length > 1 ? 'x' : ''} métier${direct.length > 1 ? 's' : ''} : ${direct.slice(0, 3).map((m) => m.name).join(', ')}` : '',
      details: x ? [reachLine(reach)] : undefined,
      source: 'Fiches métiers ONISEP'
    };
  }
  const wanted = new Set([...p.sectors, ...targets.flatMap((t) => t.sectors)]);
  const inSector = reach.filter((m) => m.sectors.some((s) => wanted.has(s)));
  if (inSector.length) {
    const sector = jobs.sectors[inSector[0].sectors.find((s) => wanted.has(s))!];
    return {
      score: 75,
      confidence: 'data',
      summary: x ? `Mène à des métiers du secteur « ${sector} »` : '',
      details: x ? [`Par exemple : ${inSector.slice(0, 4).map((m) => m.name).join(', ')}`] : undefined,
      source: 'Fiches métiers ONISEP'
    };
  }
  const os = offerStems(o);
  const close = targets.find((t) => [...stems(t.name)].some((s) => !GENERIC_TITLES.has(s) && os.has(s)));
  if (close) {
    return {
      score: 55,
      confidence: 'estimate',
      summary: x ? `Thématique proche du métier « ${close.name} »` : '',
      details: x && reach.length ? [reachLine(reach)] : undefined
    };
  }
  const domains = new Set<DomainId>([...targets.flatMap((t) => t.domains), ...p.sectors.flatMap((s) => sectorDomains(jobs.sectors[s] ?? ''))]);
  if (o.dm.some((d) => domains.has(d))) {
    return {
      score: 35,
      confidence: 'estimate',
      summary: x ? 'Même domaine que tes métiers visés, sans lien direct' : '',
      details: x && reach.length ? [reachLine(reach)] : undefined
    };
  }
  return {
    score: 5,
    confidence: reach.length ? 'data' : 'estimate',
    summary: x ? 'Ne mène pas aux métiers ou secteurs que tu as choisis' : '',
    details: x && reach.length ? [reachLine(reach)] : undefined
  };
};

const RE_INTERNATIONAL = /international|europe|global|anglais|english|langues etrangeres|erasmus|mondial|monde|world|cross cultural|interculturel/;
const RE_ENTREPRENDRE = /entrepreneu|creation d entreprise|start up|startup|innovation|\bpme\b|independant|business developer|reprise d entreprise/;
const RE_PUBLIC = /\bpublic|publique|administration|territori|collectivit|fonction publique|enseignement|education|professorat|meef|defense|police|justice|sante publique/;
const RE_RECHERCHE = /recherche|research|fondamental|theorique|doctorat|laboratoire|\bphd\b|modelisation/;
const RE_IMPACT = /durable|transition|environnement|ecolog|climat|biodiversit|renouvelable|solidaire|economie sociale|humanitaire|\bsocial|sante|inclusi|handicap|developpement local/;

function statutShare(reach: Metier[], jobs: JobsIndex | undefined, re: RegExp): number {
  if (!jobs || !reach.length) return 0;
  const hits = reach.filter((m) => m.statuts.some((i) => re.test(jobs.statuts[i] ?? ''))).length;
  return hits / reach.length;
}

/** Note de 0 à 100 d'un enjeu pour une formation, ou null si l'information manque. */
function goalScore(g: GoalId, o: Offer, p: Profile, ctx: ScoringContext, m: Mobility): number | null {
  const text = offerText(o);
  const reach = o.fo ? ctx.jobs?.byFor.get(o.fo) ?? [] : [];
  switch (g) {
    case 'emploi':
      return o.in?.[0] != null ? lerp(o.in[0], [[30, 0], [50, 30], [67, 60], [87, 100]]) : null;
    case 'salaire': {
      if (o.in?.[2] != null) return lerp(o.in[2], [[1600, 0], [2200, 40], [2500, 65], [3000, 100]]);
      const proxy: Partial<Record<Offer['ty'], number>> = { inge: 80, ecom: 75, msc: 65, master: 60, ecole5: 55, de: 55, lp: 40, but3: 40, bachelor: 40, l3: 35 };
      return proxy[o.ty] ?? null;
    }
    case 'stabilite':
      return o.in?.[1] != null ? lerp(o.in[1], [[30, 0], [60, 50], [90, 100]]) : null;
    case 'international':
      return RE_INTERNATIONAL.test(text) ? 100 : o.ty === 'msc' || o.ty === 'ecom' ? 70 : o.dm.includes('lettres') ? 55 : 25;
    case 'entreprendre':
      if (RE_ENTREPRENDRE.test(text)) return 100;
      if (statutShare(reach, ctx.jobs, /independant|artisan|liberal/) >= 0.3) return 75;
      return o.ty === 'ecom' || o.dm.includes('gestion') ? 55 : 25;
    case 'public':
      if (RE_PUBLIC.test(text)) return 100;
      return statutShare(reach, ctx.jobs, /fonctionnaire/) >= 0.3 ? 80 : 25;
    case 'recherche': {
      const research = RE_RECHERCHE.test(text);
      if (o.ty === 'master') return ((o.st ?? 0) === 0 ? 60 : 45) + (research ? 40 : 0);
      if (o.ty === 'inge' || o.ty === 'l3') return research ? 70 : 45;
      return research ? 50 : 15;
    }
    case 'impact':
      if (o.dm.includes('envir') || o.dm.includes('agri')) return 100;
      if (RE_IMPACT.test(text)) return 90;
      return o.dm.includes('sante') ? 80 : 25;
    case 'alternance':
      return (o.al ?? 0) >= 1 ? 100 : 10;
    case 'equilibre':
      return energyBalance(o, p, m).score;
    case 'proximite':
      if (m.tooFar) return 0;
      if (!m.moves) return Number.isFinite(m.distanceKm) && m.distanceKm > 50 ? 70 : 100;
      return m.distanceKm < 150 ? 55 : m.distanceKm < 400 ? 35 : 15;
  }
}

const scoreEnjeux: Scorer = (o, p, ctx, m, _b, x) => {
  if (!p.goals.length) return { score: null, confidence: 'na', summary: 'Choisis tes enjeux pour plus tard pour activer ce critère' };
  const parts = p.goals.map((g) => [g, goalScore(g, o, p, ctx, m)] as const).filter((e): e is readonly [GoalId, number] => e[1] != null);
  if (!parts.length) return { score: null, confidence: 'na', summary: 'Pas assez d’informations pour évaluer tes enjeux sur cette formation' };
  const score = Math.round(parts.reduce((s, [, v]) => s + v, 0) / parts.length);
  const dataGoals: GoalId[] = ['emploi', 'stabilite', 'alternance', 'equilibre', 'proximite'];
  const confidence = parts.every(([g]) => dataGoals.includes(g)) ? 'data' : 'estimate';
  if (!x) return { score, confidence, summary: '' };
  const sorted = [...parts].sort((a, b) => b[1] - a[1]);
  const good = sorted.filter(([, v]) => v >= 70).map(([g]) => GOAL_BY_ID[g].label.toLowerCase());
  const weak = sorted.filter(([, v]) => v < 40).map(([g]) => GOAL_BY_ID[g].label.toLowerCase());
  return {
    score,
    confidence,
    summary: good.length ? `Sert bien : ${good.slice(0, 3).join(', ')}` : weak.length ? `Répond mal à : ${weak.slice(0, 2).join(', ')}` : 'Répond moyennement à tes enjeux',
    details: [
      ...sorted.map(([g, v]) => `${GOAL_BY_ID[g].label} : ${Math.round(v)}/100`),
      ...p.goals.filter((g) => !parts.some(([k]) => k === g)).map((g) => `${GOAL_BY_ID[g].label} : pas de donnée pour cette formation`)
    ]
  };
};

const SCORERS: Record<CriterionId, Scorer> = {
  interet: scoreInteret,
  format: scoreFormat,
  thematique: scoreThematique,
  entreprise: scoreEntreprise,
  metiers: scoreMetiers,
  enjeux: scoreEnjeux,
  parcours: scoreParcours,
  admission: scoreAdmission,
  matieres: scoreMatieres,
  competences: scoreCompetences,
  insertion: scoreInsertion,
  budget: scoreBudget,
  immobilier: scoreImmobilier,
  logement: scoreLogement,
  trajet: scoreTrajet,
  energie: scoreEnergie,
  carbone: scoreCarbone
};

/** Calcule les 17 sous-scores d'une offre pour un profil (indépendant des pondérations). */
export function assess(o: Offer, p: Profile, ctx: ScoringContext, explain = true): Assessment {
  const mobility = computeMobility(o, p);
  const budget = computeBudget(o, p, mobility, ctx);
  const scores = {} as Record<CriterionId, CriterionScore>;
  for (const c of CRITERIA) {
    const r = SCORERS[c.id](o, p, ctx, mobility, budget, explain) as CriterionScore;
    r.id = c.id;
    scores[c.id] = r;
  }
  const alerts: string[] = [];
  if (!explain) return { offer: o, scores, mobility, budget, alerts };
  if (mobility.tooFar) alerts.push('Trajet plus long que ton maximum');
  if (budget.balance < -100) alerts.push(`Budget : il manque ≈ ${fmtEuro(-budget.balance)}/mois`);
  if ((scores.admission.score ?? 100) < 20) alerts.push('Admission très sélective pour ton profil');
  if (o.al === 2 && p.alternance === 'non') alerts.push('Uniquement en alternance');
  if (!isApprentice(o, p) && (o.st ?? 0) >= 1 && (o.fe ?? 0) >= 5000) alerts.push(`Frais de scolarité élevés (${fmtEuro(o.fe)}/an)`);
  return { offer: o, scores, mobility, budget, alerts };
}

/** Taux de compatibilité : moyenne des sous-scores pondérée par l'importance donnée à chaque critère. */
export function combine(a: Assessment, w: Weights): { total: number; reliability: number } {
  let sum = 0;
  let sw = 0;
  let dataW = 0;
  for (const c of CRITERIA) {
    const s = a.scores[c.id];
    const wi = w[c.id] ?? 0;
    if (s.score == null || wi <= 0) continue;
    sum += wi * s.score;
    sw += wi;
    if (s.confidence === 'data') dataW += wi;
  }
  return { total: sw ? Math.round(sum / sw) : 0, reliability: sw ? dataW / sw : 0 };
}

export function evaluate(o: Offer, p: Profile, w: Weights, ctx: ScoringContext): Evaluation {
  const a = assess(o, p, ctx);
  return { ...a, ...combine(a, w) };
}
