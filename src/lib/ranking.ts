// Filtrage et classement des formations.
import { haversineKm } from './geo';
import { assess, combine, type Assessment, type ScoringContext } from './scoring';
import type { Filters } from './state.svelte';
import { norm } from './text';
import type { Offer, Profile, Weights } from './types';

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

/** Filtres « durs » appliqués avant le calcul (rayon, type, statut, alternance, domaines, recherche). */
export function prefilter(offers: Offer[], p: Profile, f: Filters): Offer[] {
  const tokens = norm(f.query).split(' ').filter(Boolean);
  const interests = Object.entries(p.interests).filter(([, v]) => v).map(([k]) => k);
  const useRadius = !!p.home && p.maxDistanceKm > 0;
  const alternanceOnly = f.alternanceOnly || p.alternance === 'uniquement';
  return offers.filter((o) => {
    if (useRadius && haversineKm(p.home!.lat, p.home!.lon, o.lat, o.lon) > p.maxDistanceKm) return false;
    if (f.types.length && !f.types.includes(o.ty)) return false;
    if (f.publicOnly && (o.st ?? 0) !== 0) return false;
    if (alternanceOnly && !((o.al ?? 0) >= 1)) return false;
    if (!f.allDomains && interests.length && !o.dm.some((d) => interests.includes(d))) return false;
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
