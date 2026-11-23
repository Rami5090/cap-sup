// Sauvegarde en ligne, chiffrée de bout en bout (vault.ts) : dans Unaa OS sur le serveur de la famille, sinon sur
// Firebase avec le compte du Cockpit de révision. La clé, tirée de la phrase secrète, reste sur l'appareil : le
// serveur ne voit que du chiffré. Entre deux appareils, la version la plus récente gagne ; au premier déverrouillage
// d'un appareil qui a déjà des réponses, on demande laquelle garder.
import { RemoteError, unaaRemote, type Remote } from './remote';
import { UNAA, scoped } from './scope';
import { app, type Saved } from './state.svelte';
import { ITERATIONS, deriveKey, exportKey, importKey, newSalt, plan, seal, unseal } from './vault';

export type CloudStatus =
  | 'off' // site seul : pas connecté
  | 'connecting'
  | 'setup' // pas encore de sauvegarde : choisir une phrase secrète
  | 'locked' // une sauvegarde existe : saisir la phrase secrète sur cet appareil
  | 'choose' // premier déverrouillage : garder la sauvegarde ou les réponses de cet appareil ?
  | 'ok'
  | 'saving'
  | 'offline'
  | 'error';

export const MIN_PHRASE = 12;
const KEY = 'capsup:cle'; // clé de chiffrement retenue sur cet appareil, liée au compte
const FIREBASE = 'capsup:firebase'; // site seul : une session Firebase est à retrouver au chargement

type Firebase = typeof import('./remote-firebase');
interface StoredKey {
  id: string;
  salt: string;
  iter: number;
  key: string;
}

function ls(k: string, v?: string | null): string | null {
  try {
    if (v === undefined) return localStorage.getItem(k);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* stockage indisponible */
  }
  return null;
}
const errText = (e: unknown) => (e instanceof RemoteError ? e.message : `Erreur inattendue : ${(e as Error)?.message ?? e}`);

class Cloud {
  status = $state<CloudStatus>(UNAA ? 'connecting' : 'off');
  account = $state('');
  message = $state('');
  savedAt = $state(0);
  busy = $state(false);
  signing = $state(false);
  choice = $state<{ remoteAt: number; localAt: number } | null>(null);

  private remote: Remote | null = null;
  private key: CryptoKey | null = null;
  private salt = '';
  private iter = ITERATIONS;
  private pending = { plain: '', at: 0 };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private running = 0;
  private fb: Promise<Firebase> | null = null;

