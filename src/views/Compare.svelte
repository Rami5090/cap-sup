<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import OfferDetail from '../components/OfferDetail.svelte';
  import Radar from '../components/Radar.svelte';
  import ScoreRing from '../components/ui/ScoreRing.svelte';
  import { STATUT_LABELS, TYPES } from '../lib/constants';
  import { CRITERIA, IMPORTANCE_LABELS } from '../lib/criteria';
  import { fmtDuration, fmtEuro, fmtInt, fmtKm, fmtPct, scoreTone } from '../lib/format';
  import { assess, combine } from '../lib/scoring';
  import { app } from '../lib/state.svelte';
  import { data } from '../lib/store.svelte';
  import type { Profile } from '../lib/types';

  const COLORS = ['#2f45c5', '#e0731a', '#12805c', '#c93a4f'];
  let openId = $state<string | null>(null);

  $effect(() => {
    data.ensure(app.profile.level);
  });

  const items = $derived.by(() => {
    const p = $state.snapshot(app.profile) as Profile;
    return app.compare
      .map((id) => data.byId.get(id))
      .filter((o) => !!o)
      .map((o, i) => {
        const a = assess(o!, p, data.ctx, true);
        return { ...a, ...combine(a, app.weights), color: COLORS[i % COLORS.length] };
      });
  });
  const best = $derived(items.length ? Math.max(...items.map((x) => x.total)) : 0);
  // Le radar ne montre que les critères comptés et applicables à toutes les formations comparées.
  const radarCriteria = $derived(CRITERIA.filter((c) => app.weights[c.id] > 0 && items.every((it) => it.scores[c.id].score != null)));
</script>

