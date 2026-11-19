// Télécharge les jeux de données officiels dans data-raw/ (avec cache).
// Usage : node scripts/fetch-sources.mjs [--refresh]
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data-raw');
const refresh = process.argv.includes('--refresh');

async function exists(p) {
  try { return (await stat(p)).size > 0; } catch { return false; }
}

async function download(src) {
  const dest = join(RAW, src.file);
  if (!refresh && (await exists(dest))) {
    console.log(`  ✓ ${src.file} (cache)`);
    return;
  }
  const t0 = Date.now();
  const res = await fetch(src.url, { headers: { 'user-agent': 'cap-sup-data-pipeline/1.0', accept: '*/*' } });
  if (!res.ok) throw new Error(`${src.key}: HTTP ${res.status} sur ${src.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`  ↓ ${src.file} – ${(buf.length / 1e6).toFixed(1)} Mo en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

await mkdir(RAW, { recursive: true });
console.log(`Téléchargement des sources dans ${RAW}`);
for (const src of SOURCES) {
  await download(src);
}
console.log('Terminé.');
