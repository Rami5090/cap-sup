// Chargement et décodage des données préparées par scripts/build-data.mjs.
import type { Commune, DomainId, Level, Offer, OfferDataset, RawOffer } from './types';

export interface Meta {
  generatedAt: string;
  sources: { key: string; label: string; producer: string; page: string; licence: string }[];
  counts: Record<string, Record<string, number>>;
  refs: { rentM2: number[]; employment18: number[]; salary: number[] };
  quality: Record<string, unknown>;
}

export interface LicenceMention {
  label: string;
  key: string;
  masters: string[];
  dm: DomainId[];
}

const FILES: Record<Level, string> = { 3: 'offres-bac3.json', 2: 'offres-bac2.json', 0: 'offres-bac.json' };
const offersCache = new Map<Level, Promise<Offer[]>>();
let metaCache: Promise<Meta> | null = null;
let licencesCache: Promise<LicenceMention[]> | null = null;
let crousCache: Promise<[number, number, string, string, string][]> | null = null;

async function getJSON<T>(file: string): Promise<T> {
  const res = await fetch(`./data/${file}`);
  if (!res.ok) throw new Error(`Impossible de charger ${file} (${res.status})`);
  return (await res.json()) as T;
}

function offerLink(o: RawOffer, uai: string): { url: string; urlLabel: string } {
  if (o.id.startsWith('mm-')) {
    return { url: `https://monmaster.gouv.fr/formation/${uai}/${o.id.slice(3)}/detail`, urlLabel: 'Fiche Mon Master' };
  }
  if (o.id.startsWith('ps-')) {
    return {
      url: `https://dossierappel.parcoursup.fr/Candidats/public/fiches/afficherFicheFormation?g_ta_cod=${o.id.slice(3)}&typeBac=0&originePc=0`,
      urlLabel: 'Fiche Parcoursup'
    };
  }
  return { url: o.uo ?? o.ur ?? 'https://www.onisep.fr/', urlLabel: 'Fiche ONISEP' };
}

export function decodeDataset(ds: OfferDataset): Offer[] {
  const communes: Commune[] = ds.communes.map((c) => ({
    code: c[0], nom: c[1], lat: c[2], lon: c[3], loyerM2: c[4], loyerCommunal: c[5] === 1, zone: c[6],
    crous10: c[7], crousNearestKm: c[8], dep: c[9], pop: c[10]
  }));
  return ds.offers.map((o) => {
    const [etab, uai] = ds.etabs[o.et];
    const commune = communes[o.cm];
    return {
      ...o,
      etab,
      uai,
      commune,
      lat: o.la ?? commune.lat,
      lon: o.lo ?? commune.lon,
      sector: o.sec != null ? ds.sectors[o.sec] : undefined,
      ...offerLink(o, uai)
    };
  });
}

export function loadOffers(level: Level): Promise<Offer[]> {
  if (!offersCache.has(level)) {
    const p = getJSON<OfferDataset>(FILES[level]).then(decodeDataset);
    p.catch(() => offersCache.delete(level));
    offersCache.set(level, p);
  }
  return offersCache.get(level)!;
}

export function loadMeta(): Promise<Meta> {
  metaCache ??= getJSON<Meta>('meta.json');
  return metaCache;
}

export function loadLicences(): Promise<LicenceMention[]> {
  licencesCache ??= getJSON<LicenceMention[]>('licence-master.json');
  return licencesCache;
}

export function loadCrous() {
  crousCache ??= getJSON<[number, number, string, string, string][]>('crous.json');
  return crousCache;
}
