<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import WeightSlider from '../../components/WeightSlider.svelte';
  import { CRITERIA, FAMILIES, PRESETS } from '../../lib/criteria';
  import { app } from '../../lib/state.svelte';

  const total = $derived(CRITERIA.reduce((s, c) => s + (app.weights[c.id] ?? 0), 0));
  const activePreset = $derived(PRESETS.find((p) => CRITERIA.every((c) => p.weights[c.id] === app.weights[c.id]))?.id);
  const FAMILY_COLORS: Record<string, string> = {
    projet: '#5b6cff', reussite: '#2bb3a3', avenir: '#f59f2a', argent: '#e0567a', quotidien: '#8a63d2', planete: '#4caf50'
  };
</script>

<div class="stack" style="--gap: 28px">
  <div class="field">
    <span class="field-label">Pars d’un profil type, puis ajuste</span>
    <div class="presets">
      {#each PRESETS as p (p.id)}
        <button type="button" class="preset" aria-pressed={activePreset === p.id} onclick={() => (app.weights = { ...p.weights })}>
          <strong>{p.label}</strong>
          <span class="small muted">{p.description}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="mix" aria-label="Répartition du calcul">
    <div class="bar">
      {#each CRITERIA as c (c.id)}
        {#if app.weights[c.id] > 0}
          <span
            style="flex: {app.weights[c.id]}; background: {FAMILY_COLORS[c.family]}"
            title="{c.label} : {Math.round((app.weights[c.id] / total) * 100)} %"
          ></span>
        {/if}
      {/each}
    </div>
    <div class="legend small muted">
      {#each FAMILIES as f (f.id)}
        <span><i style="background: {FAMILY_COLORS[f.id]}"></i>{f.label}</span>
      {/each}
    </div>
  </div>

  <div class="families">
    {#each FAMILIES as f (f.id)}
      <section class="fam card card-flat">
        <h3><span class="dot" style="background: {FAMILY_COLORS[f.id]}"></span>{f.label}</h3>
        {#each CRITERIA.filter((c) => c.family === f.id) as c (c.id)}
          <WeightSlider criterion={c} bind:value={app.weights[c.id]} share={total ? app.weights[c.id] / total : 0} />
        {/each}
      </section>
    {/each}
  </div>

  <p class="small muted note">
    <Icon name="info" size={16} class="inline" /> Le taux de compatibilité est la moyenne des 13 notes (de 0 à 100), pondérée
    par ces importances. Un critère « Ne compte pas » est ignoré. Tu pourras tout réajuster depuis les résultats, qui se
    mettent à jour en direct.
  </p>
</div>

<style>
  .presets {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 10px;
  }
  .preset {
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    padding: 14px 16px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    cursor: pointer;
    transition: all 0.15s;
  }
  .preset:hover {
    border-color: var(--brand);
  }
  .preset[aria-pressed='true'] {
    border-color: var(--brand);
    background: var(--brand-soft);
  }
  .mix {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bar {
    display: flex;
    height: 14px;
    border-radius: 99px;
    overflow: hidden;
    gap: 2px;
    background: var(--surface-2);
  }
  .bar span {
    transition: flex 0.25s ease;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 3px;
    margin-right: 6px;
  }
  .families {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 18px;
  }
  .fam h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 4px;
  }
  .note :global(.inline) {
    display: inline;
    vertical-align: -3px;
  }
  @media (max-width: 480px) {
    .families {
      grid-template-columns: 1fr;
    }
  }
</style>
