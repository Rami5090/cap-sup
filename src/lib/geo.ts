import type { Place } from './types';

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

interface GeoApiCommune {
  nom: string;
  code: string;
  codeDepartement: string;
  codesPostaux?: string[];
  centre?: { coordinates: [number, number] };
}

/** Recherche de communes via l'API Découpage administratif (geo.api.gouv.fr). */
export async function searchCommunes(query: string, signal?: AbortSignal): Promise<(Place & { cp?: string })[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ fields: 'nom,code,codeDepartement,centre,codesPostaux', boost: 'population', limit: '7' });
  if (/^\d{5}$/.test(q)) params.set('codePostal', q);
  else params.set('nom', q);
  const res = await fetch(`https://geo.api.gouv.fr/communes?${params}`, { signal });
  if (!res.ok) throw new Error(`geo.api.gouv.fr : ${res.status}`);
  const data = (await res.json()) as GeoApiCommune[];
  return data
    .filter((c) => c.centre)
    .map((c) => ({
      nom: c.nom,
      code: c.code,
      dep: c.codeDepartement,
      lat: c.centre!.coordinates[1],
      lon: c.centre!.coordinates[0],
      cp: c.codesPostaux?.[0]
    }));
}
