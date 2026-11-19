// Données chargées (formations, références) partagées entre les vues.
import { loadLicences, loadMeta, loadOffers, type LicenceMention, type Meta } from './data';
import type { ScoringContext } from './scoring';
import type { Level, Offer } from './types';

class DataStore {
  meta = $state.raw<Meta | null>(null);
  licences = $state.raw<LicenceMention[]>([]);
  offers = $state.raw<Offer[]>([]);
  level = $state<Level | null>(null);
  loading = $state(false);
  error = $state<string | null>(null);

  ctx: ScoringContext = $derived({
    licenceToMasters: new Map(this.licences.map((l) => [l.key, new Set(l.masters)])),
    medianRentM2: this.meta?.refs.rentM2?.[2] ?? 17.2
  });
  byId = $derived(new Map(this.offers.map((o) => [o.id, o])));

  async init() {
    if (this.meta) return;
    try {
      const [m, l] = await Promise.all([loadMeta(), loadLicences()]);
      this.meta = m;
      this.licences = l;
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
