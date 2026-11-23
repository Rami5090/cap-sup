// Où va la sauvegarde chiffrée : le serveur d'Unaa OS (module), ou Firebase (site seul, voir remote-firebase.ts).
import { UNAA_API, scope } from './scope';
import { isEnvelope, type Envelope } from './vault';

export interface Remote {
  id: string; // identifiant du compte (la clé retenue sur l'appareil lui est liée)
  account: string; // nom affiché
  load(): Promise<Envelope | null>;
  save(e: Envelope): Promise<void>;
  remove(): Promise<void>;
}

export class RemoteError extends Error {
  constructor(message: string, readonly offline = false) {
    super(message);
  }
}

async function call(method: 'GET' | 'PUT' | 'DELETE', body?: unknown): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(UNAA_API, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new RemoteError('Pas de connexion au serveur Unaa OS : tes réponses restent sur cet appareil.', true);
  }
  if (!res.ok) throw new RemoteError(`Le serveur Unaa OS refuse la demande (erreur ${res.status}).`);
  return res;
}

export const unaaRemote: Remote = {
  id: 'unaa',
  account: 'ton compte Unaa OS',
  async load() {
    const j = (await (await call('GET')).json()) as { user_id: number; data: unknown };
    if (String(j.user_id) !== scope.uid) {
      location.reload(); // un autre membre est connecté sur cet appareil : on recharge ses réponses à lui
      throw new RemoteError('Changement de membre…', true);
    }
    return isEnvelope(j.data) ? j.data : null;
  },
  async save(e) {
    await call('PUT', { data: e });
  },
  async remove() {
    await call('DELETE');
  }
};