  start() {
    app.onChange(() => this.schedule());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.refresh();
    });
    if (UNAA) this.connect(unaaRemote);
    else if (ls(FIREBASE)) this.retry();
  }

  /** Réessaie : recharge la connexion Firebase si elle n'a pas pu se faire, sinon relit la sauvegarde. */
  retry() {
    if (this.remote) {
      void this.refresh();
      return;
    }
    if (UNAA) return;
    this.status = 'connecting';
    this.firebase().catch((e: unknown) => this.fail(e));
  }

  // ------------------------------------------------------------------ compte (site seul : Firebase)

  private firebase(): Promise<Firebase> {
    this.fb ??= import('./remote-firebase').then(
      (m) => {
        m.watch((r) => {
          ls(FIREBASE, r ? '1' : null);
          this.connect(r);
        });
        return m;
      },
      (e: unknown) => {
        this.fb = null;
        throw new RemoteError(`Impossible de charger la connexion (${(e as Error)?.message ?? e}).`, true);
      }
    );
    return this.fb;
  }

  async signIn(email: string, pass: string, create = false) {
    this.signing = true;
    this.message = '';
    try {
      const fb = await this.firebase();
      await (create ? fb.signUp(email, pass) : fb.signIn(email, pass));
    } catch (e) {
      this.message = errText(e);
    } finally {
      this.signing = false;
    }
  }

  async resetPassword(email: string) {
    this.message = '';
    try {
      await (await this.firebase()).resetPassword(email);
      this.message = 'E-mail de réinitialisation envoyé (regarde aussi les spams).';
    } catch (e) {
      this.message = errText(e);
    }
  }

  async signOut() {
    this.forgetKey();
    try {
      await (await this.firebase()).logOut();
    } catch (e) {
      this.message = errText(e);
    }
  }

  /** Branche un compte (Unaa OS, ou Firebase une fois connecté), puis lit sa sauvegarde. */
  private connect(r: Remote | null) {
    this.remote = r;
    this.key = null;
    this.choice = null;
    this.message = '';
    this.account = r?.account ?? '';
    this.status = r ? 'connecting' : 'off';
    if (r) void this.refresh();
  }

  // ------------------------------------------------------------------ synchronisation

  /** Les opérations passent une par une : jamais deux envois ou lectures qui se croisent. */
  private run(f: (r: Remote) => Promise<void>): Promise<void> {
    const r = this.remote;
    if (!r) return Promise.resolve();
    this.running++;
    this.busy = true;
    const p = this.queue
      .then(() => (r === this.remote ? f(r) : undefined))
      .catch((e: unknown) => this.fail(e))
      .finally(() => {
        if (--this.running === 0) this.busy = false;
      });
    this.queue = p;
    return p;
  }

  /** Relit la sauvegarde : retrouve la clé de l'appareil, puis garde la version la plus récente. */
  refresh(): Promise<void> {
    return this.run(async (r) => {
      if (this.status === 'choose') return;
      const env = await r.load();
      if (!env) {
        // Pas (ou plus) de sauvegarde, par exemple supprimée depuis un autre appareil : on ne la recrée pas en douce.
        this.forgetKey();
        this.status = 'setup';
        return;
      }
      if (!this.key || this.salt !== env.salt) {
        const k = this.storedKey(r.id);
        if (!k || k.salt !== env.salt) {
          this.forgetKey();
          this.status = 'locked';
          return;
        }
        this.key = await importKey(k.key);
        this.salt = k.salt;
        this.iter = k.iter;
      }
      const step = plan(app.at, env);
      if (step === 'push') return this.push(r);
      if (step === 'same') return this.done(env.at);
      let plain: string;
      try {
        plain = await unseal(this.key, env);
      } catch {
        this.forgetKey();
        this.status = 'locked';
        this.message = 'La clé de cet appareil ne correspond plus à la sauvegarde : saisis ta phrase secrète.';
        return;
      }
      this.adopt(plain, env.at);
    });
  }

  private async push(r: Remote) {
    const key = this.key;
    if (!key) return;
    this.status = 'saving';
    const at = app.at;
    await r.save(await seal(key, this.salt, this.iter, JSON.stringify(app.synced()), at));
    this.done(at);
  }

  /** Après une modification des réponses : envoi groupé, 1,5 s plus tard. */
  private schedule() {
    if (!this.key || this.status === 'choose') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.run((r) => (app.at > this.savedAt ? this.push(r) : Promise.resolve())), 1500);
  }

  private adopt(plain: string, at: number) {
    app.replace({ ...(JSON.parse(plain) as Partial<Saved>), at });
    this.done(at);
  }

  private done(at: number) {
    this.savedAt = at;
    this.status = 'ok';
    this.message = '';
  }

  private fail(e: unknown) {
    this.status = e instanceof RemoteError && e.offline ? 'offline' : 'error';
    this.message = errText(e);
  }

  // ------------------------------------------------------------------ phrase secrète

  /** Première sauvegarde : la clé est tirée de la phrase secrète, ici, sur l'appareil. */
  create(phrase: string): Promise<void> {
    return this.run(async (r) => {
      if (await r.load()) {
        this.status = 'locked';
        this.message = 'Une sauvegarde existe déjà pour ce compte : saisis sa phrase secrète.';
        return;
      }
      await this.newBackup(r, phrase);
    });
  }

  /** Phrase oubliée : la sauvegarde en ligne est remplacée par les réponses de cet appareil, avec une nouvelle phrase. */
  restart(phrase: string): Promise<void> {
    return this.run((r) => this.newBackup(r, phrase));
  }

  private async newBackup(r: Remote, phrase: string) {
    this.salt = newSalt();
    this.iter = ITERATIONS;
    this.key = await deriveKey(phrase, this.salt, this.iter);
    await this.storeKey(r.id);
    app.touch();
    await this.push(r);
  }

  unlock(phrase: string): Promise<void> {
    return this.run(async (r) => {
      const env = await r.load();
      if (!env) {
        this.status = 'setup';
        return;
      }
      const key = await deriveKey(phrase, env.salt, env.iter);
      let plain: string;
      try {
        plain = await unseal(key, env);
      } catch {
        this.message = 'Phrase secrète incorrecte.';
        return;
      }
      this.key = key;
      this.salt = env.salt;
      this.iter = env.iter;
      await this.storeKey(r.id);
      if (app.at > 0 && app.at !== env.at) {
        this.pending = { plain, at: env.at };
        this.choice = { remoteAt: env.at, localAt: app.at };
        this.status = 'choose';
        return;
      }
      this.adopt(plain, env.at);
    });
  }

  /** Premier déverrouillage avec des réponses des deux côtés : on garde celles que la personne choisit. */
  keep(which: 'cloud' | 'device'): Promise<void> {
    const { plain, at } = this.pending;
    this.pending = { plain: '', at: 0 };
    this.choice = null;
    this.status = 'saving';
    if (which === 'cloud') {
      this.adopt(plain, at);
      return Promise.resolve();
    }
    app.touch();
    return this.run((r) => this.push(r));
  }

  /** Arrête la sauvegarde sur cet appareil (elle reste en ligne pour les autres) et y efface la clé. */
  disable() {
    clearTimeout(this.timer);
    this.forgetKey();
    this.status = 'locked';
  }

  /** Supprime la sauvegarde en ligne ; les réponses restent sur cet appareil. */
  destroy(): Promise<void> {
    clearTimeout(this.timer);
    return this.run(async (r) => {
      await r.remove();
      this.forgetKey();
      this.savedAt = 0;
      this.status = 'setup';
    });
  }

  private storedKey(id: string): StoredKey | null {
    try {
      const k = JSON.parse(ls(scoped(KEY)) ?? 'null') as StoredKey | null;
      return k && k.id === id ? k : null;
    } catch {
      return null;
    }
  }

  private async storeKey(id: string) {
    if (this.key) ls(scoped(KEY), JSON.stringify({ id, salt: this.salt, iter: this.iter, key: await exportKey(this.key) }));
  }

  private forgetKey() {
    this.key = null;
    this.salt = '';
    ls(scoped(KEY), null);
  }
}

export const cloud = new Cloud();

// ------------------------------------------------------------------ fichier de sauvegarde (lisible, pour soi)

export function exportFile() {
  const body = JSON.stringify({ app: 'cap-sup', v: 1, at: app.at, ...app.synced() });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  a.download = `cap-sup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Reprend les réponses d'un fichier exporté ; elles deviennent la version à jour (et partent en ligne si activée). */
export async function importFile(file: File): Promise<void> {
  let data: Partial<Saved> & { app?: string };
  try {
    data = JSON.parse(await file.text()) as typeof data;
  } catch {
    throw new Error('Ce fichier n’est pas lisible.');
  }
  if (data?.app !== 'cap-sup' || typeof data.profile !== 'object') throw new Error('Ce fichier n’est pas une sauvegarde de Cap Sup.');
  app.load(data);
}
