<script lang="ts">
  // Bouton « Sauvegarde » de la barre du haut et sa fenêtre : compte, phrase secrète, état, fichier de sauvegarde.
  import { MIN_PHRASE, cloud, exportFile, importFile, type CloudStatus } from '../lib/cloud.svelte';
  import { UNAA } from '../lib/scope';
  import { SECURE } from '../lib/vault';
  import Icon from './Icon.svelte';

  let dialog = $state<HTMLDialogElement>();
  let fileInput = $state<HTMLInputElement>();
  let email = $state('');
  let password = $state('');
  let phrase = $state('');
  let phrase2 = $state('');
  let understood = $state(false);
  let forgot = $state(false);
  let fileMsg = $state('');

  const LABELS: Record<CloudStatus, string> = {
    off: 'Sauvegarde', connecting: 'Connexion…', setup: 'Sauvegarde', locked: 'Verrouillée', choose: 'À choisir',
    ok: 'Sauvegardé', saving: 'Envoi…', offline: 'Hors ligne', error: 'Erreur'
  };
  const STATES: Partial<Record<CloudStatus, string>> = {
    ok: 'Sauvegarde active : chaque changement part, chiffré, quelques secondes après.',
    saving: 'Envoi en cours…',
    offline: 'Hors ligne : tes réponses attendent sur cet appareil et partiront au retour de la connexion.',
    error: 'La sauvegarde a rencontré un problème.'
  };
  const where = UNAA ? 'sur le serveur d’Unaa OS' : 'sur Firebase (Google)';
  const fmtDate = (t: number) => new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const phraseOk = $derived(phrase.length >= MIN_PHRASE && phrase === phrase2 && understood);

  function open() {
    cloud.message = '';
    fileMsg = '';
    dialog?.showModal();
  }

  function clearPhrase() {
    phrase = '';
    phrase2 = '';
    understood = false;
  }

  async function submitSetup(e: SubmitEvent) {
    e.preventDefault();
    if (!phraseOk) return;
    await (forgot ? cloud.restart(phrase) : cloud.create(phrase));
    clearPhrase();
    forgot = false;
  }

  async function submitUnlock(e: SubmitEvent) {
    e.preventDefault();
    await cloud.unlock(phrase);
    if (cloud.status !== 'locked') phrase = '';
  }

  function submitSignIn(e: SubmitEvent) {
    e.preventDefault();
    void cloud.signIn(email.trim(), password);
  }

  function destroy() {
    if (confirm('Supprimer la sauvegarde en ligne ? Tes réponses restent sur cet appareil, mais tes autres appareils ne la retrouveront plus.')) {
      void cloud.destroy();
    }
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await importFile(file);
      fileMsg = 'Réponses importées.';
    } catch (err) {
      fileMsg = (err as Error).message;
    }
  }
</script>

<button class="btn btn-ghost btn-sm cloud-btn" type="button" onclick={open} title="Sauvegarde en ligne" aria-label="Sauvegarde en ligne : {LABELS[cloud.status]}">
  <Icon name="cloud" size={18} />
  <span class="lbl">{LABELS[cloud.status]}</span>
  <span class="dot s-{cloud.status}" aria-hidden="true"></span>
</button>

