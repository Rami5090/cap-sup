const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

export const fmtInt = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '–' : nf0.format(Math.round(n)));
export const fmt1 = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '–' : nf1.format(n));
export const fmtEuro = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '–' : `${nf0.format(Math.round(n))} €`);
export const fmtPct = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? '–' : `${nf0.format(Math.round(n))} %`);
export const fmtKm = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? '–' : n < 10 ? `${nf1.format(n)} km` : `${nf0.format(Math.round(n))} km`;

export function fmtDuration(min: number | null | undefined): string {
  if (min == null || !Number.isFinite(min)) return '–';
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
}

export function plural(n: number, one: string, many: string): string {
  return `${fmtInt(n)} ${Math.abs(n) >= 2 ? many : one}`;
}

/** Couleur sémantique d'un score de 0 à 100. */
export function scoreTone(score: number | null | undefined): 'great' | 'good' | 'fair' | 'weak' | 'none' {
  if (score == null) return 'none';
  if (score >= 75) return 'great';
  if (score >= 60) return 'good';
  if (score >= 45) return 'fair';
  return 'weak';
}
