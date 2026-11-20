// Filtrage et classement des formations.
import { haversineKm } from './geo';
import { sectorDomains, type JobsIndex } from './jobs';
import { assess, combine, type Assessment, type ScoringContext } from './scoring';
import type { Filters } from './state.svelte';
import { norm } from './text';
import type { DomainId, Offer, Profile, Weights } from './types';

export interface Ranked {
  a: Assessment;
  total: number;
  reliability: number;
}

export type SortKey = 'score' | 'distance' | 'budget' | 'insertion' | 'admission';
export const SORT_LABELS: Record<SortKey, string> = {
  score: 'Compatibilité',
  distance: 'Distance',
  budget: 'Budget restant',
  insertion: 'Insertion pro',
  admission: 'Chances d’admission'
};

const searchCache = new WeakMap<Offer, string>();
function searchText(o: Offer): string {
  let s = searchCache.get(o);
  if (!s) {
    s = norm(`${o.nm} ${o.pc ?? ''} ${o.etab} ${o.commune.nom} ${o.sector ?? ''}`);
    searchCache.set(o, s);
  }
  return s;
}

/**
 * Domaines retenus pour le filtre : centres d'intérêt, domaines des métiers visés et des secteurs choisis.
 * Les formations qui mènent directement à un métier visé sont toujours gardées.
 */
export function focusDomains(p: Profile, jobs?: JobsIndex): { domains: Set<DomainId>; directFors: Set<number> } {
  const domains = new Set<DomainId>(Object.entries(p.interests).filter(([, v]) => v).map(([k]) => k as DomainId));
  const directFors = new Set<number>();
  if (jobs) {
    for (const id of p.metiers) {
      const m = jobs.byId.get(id);
      m?.domains.forEach((d) => domains.add(d));
      m?.fors.forEach((f) => directFors.add(f));
    }
    for (const s of p.sectors) sectorDomains(jobs.sectors[s] ?? '').forEach((d) => domains.add(d));
  }
  return { domains, directFors };
}

/** Filtres « durs » appliqués avant le calcul (rayon, type, statut, alternance, domaines, recherche). */
export function prefilter(offers: Offer[], p: Profile, f: Filters, jobs?: JobsIndex): Offer[] {
  const tokens = norm(f.query).split(' ').filter(Boolean);
  const { domains, directFors } = focusDomains(p, jobs);
  const useDomains = !f.allDomains && domains.size > 0;
  const useRadius = !!p.home && p.maxDistanceKm > 0;
  const alternanceOnly = f.alternanceOnly || p.alternance === 'uniquement';
  return offers.filter((o) => {
    if (useRadius && haversineKm(p.home!.lat, p.home!.lon, o.lat, o.lon) > p.maxDistanceKm) return false;
    if (f.types.length && !f.types.includes(o.ty)) return false;
    if (f.publicOnly && (o.st ?? 0) !== 0) return false;
    if (alternanceOnly && !((o.al ?? 0) >= 1)) return false;
    if (useDomains && !o.dm.some((d) => domains.has(d)) && !(o.fo && directFors.has(o.fo))) return false;
    if (tokens.length) {
      const hay = searchText(o);
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}

export function assessAll(offers: Offer[], p: Profile, ctx: ScoringContext): Assessment[] {
  return offers.map((o) => assess(o, p, ctx, false));
}

export function rankAll(assessed: Assessment[], w: Weights, f: Filters, sort: SortKey): Ranked[] {
  const out: Ranked[] = [];
  for (const a of assessed) {
    const c = combine(a, w);
    if (c.total < f.minScore) continue;
    if (f.withinBudget && a.budget.balance < 0) continue;
    out.push({ a, ...c });
  }
  const key: Record<SortKey, (r: Ranked) => number> = {
    score: (r) => -r.total,
    distance: (r) => (Number.isFinite(r.a.mobility.distanceKm) ? r.a.mobility.distanceKm : 1e9),
    budget: (r) => -r.a.budget.balance,
    insertion: (r) => -(r.a.offer.in?.[0] ?? -1),
    admission: (r) => -(r.a.scores.admission.score ?? -1)
  };
  const k = key[sort];
  return out.sort((x, y) => k(x) - k(y) || y.total - x.total);
}