<div class="compare container">
  <header class="top">
    <span class="eyebrow"><Icon name="columns" size={16} /> Comparateur</span>
    <h1>Comparer tes options</h1>
    <p class="muted">Jusqu’à 4 formations côte à côte, avec les mêmes priorités que dans tes résultats.</p>
  </header>

  {#if items.length < 2}
    <div class="card empty">
      <Icon name="columns" size={30} />
      <h2>Ajoute au moins deux formations</h2>
      <p class="muted">Depuis tes résultats, clique sur l’icône <Icon name="columns" size={16} class="inline" /> des formations qui t’intéressent.</p>
      <a class="btn btn-primary" href="#/resultats">Retour aux résultats</a>
    </div>
  {:else}
    <div class="heads" style="--n: {items.length}">
      {#each items as it (it.offer.id)}
        <article class="card head" style="--c: {it.color}">
          <div class="row">
            <ScoreRing score={it.total} size={64} />
            {#if it.total === best}<span class="badge badge-great">Meilleur taux</span>{/if}
            <span class="spacer"></span>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label="Retirer {it.offer.nm}" onclick={() => app.toggleCompare(it.offer.id)}><Icon name="x" size={16} /></button>
          </div>
          <span class="badge badge-brand">{TYPES[it.offer.ty].short}</span>
          <h2><button class="linklike" onclick={() => (openId = it.offer.id)}>{it.offer.nm}</button></h2>
          {#if it.offer.pc}<p class="small muted">{it.offer.pc}</p>{/if}
          <p class="small">{it.offer.etab}<br /><span class="muted">{it.offer.commune.nom} · {STATUT_LABELS[it.offer.st ?? 0]}</span></p>
        </article>
      {/each}
    </div>

    <section class="card radar-card">
      <h2 class="h">Profil de compatibilité</h2>
      <div class="radar-wrap">
        <Radar axes={radarCriteria.map((c) => c.short)} series={items.map((it) => ({ label: it.offer.id, color: it.color, values: radarCriteria.map((c) => it.scores[c.id].score) }))} />
        <div>
          <ul class="legend">
            {#each items as it (it.offer.id)}
              <li><i style="background: {it.color}"></i>{it.offer.nm} <span class="faint">· {it.offer.commune.nom}</span></li>
            {/each}
          </ul>
          {#if radarCriteria.length < CRITERIA.length}
            <p class="tiny faint note">Le graphique montre les critères comptés et applicables à toutes ces formations. Le tableau ci-dessous les détaille tous.</p>
          {/if}
        </div>
      </div>
    </section>

    <section class="card table-card">
      <h2 class="h">Critère par critère</h2>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Critère <span class="tiny faint">(importance)</span></th>
              {#each items as it (it.offer.id)}<th style="color: {it.color}">{it.offer.nm.length > 28 ? `${it.offer.nm.slice(0, 26)}…` : it.offer.nm}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each CRITERIA as c (c.id)}
              {@const vals = items.map((it) => it.scores[c.id].score)}
              {@const top = Math.max(...vals.map((v) => v ?? -1))}
              <tr class:off={app.weights[c.id] === 0}>
                <th scope="row">{c.label}<br /><span class="tiny faint">{IMPORTANCE_LABELS[app.weights[c.id]]}</span></th>
                {#each items as it (it.offer.id)}
                  {@const s = it.scores[c.id]}
                  <td>
                    <span class="sc num tone-{scoreTone(s.score)}" class:top={s.score != null && s.score === top && vals.filter((v) => v === top).length === 1}>{s.score ?? '–'}</span>
                    <span class="tiny muted">{s.summary}</span>
                  </td>
                {/each}
              </tr>
            {/each}
            <tr class="sep">
              <th scope="row">Budget mensuel</th>
              {#each items as it (it.offer.id)}<td class="num" class:neg={it.budget.balance < 0}><strong>{it.budget.balance >= 0 ? '+' : ''}{fmtEuro(it.budget.balance)}</strong> <span class="tiny muted">/ mois</span></td>{/each}
            </tr>
            <tr>
              <th scope="row">Frais de scolarité</th>
              {#each items as it (it.offer.id)}<td class="num">{it.offer.fe ? `${fmtEuro(it.offer.fe)}/an` : 'Aucun'}{it.offer.fs === 'e' ? ' (estimé)' : ''}</td>{/each}
            </tr>
            <tr>
              <th scope="row">Trajet</th>
              {#each items as it (it.offer.id)}
                <td class="num">{Number.isFinite(it.mobility.distanceKm) ? fmtKm(it.mobility.distanceKm) : '–'} · {it.mobility.moves ? 'déménagement' : `≈ ${fmtDuration(it.mobility.commuteMin)}`}</td>
              {/each}
            </tr>
            <tr>
              <th scope="row">Taux de propositions 2025</th>
              {#each items as it (it.offer.id)}<td class="num">{it.offer.ta != null ? fmtPct(it.offer.ta) : 'n.d.'}</td>{/each}
            </tr>
            <tr>
              <th scope="row">Emploi salarié à 18 mois</th>
              {#each items as it (it.offer.id)}<td class="num">{it.offer.in ? fmtPct(it.offer.in[0]) : 'n.d.'}</td>{/each}
            </tr>
            <tr>
              <th scope="row">CO2 des trajets</th>
              {#each items as it (it.offer.id)}<td class="num">≈ {fmtInt(it.mobility.co2KgYear)} kg/an</td>{/each}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</div>

<OfferDetail id={openId} onclose={() => (openId = null)} />

<style>
  .compare {
    padding-top: 32px;
    padding-bottom: 64px;
  }
  .top h1 {
    margin: 8px 0 6px;
  }
  .heads {
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: 14px;
    margin: 24px 0;
  }
  .head {
    border-top: 5px solid var(--c);
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px;
  }
  .head .badge-brand {
    align-self: flex-start;
  }
  .head h2 {
    font-size: 1.05rem;
    margin: 0;
  }
  .head p {
    margin: 0;
  }
  .linklike {
    border: 0;
    background: none;
    padding: 0;
    text-align: left;
    font: inherit;
    font-weight: 700;
    color: var(--text);
    cursor: pointer;
  }
  .linklike:hover {
    color: var(--brand-strong);
    text-decoration: underline;
  }
  .h {
    font-size: 1.2rem;
  }
  .radar-card {
    margin-bottom: 20px;
  }
  .radar-wrap {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 24px;
    align-items: center;
  }
  .legend {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;
  }
  .legend i {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 4px;
    margin-right: 8px;
    vertical-align: -1px;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 640px;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 12px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 0.9rem;
  }
  thead th {
    font-size: 0.85rem;
  }
  tbody th {
    font-weight: 650;
    width: 200px;
  }
  td {
    min-width: 150px;
  }
  .sc {
    display: inline-block;
    min-width: 40px;
    padding: 2px 8px;
    margin-right: 6px;
    border-radius: 8px;
    font-weight: 800;
    background: var(--tone-soft);
    color: var(--tone);
    text-align: center;
  }
  .sc.top {
    outline: 2px solid var(--tone);
  }
  tr.off {
    opacity: 0.55;
  }
  tr.sep th,
  tr.sep td {
    border-top: 2px solid var(--border-strong);
  }
  td.neg strong {
    color: var(--weak);
  }
  .empty {
    text-align: center;
    padding: 48px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: 24px;
  }
  :global(.inline) {
    display: inline;
    vertical-align: -3px;
  }
  @media (max-width: 860px) {
    .heads {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .radar-wrap {
      grid-template-columns: 1fr;
    }
  }
</style>
