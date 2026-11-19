<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import NumberField from '../../components/ui/NumberField.svelte';
  import {
    AIDE_MOBILITE_MASTER, AIDE_MOBILITE_SOURCE, APPRENTI_SOURCE, BOURSES, BOURSES_SOURCE, FEES, FEES_SOURCE, SIMULATEUR_APL,
    SIMULATEUR_BOURSE, SMIC_BRUT, apprenticePct
  } from '../../lib/constants';
  import { fmtEuro } from '../../lib/format';
  import { app } from '../../lib/state.svelte';

  const echelons = Object.keys(BOURSES);
  const apprentice = $derived(SMIC_BRUT * apprenticePct(app.profile.age));
</script>

<div class="stack" style="--gap: 32px">
  <div class="grid">
    <NumberField
      label="Tes ressources mensuelles"
      hint="Aide de ta famille, job étudiant, pension… (hors bourse et APL)"
      bind:value={app.profile.monthlyResources}
      suffix="€/mois"
      step={10}
    />
    <NumberField
      label="Ton épargne mobilisable"
      hint="Ce que tu es prêt·e à utiliser sur l’année (réparti sur 10 mois)"
      bind:value={app.profile.savings}
      suffix="€"
      step={100}
    />
    <div class="field">
      <label for="bourse">Bourse sur critères sociaux</label>
      <p class="field-hint">
        Tu ne connais pas ton échelon ? <a href={SIMULATEUR_BOURSE} target="_blank" rel="noopener">Simulateur officiel du Crous</a>
      </p>
      <select id="bourse" class="select" bind:value={app.profile.bourse}>
        <option value="non">Non boursier·e</option>
        {#each echelons as e (e)}
          <option value={e}>Échelon {e} : {fmtEuro(BOURSES[e])} par an</option>
        {/each}
      </select>
    </div>
    <NumberField
      label="Aide au logement estimée (APL)"
      hint="Comptée seulement si tu déménages. Laisse 0 si tu ne sais pas."
      bind:value={app.profile.apl}
      suffix="€/mois"
      step={10}
    />
    <NumberField
      label="Dépenses de vie courante"
      hint="Alimentation, téléphone, loisirs, santé… (hors logement et transport)"
      bind:value={app.profile.livingCosts}
      suffix="€/mois"
      step={10}
    />
  </div>

  <p class="small">
    <a href={SIMULATEUR_APL} target="_blank" rel="noopener">Estimer mon aide au logement sur caf.fr <Icon name="external" size={14} class="inline" /></a>
  </p>

  <aside class="facts">
    <h3><Icon name="info" size={18} class="inline" /> Repères officiels 2026-2027</h3>
    <ul>
      <li>
        Droits d’inscription dans le public : licence <strong>{fmtEuro(FEES.licence)}</strong>, master
        <strong>{fmtEuro(FEES.master)}</strong>, école d’ingénieurs <strong>{fmtEuro(FEES.ingenieur)}</strong>, plus la CVEC
        (<strong>{fmtEuro(FEES.cvec)}</strong>). Les boursiers en sont exonérés.
        <a href={FEES_SOURCE.url} target="_blank" rel="noopener">Source</a>
      </li>
      <li>
        Bourse sur critères sociaux : de {fmtEuro(BOURSES['0bis'])} à {fmtEuro(BOURSES['7'])} par an, versés en 10 mensualités.
        <a href={BOURSES_SOURCE.url} target="_blank" rel="noopener">Source</a>
      </li>
      <li>
        En alternance, à ton âge, le salaire minimum la 1re année est d’environ
        <strong>{fmtEuro(apprentice)} brut par mois</strong> ({Math.round(apprenticePct(app.profile.age) * 100)} % du SMIC).
        <a href={APPRENTI_SOURCE.url} target="_blank" rel="noopener">Source</a>
      </li>
      {#if app.profile.level === 3}
        <li>
          Boursier·e qui change de région académique pour son M1 ? L’aide à la mobilité en master est de
          <strong>{fmtEuro(AIDE_MOBILITE_MASTER)}</strong>.
          <a href={AIDE_MOBILITE_SOURCE.url} target="_blank" rel="noopener">Source</a>
        </li>
      {/if}
    </ul>
  </aside>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 28px 32px;
  }
  .facts {
    padding: 20px 24px;
    border-radius: var(--r-lg);
    background: var(--brand-soft);
    color: var(--text);
  }
  .facts h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--brand-strong);
  }
  .facts ul {
    margin: 0;
    padding-left: 18px;
    display: grid;
    gap: 10px;
  }
  :global(.inline) {
    display: inline;
    vertical-align: -2px;
  }
</style>
