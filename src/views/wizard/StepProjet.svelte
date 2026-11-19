<script lang="ts">
  import DomainPicker from '../../components/DomainPicker.svelte';
  import Icon from '../../components/Icon.svelte';
  import Segmented from '../../components/ui/Segmented.svelte';
  import { TYPES, TYPES_BY_LEVEL } from '../../lib/constants';
  import { app } from '../../lib/state.svelte';
  import type { AlternancePref, OfferType } from '../../lib/types';

  const alternanceOptions: { value: AlternancePref; label: string }[] = [
    { value: 'indifferent', label: 'Peu importe' },
    { value: 'oui', label: 'Je la souhaite' },
    { value: 'uniquement', label: 'Uniquement' },
    { value: 'non', label: 'Je n’en veux pas' }
  ];
  const count = $derived(Object.values(app.profile.interests).filter(Boolean).length);

  function toggleType(t: OfferType) {
    const cur = app.profile.types;
    app.profile.types = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
  }
</script>

<div class="stack" style="--gap: 36px">
  <section>
    <div class="row">
      <h2 class="h">Ce qui t’attire</h2>
      <span class="spacer"></span>
      <span class="badge {count ? 'badge-brand' : ''}">{count} domaine{count > 1 ? 's' : ''} choisi{count > 1 ? 's' : ''}</span>
    </div>
    <p class="muted">
      Touche les domaines qui t’intéressent, puis le <Icon name="heart" size={16} class="inline" /> pour ceux qui te
      passionnent vraiment. Les 20 domaines sont ceux de la nomenclature de l’ONISEP.
    </p>
    <DomainPicker bind:interests={app.profile.interests} />
  </section>

  <section class="field">
    <span class="field-label">Les types de formation qui t’intéressent</span>
    <p class="field-hint">Laisse vide si tu es ouvert·e à tout : aucun type ne sera favorisé.</p>
    <div class="chips">
      {#each TYPES_BY_LEVEL[app.profile.level] as t (t)}
        <button type="button" class="chip" aria-pressed={app.profile.types.includes(t)} onclick={() => toggleType(t)}>
          {TYPES[t].label}
        </button>
      {/each}
    </div>
  </section>

  <section class="field">
    <span class="field-label">L’alternance (apprentissage, contrat de professionnalisation)</span>
    <p class="field-hint">
      En alternance, les frais de scolarité sont pris en charge et tu es rémunéré·e : le budget est recalculé en conséquence.
    </p>
    <Segmented options={alternanceOptions} bind:value={app.profile.alternance} label="Alternance" />
  </section>
</div>

<style>
  .h {
    font-size: 1.2rem;
    margin: 0;
  }
  :global(.inline) {
    display: inline;
    vertical-align: -3px;
  }
</style>
