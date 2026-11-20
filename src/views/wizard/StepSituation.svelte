<script lang="ts">
  import CommuneSearch from '../../components/CommuneSearch.svelte';
  import Icon from '../../components/Icon.svelte';
  import Segmented from '../../components/ui/Segmented.svelte';
  import { REGIME_LABELS, isAlternant } from '../../lib/profile';
  import { app } from '../../lib/state.svelte';
  import { data } from '../../lib/store.svelte';
  import type { Company, Regime } from '../../lib/types';

  $effect(() => {
    data.init();
  });

  const REGIME_ICONS: Record<Regime, string> = { initiale: 'book', apprentissage: 'briefcase', contrat_pro: 'briefcase', emploi: 'building', autre: 'compass' };
  const regimes = Object.keys(REGIME_LABELS) as Regime[];
  const keepOptions: { value: Company['canKeep']; label: string }[] = [
    { value: 'oui', label: 'Oui' },
    { value: 'peut-etre', label: 'Peut-être' },
    { value: 'non', label: 'Non' }
  ];
  const alternant = $derived(isAlternant(app.profile));

  /** En alternance avec une entreprise qui peut te garder : l'alternance devient souhaitée par défaut. */
  function syncAlternancePreference() {
    if (isAlternant(app.profile) && app.profile.company.canKeep !== 'non' && app.profile.alternance === 'indifferent') {
      app.profile.alternance = 'oui';
    }
  }
  function setRegime(r: Regime) {
    app.profile.regime = r;
    syncAlternancePreference();
  }
</script>

<div class="stack" style="--gap: 32px">
  <div class="field">
    <span class="field-label">Que fais-tu actuellement ?</span>
    <div class="regimes" role="radiogroup" aria-label="Situation actuelle">
      {#each regimes as r (r)}
        <button type="button" role="radio" aria-checked={app.profile.regime === r} class="regime" onclick={() => setRegime(r)}>
          <Icon name={REGIME_ICONS[r]} size={20} />
          <span>{REGIME_LABELS[r]}</span>
        </button>
      {/each}
    </div>
  </div>

  {#if alternant}
    <section class="card card-flat company fade-in">
      <h2 class="h"><Icon name="building" size={20} /> Ton entreprise</h2>
      <div class="grid">
        <div class="field">
          <label for="company-name">Nom de l’entreprise <span class="faint small">(facultatif)</span></label>
          <input id="company-name" class="input" type="text" autocomplete="organization" placeholder="Ex. : un transporteur, un bureau d’études…" bind:value={app.profile.company.name} />
        </div>
        <div class="field">
          <label for="company-sector">Son secteur d’activité</label>
          <select id="company-sector" class="select" value={app.profile.company.sector ?? ''} onchange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            app.profile.company.sector = v === '' ? null : Number(v);
          }}>
            <option value="">Choisir un secteur…</option>
            {#each data.jobs?.sectors ?? [] as s, i (s)}
              <option value={i}>{s}</option>
            {/each}
          </select>
        </div>
      </div>
      <CommuneSearch
        bind:value={app.profile.company.place}
        label="Où se trouve ton entreprise ?"
        hint="Pour estimer si tu peux suivre une formation tout en restant dans ton entreprise."
      />
      <div class="field">
        <span class="field-label">Ton entreprise peut-elle te garder en alternance pour ta prochaine formation ?</span>
        <Segmented options={keepOptions} bind:value={app.profile.company.canKeep} label="Continuer avec l’entreprise" onchange={syncAlternancePreference} />
      </div>
    </section>
  {/if}

  {#if alternant || app.profile.regime === 'emploi'}
    <div class="field">
      <label for="missions">Ton poste et tes missions</label>
      <p class="field-hint">Quelques mots-clés suffisent : ils sont rapprochés du contenu des formations.</p>
      <textarea id="missions" class="input area" rows="3" placeholder="Ex. : assistant logisticien, gestion des approvisionnements, optimisation des stocks" bind:value={app.profile.missions}></textarea>
    </div>
  {/if}

  <div class="field">
    <label for="subject">Le sujet sur lequel tu travailles en ce moment</label>
    <p class="field-hint">Projet tutoré, mémoire, stage, projet personnel… Il aide à trouver les formations qui prolongent ce qui te motive.</p>
    <textarea id="subject" class="input area" rows="3" placeholder="Ex. : réduire l’empreinte carbone du transport de marchandises" bind:value={app.profile.subject}></textarea>
  </div>
</div>

<style>
  .regimes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  .regime {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 58px;
    padding: 10px 16px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    text-align: left;
    font-weight: 600;
    font-size: 0.93rem;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .regime:hover {
    border-color: var(--brand);
    color: var(--text);
  }
  .regime[aria-checked='true'] {
    border-color: var(--brand);
    background: var(--brand-soft);
    color: var(--brand-strong);
  }
  .company {
    display: flex;
    flex-direction: column;
    gap: 22px;
    background: var(--surface-2);
    border: 0;
  }
  .h {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.15rem;
    margin: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .area {
    resize: vertical;
    line-height: 1.5;
    min-height: 84px;
  }
  @media (max-width: 760px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
