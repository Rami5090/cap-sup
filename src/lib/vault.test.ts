import { describe, expect, it } from 'vitest';
import { deriveKey, exportKey, importKey, isEnvelope, newSalt, plan, seal, unseal, type Envelope } from './vault';

const ITER = 1000; // le vrai réglage (600 000) ralentirait les tests sans rien prouver de plus
const answers = JSON.stringify({ profile: { projectText: 'cybersécurité des réseaux industriels', monthlyResources: 450 } });

describe('sauvegarde chiffrée de bout en bout', () => {
  it('chiffre sur l’appareil : le serveur ne reçoit rien de lisible, et la même phrase redonne les réponses', async () => {
    const salt = newSalt();
    const env = await seal(await deriveKey('vélo nuage piment lundi', salt, ITER), salt, ITER, answers, 1_700_000_000_000);
    const sent = JSON.stringify(env);
    expect(sent).not.toContain('cyber');
    expect(sent).not.toContain('450');
    expect(sent).not.toContain(btoa('{"profile"'));
    expect(isEnvelope(env)).toBe(true);
    // Un autre appareil : seule la phrase est connue, le sel vient de la sauvegarde
    const again = await deriveKey('vélo nuage piment lundi', env.salt, env.iter);
    expect(await unseal(again, env)).toBe(answers);
  });

  it('refuse une mauvaise phrase et une sauvegarde modifiée (date ou contenu)', async () => {
    const salt = newSalt();
    const key = await deriveKey('vélo nuage piment lundi', salt, ITER);
    const env = await seal(key, salt, ITER, answers, 1_700_000_000_000);
    await expect(unseal(await deriveKey('velo nuage piment lundi', salt, ITER), env)).rejects.toThrow();
    await expect(unseal(key, { ...env, at: env.at + 1 })).rejects.toThrow(); // vieille version présentée comme récente
    const ct = env.ct.startsWith('A') ? `B${env.ct.slice(1)}` : `A${env.ct.slice(1)}`;
    await expect(unseal(key, { ...env, ct })).rejects.toThrow();
  });

  it('chaque envoi a son propre vecteur ; la clé retenue sur l’appareil redonne la même clé', async () => {
    const salt = newSalt();
    const key = await deriveKey('une autre phrase assez longue', salt, ITER);
    const [a, b] = await Promise.all([seal(key, salt, ITER, answers, 1), seal(key, salt, ITER, answers, 1)]);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
    const kept = await importKey(await exportKey(key));
    expect(await unseal(kept, a)).toBe(answers);
  });

  it('garde la version la plus récente entre l’appareil et la sauvegarde', () => {
    const at = (t: number) => ({ at: t }) as Envelope;
    expect(plan(5, null)).toBe('push');
    expect(plan(5, at(3))).toBe('push');
    expect(plan(5, at(9))).toBe('pull');
    expect(plan(0, at(9))).toBe('pull'); // appareil neuf : il reprend la sauvegarde
    expect(plan(5, at(5))).toBe('same');
  });

  it('reconnaît une sauvegarde chiffrée', () => {
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope({ profile: {} })).toBe(false);
    expect(isEnvelope({ v: 1, iter: 10, salt: 's', iv: 'i', ct: 'c', at: 1 })).toBe(true);
  });
});
