// Chiffrement de bout en bout de la sauvegarde en ligne. La clé est tirée de la phrase secrète (PBKDF2-SHA-256) et
// les réponses sont chiffrées sur l'appareil (AES-256-GCM) : le serveur (Unaa OS ou Firebase) ne reçoit que du chiffré,
// ni lui ni son administrateur ne peuvent les lire. Sans la phrase secrète, personne ne peut les récupérer.

export const ITERATIONS = 600_000; // PBKDF2-HMAC-SHA-256 : recommandation OWASP
/** Le navigateur ne chiffre que sur une adresse sécurisée (https, ou l'ordinateur lui-même). */
export const SECURE = typeof crypto !== 'undefined' && !!crypto.subtle;

/** Ce qui est envoyé au serveur : tout est chiffré, sauf la date de la version (liée au chiffré, donc infalsifiable). */
export interface Envelope {
  v: 1;
  iter: number;
  salt: string; // base64, propre à chaque sauvegarde
  iv: string; // base64, nouveau à chaque envoi
  ct: string; // réponses chiffrées (base64)
  at: number; // date de la dernière modification des réponses
}

const utf8 = new TextEncoder();

export function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const stamp = (at: number) => utf8.encode(`cap-sup:${at}`);

export const newSalt = (): string => toB64(random(16));

export async function deriveKey(passphrase: string, salt: string, iterations = ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', utf8.encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function seal(key: CryptoKey, salt: string, iter: number, plain: string, at: number): Promise<Envelope> {
  const iv = random(12);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: stamp(at) }, key, utf8.encode(plain));
  return { v: 1, iter, salt, iv: toB64(iv), ct: toB64(new Uint8Array(ct)), at };
}

/** Déchiffre une sauvegarde ; échoue si la clé ne correspond pas ou si l'enveloppe a été modifiée. */
export async function unseal(key: CryptoKey, e: Envelope): Promise<string> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(e.iv), additionalData: stamp(e.at) }, key, fromB64(e.ct));
  return new TextDecoder().decode(plain);
}

export const exportKey = async (key: CryptoKey): Promise<string> => toB64(new Uint8Array(await crypto.subtle.exportKey('raw', key)));
export const importKey = (raw: string): Promise<CryptoKey> => crypto.subtle.importKey('raw', fromB64(raw), 'AES-GCM', true, ['encrypt', 'decrypt']);

export function isEnvelope(x: unknown): x is Envelope {
  const e = x as Partial<Envelope> | null;
  return !!e && e.v === 1 && typeof e.salt === 'string' && typeof e.iv === 'string' && typeof e.ct === 'string'
    && Number.isFinite(e.at) && Number.isInteger(e.iter) && (e.iter ?? 0) > 0;
}

/** Quelle version garder entre cet appareil et la sauvegarde en ligne : la plus récente gagne. */
export function plan(localAt: number, remote: Envelope | null): 'push' | 'pull' | 'same' {
  if (!remote || remote.at < localAt) return 'push';
  return remote.at > localAt ? 'pull' : 'same';
}
