// État global de l'application (runes Svelte 5), sauvegardé dans le navigateur uniquement.
import { DEFAULT_WEIGHTS } from './criteria';
import { defaultProfile } from './profile';
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
}

export const defaultFilters = (): Filters => ({
  query: '', types: [], publicOnly: false, alternanceOnly: false, withinBudget: false, allDomains: false, minScore: 0
});

interface Saved {
  profile: Profile;
  weights: Weights;
  favorites: string[];
  compare: string[];
  completed: boolean;
  filters: Filters;
  theme: 'auto' | 'light' | 'dark';
}

function read(): Partial<Saved> | null {
  try {
    const raw = localStorage.getItem(KEY);
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

  constructor() {
    const s = read();
    if (!s) return;
    if (s.profile) {
      const base = defaultProfile(s.profile.level ?? 3);
      this.profile = { ...base, ...s.profile, company: { ...base.company, ...(s.profile.company ?? {}) } };
    }
    if (s.weights) this.weights = { ...DEFAULT_WEIGHTS, ...s.weights };
    if (s.favorites) this.favorites = s.favorites;
    if (s.compare) this.compare = s.compare;
    if (s.filters) this.filters = { ...defaultFilters(), ...s.filters };
    this.completed = !!s.completed;
    this.theme = s.theme ?? 'auto';
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

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.snapshot()));
    } catch {
      /* stockage indisponible (navigation privée…) : l'application fonctionne sans sauvegarde */
    }
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
