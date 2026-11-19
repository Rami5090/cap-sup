import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS } from './criteria';
import { defaultProfile } from './profile';
import {
  admissionProbability, assess, combine, computeBudget, computeMobility, evaluate, lerp, mentionIndex, percentile,
  type ScoringContext
} from './scoring';
import type { Commune, Offer, Profile } from './types';

const lille: Commune = {
  code: '59350', nom: 'Lille', lat: 50.63, lon: 3.06, loyerM2: 17.5, loyerCommunal: true, zone: 'A',
  crous10: 25, crousNearestKm: 0.6, dep: '59', pop: 236000
};
const paris: Commune = { ...lille, code: '75056', nom: 'Paris', lat: 48.8589, lon: 2.347, loyerM2: 33.6, zone: 'Abis', crous10: 106, dep: '75', pop: 2100000 };

function offer(over: Partial<Offer> = {}): Offer {
  return {
    id: 'mm-TEST', ty: 'master', nm: 'Informatique', et: 0, cm: 0, dm: ['info'], al: 0, st: 0, fe: 255, fs: 'o', cy: 2,
    en: [3], ta: 30, ao: { l3: 40, but: 10 }, ad: { l3: 80, but: 10, au: 10 }, in: [80, 85, 2600, 0, 2024, 100],
    etab: 'Université de Lille', uai: '0597239Y', commune: lille, lat: lille.lat, lon: lille.lon,
    url: 'https://monmaster.gouv.fr/', urlLabel: 'Fiche Mon Master', ...over
  };
}

const ctx: ScoringContext = {
  licenceToMasters: new Map([['informatique', new Set(['informatique', 'miage'])]]),
  medianRentM2: 17.2
};

function profile(over: Partial<Profile> = {}): Profile {
  return {
    ...defaultProfile(3),
    home: { nom: 'Lille', code: '59350', dep: '59', lat: 50.63, lon: 3.06 },
    currentDomains: ['info'],
    licenceMention: 'informatique',
    interests: { info: 3 },
    ...over
  };
}

describe('outils', () => {
  it('interpole linéairement et borne aux extrémités', () => {
    const pts: [number, number][] = [[0, 0], [10, 100]];
    expect(lerp(-5, pts)).toBe(0);
    expect(lerp(5, pts)).toBe(50);
    expect(lerp(50, pts)).toBe(100);
  });

  it('modèle d’admission : q = 0,5 renvoie le taux observé, monotone en q', () => {
    expect(admissionProbability(0.3, 0.5)).toBeCloseTo(0.3, 5);
    expect(admissionProbability(0.3, 0.9)).toBeGreaterThan(0.3);
    expect(admissionProbability(0.3, 0.1)).toBeLessThan(0.3);
    expect(admissionProbability(0, 0.9)).toBe(0);
    expect(admissionProbability(1, 0.1)).toBe(1);
  });

  it('mention estimée selon la moyenne', () => {
    expect(mentionIndex(9)).toBe(-1);
    expect(mentionIndex(11)).toBe(0);
    expect(mentionIndex(14.5)).toBe(2);
    expect(mentionIndex(18.2)).toBe(4);
  });

  it('un meilleur classement augmente le centile', () => {
    expect(percentile(profile({ rank: 'top10' }))).toBeGreaterThan(percentile(profile({ rank: 'mid' })));
  });
});

describe('mobilité', () => {
  it('pas de déménagement pour une formation dans la même ville', () => {
    const m = computeMobility(offer(), profile());
    expect(m.moves).toBe(false);
    expect(m.commuteMin).toBeLessThan(30);
  });

  it('déménage si le trajet dépasse le maximum et que c’est accepté', () => {
    const m = computeMobility(offer({ commune: paris, lat: paris.lat, lon: paris.lon }), profile());
    expect(m.distanceKm).toBeGreaterThan(190);
    expect(m.moves).toBe(true);
    expect(m.tooFar).toBe(false);
  });

  it('signale « trop loin » si l’étudiant ne veut pas déménager', () => {
    const m = computeMobility(offer({ commune: paris, lat: paris.lat, lon: paris.lon }), profile({ canMove: false }));
    expect(m.tooFar).toBe(true);
  });
});

