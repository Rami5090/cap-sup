// Données chargées (formations, références, métiers) partagées entre les vues.
import { loadLicences, loadMeta, loadMetiers, loadOffers, type LicenceMention, type Meta } from './data';
import { buildJobsIndex, type JobsIndex } from './jobs';
import { computeIdf, type ScoringContext } from './scoring';
import type { Level, Offer } from './types';

class DataStore {
  meta = $state.raw<Meta | null>(null);
  licences = $state.raw<LicenceMention[]>([]);
  jobs = $state.raw<JobsIndex | null>(null);
  offers = $state.raw<Offer[]>([]);
  level = $state<Level | null>(null);
  loading = $state(false);
  error = $state<string | null>(null);

  /** Poids des mots (rareté parmi les formations du niveau chargé), pour le critère « thématique ». */
  idf = $derived(computeIdf(this.offers));
  ctx: ScoringContext = $derived({
    licenceToMasters: new Map(this.licences.map((l) => [l.key, new Set(l.masters)])),
    medianRentM2: this.meta?.refs.rentM2?.[2] ?? 17.2,
    jobs: this.jobs ?? undefined,
    idf: this.idf
  });
  byId = $derived(new Map(this.offers.map((o) => [o.id, o])));

  async init() {
    if (this.meta && this.jobs) return;
    try {
      const [m, l, j] = await Promise.all([loadMeta(), loadLicences(), loadMetiers()]);
      this.meta = m;
      this.licences = l;
      this.jobs = buildJobsIndex(j);
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  async ensure(level: Level) {
    if (this.level === level && this.offers.length) return;
    this.loading = true;
    this.error = null;
    try {
      await this.init();
      const offers = await loadOffers(level);
      this.offers = offers;
      this.level = level;
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.loading = false;
    }
  }
}

export const data = new DataStore();
