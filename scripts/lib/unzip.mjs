// Lecture minimale d'une archive ZIP (méthodes « stocké » et « deflate »), sans dépendance.
import { inflateRawSync } from 'node:zlib';

/** Renvoie les fichiers de l'archive : [{ name, data: Buffer }]. */
export function unzip(buf) {
  // Fin du répertoire central : signature 0x06054b50, cherchée depuis la fin.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Archive ZIP invalide (répertoire central introuvable)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Entrée de répertoire central invalide');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    // En-tête local : la donnée commence après le nom et le champ extra locaux.
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    if (!name.endsWith('/')) {
      if (method === 0) files.push({ name, data: Buffer.from(raw) });
      else if (method === 8) files.push({ name, data: inflateRawSync(raw) });
      else throw new Error(`Méthode de compression ZIP non gérée (${method}) pour ${name}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
