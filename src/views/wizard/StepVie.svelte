<script lang="ts">
  import CommuneSearch from '../../components/CommuneSearch.svelte';
  import Icon from '../../components/Icon.svelte';
  import Range from '../../components/ui/Range.svelte';
  import Segmented from '../../components/ui/Segmented.svelte';
  import Toggle from '../../components/ui/Toggle.svelte';
  import { HOUSING_LABELS, TRANSPORT_LABELS } from '../../lib/constants';
  import { fmtDuration } from '../../lib/format';
  import { app } from '../../lib/state.svelte';
  import type { HousingKind, TransportMode } from '../../lib/types';

  const radiusOptions = [
    { value: 30, label: '30 km' },
    { value: 80, label: '80 km' },
    { value: 150, label: '150 km' },
    { value: 300, label: '300 km' },
    { value: 0, label: 'Toute la France' }
  ];
  const housingOptions = (Object.keys(HOUSING_LABELS) as HousingKind[]).map((k) => ({ value: k, label: HOUSING_LABELS[k] }));
  const MODE_ICONS: Record<TransportMode, string> = {
    voiture: 'car', covoit: 'users', bus: 'bus', metro: 'metro', train: 'train', velo: 'bike', vae: 'bolt', marche: 'walk', scooter: 'scooter'
  };
  const modes = Object.keys(TRANSPORT_LABELS) as TransportMode[];
</script>

<div class="stack" style="--gap: 34px">
  <CommuneSearch
    bind:value={app.profile.home}
    label="Où habites-tu aujourd’hui ?"
    hint="Ta commune de résidence (chez tes parents ou ton logement actuel). Elle sert à calculer distances, trajets et empreinte carbone."
  />

  <div class="field">
    <span class="field-label">Jusqu’où es-tu prêt·e à aller ?</span>
    <p class="field-hint">Les formations au-delà de ce rayon ne sont pas proposées.</p>
    <Segmented options={radiusOptions} bind:value={app.profile.maxDistanceKm} label="Rayon de recherche" />
  </div>

  <div class="card card-flat move">
    <Toggle
      bind:checked={app.profile.canMove}
      label="Je peux déménager si la formation est trop loin"
      hint="Sinon, les formations au-delà de ton temps de trajet maximum seront fortement pénalisées."
    />
    {#if app.profile.canMove}
      <div class="field">
        <span class="field-label">Si tu déménages, tu viserais plutôt…</span>
        <Segmented options={housingOptions} bind:value={app.profile.housing} label="Type de logement" />
      </div>
    {/if}
  </div>

  <div class="field">
    <span class="field-label">Ton mode de transport principal</span>
    <div class="modes">
      {#each modes as m (m)}
        <button type="button" class="mode" aria-pressed={app.profile.transport === m} onclick={() => (app.profile.transport = m)}>
          <Icon name={MODE_ICONS[m]} size={22} />
          <span>{TRANSPORT_LABELS[m]}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="two">
    <Range
      label="Temps de trajet maximum (aller)"
      hint="Au-delà, tu préférerais déménager."
      min={15}
      max={120}
      step={5}
      bind:value={app.profile.maxCommuteMin}
      format={fmtDuration}
      minLabel="15 min"
      maxLabel="2 h"
    />
    <Range
      label="Ton énergie disponible par semaine"
      hint="Heures que tu peux consacrer aux études (cours, travail perso, trajets) en restant en forme."
      min={25}
      max={70}
      step={1}
      bind:value={app.profile.weeklyEnergyH}
      format={(v) => `${v} h`}
      minLabel="25 h"
      maxLabel="70 h"
    />
  </div>

  <Range
    label="Heures de job étudiant par semaine"
    hint="Un job prend de l’énergie : il est ajouté à ta charge hebdomadaire (sauf en alternance)."
    min={0}
    max={25}
    step={1}
    bind:value={app.profile.jobHours}
    format={(v) => (v ? `${v} h` : 'Aucun')}
  />
</div>

<style>
  .move {
    display: flex;
    flex-direction: column;
    gap: 22px;
    background: var(--surface-2);
    border: 0;
  }
  .modes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
  }
  .mode {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 86px;
    padding: 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    font-weight: 600;
    font-size: 0.88rem;
    text-align: center;
    cursor: pointer;
    color: var(--muted);
    transition: all 0.15s;
  }
  .mode:hover {
    border-color: var(--brand);
    color: var(--text);
  }
  .mode[aria-pressed='true'] {
    border-color: var(--brand);
    background: var(--brand-soft);
    color: var(--brand-strong);
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  @media (max-width: 760px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
</style>
