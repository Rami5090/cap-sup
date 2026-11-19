import { norm } from './text.mjs';

const R = 6371;
export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Paris, Lyon, Marseille : arrondissement municipal → commune. */
export function parentCommune(code) {
  if (/^751(0[1-9]|1\d|20)$/.test(code)) return '75056';
  if (/^6938[1-9]$/.test(code)) return '69123';
  if (/^132(0[1-9]|1[0-6])$/.test(code)) return '13055';
  return code;
}

/** Département à partir d'un code postal (Corse : ambigu → null). */
export function depFromPostalCode(cp) {
  const s = String(cp ?? '').trim();
  if (!/^\d{5}$/.test(s)) return null;
  if (s.startsWith('97') || s.startsWith('98')) return s.slice(0, 3);
  if (s.startsWith('20')) return null;
  return s.slice(0, 2);
}

function cleanCity(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bcedex\b.*$/i, ' ')
    .replace(/\s\d+\s*$/, ' ')
    .trim();
}

export class CommuneIndex {
  constructor(communes) {
    this.byCode = new Map();
    this.byKey = new Map();
    this.byDep = new Map();
    for (const c of communes) {
      const [lon, lat] = c.centre?.coordinates ?? [];
      if (lat == null) continue;
      const o = { code: c.code, nom: c.nom, dep: c.codeDepartement, lat, lon, pop: c.population ?? 0 };
      this.byCode.set(o.code, o);
      const k = `${o.dep}|${norm(o.nom)}`;
      const prev = this.byKey.get(k);
      if (!prev || prev.pop < o.pop) this.byKey.set(k, o);
      if (!this.byDep.has(o.dep)) this.byDep.set(o.dep, []);
      this.byDep.get(o.dep).push(o);
    }
  }

  byName(name, dep) {
    if (!name || !dep) return null;
    // Outre-mer : certains jeux n'indiquent que « 97 ».
    const deps = dep === '97' ? ['971', '972', '973', '974', '976'] : [dep];
    const base = norm(cleanCity(name));
    if (!base) return null;
    const candidates = [base, base.replace(/ arrondissement$/, ''), base.replace(/^(le|la|les|l) /, '')];
    // "Paris 05" / "Paris 5e" → arrondissement
    const arr = base.match(/^(paris|lyon|marseille) (\d{1,2})(e|er)?( arrondissement)?$/);
    if (arr) candidates.unshift(`${arr[1]} ${Number(arr[2])}${arr[2] === '1' || arr[2] === '01' ? 'er' : 'e'} arrondissement`);
    for (const d of deps) {
      for (const cand of candidates) {
        const hit = this.byKey.get(`${d}|${cand}`);
        if (hit) return hit;
      }
    }
    // Communes fusionnées ("Evry" → "Évry-Courcouronnes", "Annecy-le-Vieux" → "Annecy") ou libellés usuels
    // ("Futuroscope Chasseneuil" → "Chasseneuil-du-Poitou") : préfixe, puis mot le plus distinctif.
    const pool = deps.flatMap((d) => this.byDep.get(d) ?? []);
    const byPop = (a, b) => b.pop - a.pop;
    const prefix = pool.filter((c) => norm(c.nom).startsWith(`${base} `)).sort(byPop)[0];
    if (prefix) return prefix;
    const tokens = base.split(' ').filter((t) => t.length >= 5 && !/^(saint|sainte|cedex|campus|technopole)$/.test(t)).sort((a, b) => b.length - a.length);
    for (const tok of tokens) {
      const hit = pool.filter((c) => norm(c.nom).split(' ').includes(tok)).sort(byPop)[0];
      if (hit) return hit;
    }
    return null;
  }

  nearest(lat, lon, dep) {
    let pool = dep && this.byDep.has(dep) ? this.byDep.get(dep) : null;
    if (!pool) pool = [...this.byCode.values()].filter((c) => Math.abs(c.lat - lat) < 0.6 && Math.abs(c.lon - lon) < 0.9);
    let best = null;
    let bestD = Infinity;
    for (const c of pool) {
      const d = haversineKm(lat, lon, c.lat, c.lon);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best && bestD < 40 ? best : null;
  }

  /** Nom + département d'abord, puis commune la plus proche des coordonnées. */
  locate({ name, dep, lat, lon }) {
    const byName = this.byName(name, dep);
    if (byName) return byName;
    if (lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)) return this.nearest(lat, lon, dep);
    return null;
  }
}
