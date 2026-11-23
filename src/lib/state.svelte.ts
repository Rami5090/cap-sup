// État global de l'application (runes Svelte 5), sauvegardé dans le navigateur (et, si on l'active, dans la
// sauvegarde en ligne chiffrée : voir cloud.svelte.ts).
import { untrack } from 'svelte';
import { DEFAULT_WEIGHTS } from './criteria';
import { defaultProfile } from './profile';
import { scoped } from './scope';
import type { Level, OfferType, Profile, Weights } from './types';

const KEY = 'capsup:v1';

export interface Filters {
  query: string;
  types: OfferType[];
  publicOnly: boolean;
  alternanceOnly: boolean;
  withinBudget: boolean;
  allDomains: boolean;
  minScore: number;
  minProjet: number; // proximité minimale avec le projet et le sujet (critère « thématique »)
}

export const defaultFilters = (): Filters => ({
  query: '', types: [], publicOnly: false, alternanceOnly: false, withinBudget: false, allDomains: false, minScore: 0, minProjet: 0
});

export interface Saved {
  profile: Profile;
  weights: Weights;
  favorites: string[];
  compare: string[];
  completed: boolean;
  filters: Filters;
  theme: 'auto' | 'light' | 'dark';
  at?: number;
}
/** Ce qui part dans la sauvegarde en ligne : tout, sauf le thème (propre à chaque appareil). */
export type Synced = Omit<Saved, 'theme' | 'at'>;

function read(): Partial<Saved> | null {
  try {
    const raw = localStorage.getItem(scoped(KEY));
    return raw ? (JSON.parse(raw) as Partial<Saved>) : null;
  } catch {
    return null;
  }
}

class AppState {
  profile = $state<Profile>(defaultProfile());
  weights = $state<Weights>({ ...DEFAULT_WEIGHTS });
  favorites = $state<string[]>([]);
  compare = $state<string[]>([]);
  completed = $state(false);
  filters = $state<Filters>(defaultFilters());
  theme = $state<'auto' | 'light' | 'dark'>('auto');
  /** Date de la dernière modification des réponses (0 : rien saisi sur cet appareil) ; entre deux appareils, la
   * version la plus récente gagne. */
  at = 0;
  private last = '';
  private listeners: (() => void)[] = [];

  constructor() {
    const s = read();
    if (s) this.load({ ...s, at: s.at ?? (s.completed ? 1 : 0) }); // réponses d'avant la sauvegarde en ligne
    this.last = JSON.stringify(this.synced());
  }

  /** Reprend des réponses (navigateur, sauvegarde en ligne ou fichier), en complétant ce qui manque. */
  load(s: Partial<Saved>) {
    const base = defaultProfile(s.profile?.level ?? 3);
    this.profile = s.profile ? { ...base, ...s.profile, company: { ...base.company, ...(s.profile.company ?? {}) } } : base;
    this.weights = { ...DEFAULT_WEIGHTS, ...s.weights };
    this.favorites = s.favorites ?? [];
    this.compare = s.compare ?? [];
    this.filters = { ...defaultFilters(), ...s.filters };
    this.completed = !!s.completed;
    if (s.theme) this.theme = s.theme;
    this.at = s.at ?? 0;
  }

  snapshot(): Saved {
    return {
      profile: $state.snapshot(this.profile) as Profile,
      weights: $state.snapshot(this.weights) as Weights,
      favorites: [...this.favorites],
      compare: [...this.compare],
      completed: this.completed,
      filters: $state.snapshot(this.filters) as Filters,
      theme: this.theme
    };
  }

  synced(): Synced {
    const s = this.snapshot();
    return { profile: s.profile, weights: s.weights, favorites: s.favorites, compare: s.compare, completed: s.completed, filters: s.filters };
  }

  /** Enregistre dans le navigateur ; une vraie modification des réponses est datée et signalée (sauvegarde en ligne). */
  save() {
    const body = JSON.stringify(this.synced());
    if (body !== this.last) {
      this.last = body;
      this.at = Date.now();
      untrack(() => this.listeners.forEach((f) => f()));
    }
    this.write();
  }

  private write() {
    try {
      localStorage.setItem(scoped(KEY), JSON.stringify({ ...this.snapshot(), at: this.at }));
    } catch {
      /* stockage indisponible (navigation privée…) : l'application fonctionne sans sauvegarde */
    }
  }

  /** Adopte une autre version des réponses (sauvegarde en ligne), sans la compter comme une modification. */
  replace(s: Partial<Saved>) {
    this.load(s);
    this.last = JSON.stringify(this.synced());
    this.write();
  }

  /** Date les réponses de cet appareil à maintenant : elles deviennent la version à garder partout. */
  touch() {
    this.at = Date.now();
    this.write();
  }

  onChange(f: () => void) {
    this.listeners.push(f);
  }

  /** Change le niveau (Bac+3, Bac+2, post-bac) en conservant ce qui reste pertinent. */
  setLevel(level: Level) {
    if (this.profile.level === level) return;
    const keep = $state.snapshot(this.profile) as Profile;
    const base = defaultProfile(level);
    this.profile = {
      ...base,
      interests: keep.interests,
      skills: keep.skills,
      home: keep.home,
      maxDistanceKm: keep.maxDistanceKm,
      canMove: keep.canMove,
      housing: keep.housing,
      transport: keep.transport,
      maxCommuteMin: keep.maxCommuteMin,
      weeklyEnergyH: keep.weeklyEnergyH,
      jobHours: keep.jobHours,
      monthlyResources: keep.monthlyResources,
      savings: keep.savings,
      bourse: keep.bourse,
      apl: keep.apl,
      livingCosts: keep.livingCosts,
      regime: keep.regime,
      company: keep.company,
      missions: keep.missions,
      subject: keep.subject,
      projectText: keep.projectText,
      metiers: keep.metiers,
      sectors: keep.sectors,
      goals: keep.goals
    };
    this.filters.types = [];
    this.compare = [];
  }

  toggleFavorite(id: string) {
    this.favorites = this.favorites.includes(id) ? this.favorites.filter((x) => x !== id) : [...this.favorites, id];
  }

  toggleCompare(id: string) {
    if (this.compare.includes(id)) this.compare = this.compare.filter((x) => x !== id);
    else if (this.compare.length < 4) this.compare = [...this.compare, id];
  }

  reset() {
    this.profile = defaultProfile(this.profile.level);
    this.weights = { ...DEFAULT_WEIGHTS };
    this.favorites = [];
    this.compare = [];
    this.filters = defaultFilters();
    this.completed = false;
  }
}

export const app = new AppState();

$effect.root(() => {
  $effect(() => {
    app.snapshot();
    app.save();
  });
});

// ---------------------------------------------------------------- navigation par ancre (#/…)
class Router {
  path = $state(typeof location !== 'undefined' ? location.hash.slice(1) || '/' : '/');
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        this.path = location.hash.slice(1) || '/';
        window.scrollTo({ top: 0 });
      });
    }
  }
  go(path: string) {
    if (location.hash.slice(1) === path) return;
    location.hash = path;
  }
}
export const router = new Router();
