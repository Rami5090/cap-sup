<script lang="ts">
  import { STATUT_LABELS, TYPES } from '../lib/constants';
  import { CRITERIA, CRITERION_BY_ID } from '../lib/criteria';
  import { fmtDuration, fmtEuro, fmtKm, fmtPct, scoreTone } from '../lib/format';
  import type { Ranked } from '../lib/ranking';
  import { isApprentice } from '../lib/scoring';
  import { app } from '../lib/state.svelte';
  import Icon from './Icon.svelte';
  import ScoreRing from './ui/ScoreRing.svelte';

  interface Props {
    item: Ranked;
    rank: number;
    projet?: boolean; // afficher la proximité avec le projet (tri ou filtre par proximité)
    onopen: (id: string) => void;
  }
  let { item, rank, projet = false, onopen }: Props = $props();
  const proximity = $derived(item.a.scores.thematique.score);

  const o = $derived(item.a.offer);
  const m = $derived(item.a.mobility);
  const fav = $derived(app.favorites.includes(o.id));
  const inCompare = $derived(app.compare.includes(o.id));

  // Points forts / faibles parmi les critères importants pour l'étudiant.
  const highlights = $derived.by(() => {
    const list = CRITERIA.map((c) => ({ c, s: item.a.scores[c.id].score, w: app.weights[c.id] })).filter((x) => x.s != null && x.w >= 3);
    const strong = list.filter((x) => (x.s ?? 0) >= 70).sort((a, b) => b.w * b.s! - a.w * a.s!).slice(0, 3);
    const weak = list.filter((x) => (x.s ?? 100) < 45).sort((a, b) => b.w * (100 - b.s!) - a.w * (100 - a.s!)).slice(0, 2);
    return { strong, weak };
  });

  const where = $derived.by(() => {
    if (!Number.isFinite(m.distanceKm)) return o.commune.nom;
    if (m.tooFar) return `${fmtKm(m.distanceKm)} · trajet trop long`;
    if (m.moves) return `${fmtKm(m.distanceKm)} · déménagement`;
    return `${m.distanceKm < 1 ? 'dans ta commune' : fmtKm(m.distanceKm)} · ≈ ${fmtDuration(m.commuteMin)}`;
  });
  const apprentice = $derived(isApprentice(o, app.profile));
</script>

<article class="offer card" class:fav>
  <div class="score">
    <ScoreRing score={item.total} size={70} />
    <span class="rank small faint">n° {rank}</span>
  </div>

  <div class="main">
    <div class="row top">
      {#if projet && proximity != null}
        <span class="badge badge-{scoreTone(proximity)}" title="Mots en commun entre ton projet, ton sujet et la formation">Proximité avec ton projet : {proximity} %</span>
      {/if}
      <span class="badge badge-brand">{TYPES[o.ty].short}</span>
      {#if (o.al ?? 0) >= 1}<span class="badge badge-accent">{o.al === 2 ? 'En alternance' : 'Alternance possible'}</span>{/if}
      <span class="badge">{STATUT_LABELS[o.st ?? 0]}</span>
      {#if o.ta != null}<span class="badge" title="Part des candidats ayant reçu une proposition (2025)">{fmtPct(o.ta)} de propositions</span>{/if}
    </div>
    <h3><button class="linklike" onclick={() => onopen(o.id)}>{o.nm}</button></h3>
    {#if o.pc}<p class="pc muted">{o.pc}</p>{/if}
    <p class="meta small">
      <span><Icon name="building" size={16} /> {o.etab}</span>
      <span><Icon name="pin" size={16} /> {o.commune.nom} ({o.commune.dep}) · {where}</span>
      <span><Icon name="wallet" size={16} /> {apprentice ? 'Frais pris en charge (alternance)' : o.fe ? `${fmtEuro(o.fe)}/an${o.fs === 'e' ? ' (estimé)' : ''}` : 'Sans frais de scolarité'}</span>
    </p>

    {#if highlights.strong.length || highlights.weak.length}
      <ul class="hl">
        {#each highlights.strong as h (h.c.id)}
          <li class="tone-{scoreTone(h.s)}"><Icon name="check" size={14} stroke={2.6} /> {CRITERION_BY_ID[h.c.id].label}</li>
        {/each}
        {#each highlights.weak as h (h.c.id)}
          <li class="tone-weak"><Icon name="alert" size={14} /> {CRITERION_BY_ID[h.c.id].label}</li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="actions">
    <button class="btn btn-ghost btn-icon btn-sm" aria-pressed={fav} aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} title="Favori" onclick={() => app.toggleFavorite(o.id)}>
      <Icon name={fav ? 'starfill' : 'star'} size={18} />
    </button>
    <button
      class="btn btn-ghost btn-icon btn-sm"
      aria-pressed={inCompare}
      aria-label={inCompare ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
      title={inCompare ? 'Dans la comparaison' : app.compare.length >= 4 ? 'Comparaison pleine (4 maximum)' : 'Comparer'}
      disabled={!inCompare && app.compare.length >= 4}
      onclick={() => app.toggleCompare(o.id)}
    >
      <Icon name="columns" size={18} />
    </button>
    <button class="btn btn-outline btn-sm detail" onclick={() => onopen(o.id)}>Détail <Icon name="right" size={16} /></button>
  </div>
</article>

<style>
  .offer {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: start;
    padding: 22px 24px;
    transition: box-shadow 0.15s, border-color 0.15s;
  }
  .offer:hover {
    box-shadow: var(--shadow-2);
  }
  .offer.fav {
    border-color: var(--accent);
  }
  .score {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .main {
    min-width: 0;
  }
  .top {
    gap: 6px;
    margin-bottom: 8px;
  }
  h3 {
    margin: 0;
    font-size: 1.12rem;
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
    text-underline-offset: 3px;
  }
  .pc {
    margin: 4px 0 0;
    font-size: 0.95rem;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    margin: 12px 0 0;
    color: var(--muted);
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .hl {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0;
    margin: 14px 0 0;
  }
  .hl li {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 99px;
    font-size: 0.8rem;
    font-weight: 650;
    background: var(--tone-soft);
    color: var(--tone);
  }
  .actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .actions [aria-pressed='true'] {
    color: var(--brand-strong);
    background: var(--brand-soft);
  }
  .actions [aria-pressed='true'][aria-label*='favoris'] {
    color: #d98300;
    background: var(--accent-soft);
  }
  .detail {
    margin-top: 6px;
  }
  @media (max-width: 640px) {
    .offer {
      grid-template-columns: auto 1fr;
      gap: 14px;
      padding: 18px;
    }
    .actions {
      grid-column: 1 / -1;
      flex-direction: row;
      justify-content: flex-end;
    }
    .detail {
      margin-top: 0;
    }
  }
</style>