describe('budget', () => {
  it('exonère le boursier des droits d’inscription et de la CVEC dans le public', () => {
    const p = profile({ bourse: '4' });
    const o = offer();
    const b = computeBudget(o, p, computeMobility(o, p), ctx);
    expect(b.lines.some((l) => l.label.startsWith('Frais de scolarité'))).toBe(false);
    expect(b.lines.some((l) => l.label.startsWith('CVEC'))).toBe(false);
    expect(b.lines.find((l) => l.label.startsWith('Bourse'))?.amount).toBeCloseTo(458.7, 1);
  });

  it('compte le loyer seulement en cas de déménagement', () => {
    const p = profile({ housing: 'studio' });
    const local = offer();
    const far = offer({ commune: paris, lat: paris.lat, lon: paris.lon });
    const bLocal = computeBudget(local, p, computeMobility(local, p), ctx);
    const bFar = computeBudget(far, p, computeMobility(far, p), ctx);
    expect(bLocal.lines.some((l) => l.label.startsWith('Studio'))).toBe(false);
    expect(bFar.lines.find((l) => l.label.startsWith('Studio'))?.amount).toBeCloseTo(33.6 * 25, 5);
    expect(bFar.balance).toBeLessThan(bLocal.balance);
  });

  it('ajoute le salaire d’apprenti et supprime les frais en alternance', () => {
    const p = profile({ alternance: 'oui', age: 22 });
    const o = offer({ al: 1, st: 2, fe: 9000, fs: 'n' });
    const b = computeBudget(o, p, computeMobility(o, p), ctx);
    expect(b.lines.find((l) => l.label.startsWith('Salaire'))?.amount).toBeCloseTo(1823.03 * 0.53, 1);
    expect(b.lines.some((l) => l.label.startsWith('Frais'))).toBe(false);
  });
});

describe('critères et taux de compatibilité', () => {
  it('reconnaît la compatibilité officielle licence → master', () => {
    const a = assess(offer(), profile(), ctx);
    expect(a.scores.parcours.score).toBe(100);
    const other = assess(offer({ nm: 'Droit public', dm: ['droit'] }), profile(), ctx);
    expect(other.scores.parcours.score!).toBeLessThan(40);
  });

  it('met « non concerné » le coût de l’immobilier quand on reste chez soi', () => {
    const a = assess(offer(), profile(), ctx);
    expect(a.scores.immobilier.score).toBeNull();
    expect(a.scores.logement.score).toBeNull();
  });

  it('le taux est une moyenne pondérée des sous-scores applicables', () => {
    const a = assess(offer(), profile(), ctx);
    const w = { ...DEFAULT_WEIGHTS };
    let s = 0;
    let sw = 0;
    for (const [k, v] of Object.entries(a.scores)) {
      const wi = w[k as keyof typeof w];
      if (v.score == null || !wi) continue;
      s += wi * v.score;
      sw += wi;
    }
    expect(combine(a, w).total).toBe(Math.round(s / sw));
  });

  it('un critère à poids 0 n’influence pas le résultat', () => {
    const a = assess(offer(), profile(), ctx);
    const w0 = { ...DEFAULT_WEIGHTS, carbone: 0 };
    const changed = { ...a, scores: { ...a.scores, carbone: { ...a.scores.carbone, score: 0 } } };
    expect(combine(changed, w0).total).toBe(combine(a, w0).total);
  });

  it('une formation alignée sur le profil obtient un meilleur taux qu’une formation éloignée', () => {
    const p = profile();
    const good = evaluate(offer(), p, DEFAULT_WEIGHTS, ctx);
    const bad = evaluate(
      offer({ nm: 'Histoire de l’art', dm: ['arts', 'shs'], ta: 5, ao: { l3: 3 }, in: [40, 30, null, 0, 2024, 50], commune: paris, lat: paris.lat, lon: paris.lon }),
      p, DEFAULT_WEIGHTS, ctx
    );
    expect(good.total).toBeGreaterThan(bad.total + 20);
    expect(good.total).toBeGreaterThanOrEqual(0);
    expect(good.total).toBeLessThanOrEqual(100);
  });

  it('les chances d’admission augmentent avec la moyenne', () => {
    const o = offer();
    const low = assess(o, profile({ average: 10.5 }), ctx).scores.admission.score!;
    const high = assess(o, profile({ average: 16 }), ctx).scores.admission.score!;
    expect(high).toBeGreaterThan(low);
  });
});