<dialog bind:this={dialog} class="cloud" aria-labelledby="cloud-title">
  <div class="inner">
    <header>
      <h2 id="cloud-title"><Icon name="shieldcheck" size={22} /> Sauvegarde en ligne</h2>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" aria-label="Fermer" onclick={() => dialog?.close()}><Icon name="x" /></button>
    </header>
    <p class="small muted">
      Tes réponses sont <strong>chiffrées sur cet appareil</strong> avec ta phrase secrète avant de partir {where} : ni le
      serveur ni son administrateur ne peuvent les lire. Tu les retrouves sur tes autres appareils avec la même phrase.
    </p>

    {#if !SECURE}
      <p class="small warn">La sauvegarde chiffrée a besoin d’une adresse sécurisée (https://…) : ouvre Cap Sup par son adresse habituelle.</p>
    {:else if cloud.status === 'off'}
      <form class="stack" onsubmit={submitSignIn}>
        <p class="small">Connecte-toi pour l’activer, avec <strong>le même compte que le Cockpit de révision</strong>.</p>
        <label class="field">
          <span class="field-label small">E-mail</span>
          <input class="input" type="email" autocomplete="username" required bind:value={email} />
        </label>
        <label class="field">
          <span class="field-label small">Mot de passe (6 caractères minimum)</span>
          <input class="input" type="password" autocomplete="current-password" minlength="6" required bind:value={password} />
        </label>
        <div class="row">
          <button class="btn btn-primary" type="submit" disabled={cloud.signing}>Se connecter</button>
          <button class="btn btn-outline" type="button" disabled={cloud.signing} onclick={() => cloud.signIn(email.trim(), password, true)}>Créer un compte</button>
          <button class="linkbtn small" type="button" onclick={() => cloud.resetPassword(email.trim())}>Mot de passe oublié ?</button>
        </div>
      </form>
    {:else if cloud.status === 'connecting'}
      <p class="state"><Icon name="refresh" size={18} /> Connexion…</p>
    {:else if cloud.status === 'setup' || forgot}
      <form class="stack" onsubmit={submitSetup}>
        <h3>{forgot ? 'Recommencer avec une nouvelle phrase' : 'Choisis ta phrase secrète'}</h3>
        {#if forgot}<p class="small warn">La sauvegarde en ligne actuelle sera remplacée par les réponses de cet appareil.</p>{/if}
        <label class="field">
          <span class="field-label small">Phrase secrète ({MIN_PHRASE} caractères au moins)</span>
          <input class="input" type="password" autocomplete="new-password" minlength={MIN_PHRASE} required bind:value={phrase} />
          <span class="field-hint">Par exemple quatre mots sans lien entre eux. Elle ne quitte jamais cet appareil.</span>
        </label>
        <label class="field">
          <span class="field-label small">La même, une seconde fois</span>
          <input class="input" type="password" autocomplete="new-password" required bind:value={phrase2} />
        </label>
        {#if phrase2 && phrase !== phrase2}<p class="small warn">Les deux phrases ne sont pas identiques.</p>{/if}
        <label class="check small">
          <input type="checkbox" bind:checked={understood} />
          <span>J’ai compris : sans cette phrase, personne ne pourra récupérer ma sauvegarde, pas même l’administrateur.</span>
        </label>
        <div class="row">
          <button class="btn btn-primary" type="submit" disabled={!phraseOk || cloud.busy}>
            {cloud.busy ? 'Chiffrement…' : forgot ? 'Remplacer la sauvegarde' : 'Activer la sauvegarde'}
          </button>
          {#if forgot}<button class="btn btn-ghost" type="button" onclick={() => { forgot = false; clearPhrase(); }}>Annuler</button>{/if}
        </div>
      </form>
    {:else if cloud.status === 'locked'}
      <form class="stack" onsubmit={submitUnlock}>
        <h3>Une sauvegarde existe</h3>
        <p class="small">Saisis ta phrase secrète pour la retrouver sur cet appareil.</p>
        <label class="field">
          <span class="field-label small">Phrase secrète</span>
          <input class="input" type="password" autocomplete="current-password" required bind:value={phrase} />
        </label>
        <div class="row">
          <button class="btn btn-primary" type="submit" disabled={!phrase || cloud.busy}>{cloud.busy ? 'Déchiffrement…' : 'Déverrouiller'}</button>
          <button class="linkbtn small" type="button" onclick={() => { forgot = true; clearPhrase(); }}>Phrase oubliée ?</button>
        </div>
      </form>
    {:else if cloud.status === 'choose' && cloud.choice}
      <div class="stack">
        <h3>Quelles réponses garder ?</h3>
        <p class="small">Cet appareil a déjà des réponses, différentes de celles de la sauvegarde.</p>
        <button class="btn btn-primary choice" type="button" onclick={() => cloud.keep('cloud')}>
          Celles de la sauvegarde <small>modifiées le {fmtDate(cloud.choice.remoteAt)}</small>
        </button>
        <button class="btn btn-outline choice" type="button" onclick={() => cloud.keep('device')}>
          Celles de cet appareil <small>modifiées le {fmtDate(cloud.choice.localAt)}</small>
        </button>
        <p class="small faint">Si tu hésites, exporte d’abord un fichier (plus bas) : il garde les réponses de cet appareil.</p>
      </div>
    {:else}
      <div class="stack">
        <p class="state s-{cloud.status}"><Icon name={cloud.status === 'ok' ? 'check' : cloud.status === 'saving' ? 'refresh' : 'alert'} size={18} /> {STATES[cloud.status]}</p>
        {#if cloud.savedAt > 1}<p class="small muted">Version sauvegardée : {fmtDate(cloud.savedAt)}</p>{/if}
        <div class="row">
          {#if cloud.status === 'offline' || cloud.status === 'error'}
            <button class="btn btn-primary btn-sm" type="button" onclick={() => cloud.retry()}>Réessayer</button>
          {/if}
          <button class="btn btn-outline btn-sm" type="button" onclick={() => cloud.disable()}>Désactiver sur cet appareil</button>
          <button class="btn btn-ghost btn-sm danger" type="button" onclick={destroy}>Supprimer la sauvegarde en ligne</button>
        </div>
      </div>
    {/if}

    {#if cloud.message}<p class="small warn" role="alert">{cloud.message}</p>{/if}
    {#if !UNAA && cloud.account}
      <p class="small muted">Compte : {cloud.account} · <button class="linkbtn" type="button" onclick={() => cloud.signOut()}>Se déconnecter</button></p>
    {/if}

    <section class="file">
      <h3>Fichier de sauvegarde</h3>
      <p class="small muted">
        Une copie sur ton appareil, ou pour passer d’un site à l’autre (Cap Sup en ligne et Unaa OS). Ce fichier n’est pas
        chiffré : garde-le pour toi.
      </p>
      <div class="row">
        <button class="btn btn-outline btn-sm" type="button" onclick={exportFile}><Icon name="down" size={16} /> Exporter mes réponses</button>
        <button class="btn btn-outline btn-sm" type="button" onclick={() => fileInput?.click()}><Icon name="up" size={16} /> Importer un fichier</button>
        <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={onFile} />
      </div>
      {#if fileMsg}<p class="small" role="status">{fileMsg}</p>{/if}
    </section>
  </div>
</dialog>

<style>
  .cloud-btn {
    gap: 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .dot.s-ok {
    background: var(--good);
  }
  .dot.s-saving {
    background: var(--brand);
  }
  .dot.s-locked,
  .dot.s-choose,
  .dot.s-offline {
    background: var(--fair);
  }
  .dot.s-error {
    background: var(--weak);
  }
  .cloud {
    width: min(560px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    padding: 0;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-2);
  }
  .cloud::backdrop {
    background: rgb(10 14 30 / 45%);
  }
  .inner {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px 22px 22px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 1.2rem;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
  }
  p {
    margin: 0;
  }
  .stack {
    --gap: 12px;
  }
  .check {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .warn {
    color: var(--weak);
  }
  .state {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 650;
  }
  .state.s-ok {
    color: var(--good);
  }
  .state.s-offline,
  .state.s-error {
    color: var(--weak);
  }
  .choice {
    flex-direction: column;
    min-height: 58px;
    height: auto;
    padding: 8px 18px;
  }
  .choice small {
    font-weight: 500;
    opacity: 0.85;
  }
  .danger {
    color: var(--weak);
  }
  .linkbtn {
    border: 0;
    background: none;
    color: var(--brand);
    font-weight: 650;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .file {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  @media (max-width: 600px) {
    .lbl {
      display: none;
    }
  }
</style>
