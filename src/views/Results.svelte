<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import MapView from '../components/MapView.svelte';
  import OfferCard from '../components/OfferCard.svelte';
  import OfferDetail from '../components/OfferDetail.svelte';
  import WeightSlider from '../components/WeightSlider.svelte';
  import Range from '../components/ui/Range.svelte';
  import Segmented from '../components/ui/Segmented.svelte';
  import { TYPES, TYPES_BY_LEVEL } from '../lib/constants';
  import { CRITERIA, PRESETS } from '../lib/criteria';
  import { fmtInt } from '../lib/format';
  import { LEVEL_LABELS } from '../lib/profile';
  import { SORT_LABELS, assessAll, focusDomains, prefilter, rankAll, type SortKey } from '../lib/ranking';
  import { app, defaultFilters, router, type Filters } from '../lib/state.svelte';
  import { data } from '../lib/store.svelte';
  import type { OfferType, Profile, Weights } from '../lib/types';

  let view = $state<'list' | 'map'>('list');
  let sort = $state<SortKey>('score');
  let shown = $state(20);
  let openId = $state<string | null>(null);
  let showFilters = $state(false);
  let showWeights = $state(false);
  let onlyFavorites = $state(false);

  $effect(() => {
    data.ensure(app.profile.level);
  });

  // Copies simples (sans proxy) pour des calculs rapides sur des milliers de formations.
  const profile = $derived($state.snapshot(app.profile) as Profile);
  const filters = $derived($state.snapshot(app.filters) as Filters);
  const weights = $derived($state.snapshot(app.weights) as Weights);

  const candidates = $derived(prefilter(data.offers, profile, filters, data.jobs ?? undefined));
  const assessed = $derived(assessAll(candidates, profile, data.ctx));
  const ranked = $derived(rankAll(assessed, weights, filters, sort));
  const visible = $derived(onlyFavorites ? ranked.filter((r) => app.favorites.includes(r.a.offer.id)) : ranked);
  const weightTotal = $derived(CRITERIA.reduce((s, c) => s + (weights[c.id] ?? 0), 0));
  const hasProject = $derived(!!`${profile.projectText} ${profile.subject} ${profile.missions}`.trim());
  const hiddenByDomain = $derived(!filters.allDomains && focusDomains(profile, data.jobs ?? undefined).domains.size > 0);

  $effect(() => {
    // Revenir en haut de liste quand les critères changent.
    void filters;
    void sort;
    shown = 20;
  });

  function toggleType(t: OfferType) {
    const cur = app.filters.types;
    app.filters.types = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
  }
  const sortOptions = Object.entries(SORT_LABELS) as [SortKey, string][];
</script>

<div class="results container">
  <header class="top">
    <div>
      <span class="eyebrow"><Icon name="target" size={16} /> Profil {LEVEL_LABELS[app.profile.level]}{app.profile.home ? ` · ${app.profile.home.nom}` : ''}</span>
      <h1>Tes formations compatibles</h1>
      <p class="muted lead">
        {#if data.loading}
          Chargement des formations…
        {:else}
          <strong class="num">{fmtInt(visible.length)}</strong> formation{visible.length > 1 ? 's' : ''} correspondent à tes filtres,
          classées selon tes priorités.
          {#if hiddenByDomain}<button class="linkbtn" onclick={() => (app.filters.allDomains = true)}>Élargir à tous les domaines</button>{/if}
        {/if}
      </p>
    </div>
    <div class="tools">
      <Segmented
        options={[
          { value: 'list', label: 'Liste' },
          { value: 'map', label: 'Carte' }
        ]}
        bind:value={view}
        label="Affichage"
      />
      <label class="sort">
        <span class="small muted">Trier par</span>
        <select class="select" bind:value={sort}>
          {#each sortOptions as [k, label] (k)}<option value={k}>{label}</option>{/each}
        </select>
      </label>
    </div>
  </header>

  {#if !app.profile.home}
    <div class="notice">
      <Icon name="pin" size={18} />
      <span>Indique ta commune pour calculer distances, trajets, empreinte carbone et loyers.</span>
      <a class="btn btn-sm btn-primary" href="#/profil/6">Ajouter ma commune</a>
    </div>
  {/if}

  <div class="layout">
    <aside class="side">
      <button class="btn btn-outline mobile-toggle" onclick={() => (showFilters = !showFilters)} aria-expanded={showFilters}>
        <Icon name="filter" size={18} /> Filtres et priorités
      </button>
      <div class="side-inner" class:open={showFilters}>
        <section class="card card-flat box">
          <h2 class="h"><Icon name="filter" size={18} /> Filtres</h2>
          <div class="search">
            <Icon name="search" size={18} />
            <input class="input" type="search" placeholder="Mot-clé, ville, établissement…" bind:value={app.filters.query} aria-label="Rechercher" />
          </div>

          <div class="field">
            <span class="field-label small">Rayon autour de chez toi</span>
            <select class="select" bind:value={app.profile.maxDistanceKm}>
              <option value={30}>30 km</option>
              <option value={80}>80 km</option>
              <option value={150}>150 km</option>
              <option value={300}>300 km</option>
              <option value={0}>Toute la France</option>
            </select>
          </div>

          <div class="field">
            <span class="field-label small">Types de formation</span>
            <div class="chips sm">
              {#each TYPES_BY_LEVEL[app.profile.level] as t (t)}
                <button type="button" class="chip" aria-pressed={app.filters.types.includes(t)} onclick={() => toggleType(t)}>{TYPES[t].short}</button>
              {/each}
            </div>
          </div>

          <div class="checks">
            <label><input type="checkbox" bind:checked={app.filters.publicOnly} /> Établissements publics uniquement</label>
            <label><input type="checkbox" bind:checked={app.filters.alternanceOnly} /> Alternance possible</label>
            <label><input type="checkbox" bind:checked={app.filters.withinBudget} /> Dans mon budget</label>
            <label><input type="checkbox" bind:checked={app.filters.allDomains} /> Tous les domaines (pas seulement mes intérêts)</label>
            <label><input type="checkbox" bind:checked={onlyFavorites} /> Mes favoris ({app.favorites.length})</label>
          </div>

          <Range label="Compatibilité minimale" min={0} max={90} step={5} bind:value={app.filters.minScore} format={(v) => (v ? `${v} %` : 'Aucune')} />
          <Range label="Proximité minimale avec ton projet" min={0} max={90} step={5} bind:value={app.filters.minProjet} format={(v) => (v ? `${v} %` : 'Aucune')} />
          {#if !hasProject}
            <p class="small muted">Décris <a href="#/profil/4">ton projet</a> ou <a href="#/profil/2">ton sujet</a> pour trier et filtrer par proximité.</p>
          {/if}

          <button class="btn btn-ghost btn-sm reset" onclick={() => (app.filters = defaultFilters())}><Icon name="refresh" size={16} /> Réinitialiser les filtres</button>
        </section>

        <section class="card card-flat box">
          <button class="h toggle" onclick={() => (showWeights = !showWeights)} aria-expanded={showWeights}>
            <Icon name="sliders" size={18} /> Ajuster mes priorités
            <span class="spacer"></span>
            <Icon name={showWeights ? 'up' : 'down'} size={18} />
          </button>
          <p class="small muted">Le classement se met à jour en direct.</p>
          {#if showWeights}
            <div class="chips sm presets">
              {#each PRESETS as p (p.id)}
                <button type="button" class="chip" onclick={() => (app.weights = { ...p.weights })}>{p.label}</button>
              {/each}
            </div>
            {#each CRITERIA as c (c.id)}
              <WeightSlider criterion={c} bind:value={app.weights[c.id]} share={weightTotal ? app.weights[c.id] / weightTotal : 0} compact />
            {/each}
          {/if}
        </section>

        <a class="btn btn-ghost btn-sm" href="#/profil/1"><Icon name="edit" size={16} /> Modifier mon profil</a>
      </div>
    </aside>

    <main class="list">
      {#if data.error}
        <div class="card empty">
          <Icon name="alert" size={28} />
          <h2>Les données n’ont pas pu être chargées</h2>
          <p class="muted">{data.error}</p>
        </div>
      {:else if data.loading && !data.offers.length}
        {#each [1, 2, 3] as i (i)}<div class="card skeleton"></div>{/each}
      {:else if view === 'map'}
        <MapView items={visible} home={app.profile.home} onopen={(id) => (openId = id)} />
      {:else if !visible.length}
        <div class="card empty">
          <Icon name="search" size={28} />
          <h2>Aucune formation ne correspond</h2>
          <p class="muted">Élargis le rayon, choisis plus de domaines ou retire quelques filtres.</p>
          <div class="row" style="justify-content:center">
            <button class="btn btn-primary" onclick={() => { app.filters = defaultFilters(); app.filters.allDomains = true; }}>Tout afficher</button>
            <button class="btn btn-outline" onclick={() => (app.profile.maxDistanceKm = 0)}>Toute la France</button>
          </div>
        </div>
      {:else}
        {#if app.compare.length}
          <div class="compare-bar card">
            <Icon name="columns" size={18} />
            <span><strong>{app.compare.length}</strong> formation{app.compare.length > 1 ? 's' : ''} à comparer (4 au maximum)</span>
            <span class="spacer"></span>
            <button class="btn btn-ghost btn-sm" onclick={() => (app.compare = [])}>Vider</button>
            <button class="btn btn-primary btn-sm" onclick={() => router.go('/comparer')} disabled={app.compare.length < 2}>Comparer</button>
          </div>
        {/if}
        <ol class="cards">
          {#each visible.slice(0, shown) as item, i (item.a.offer.id)}
            <li><OfferCard {item} rank={i + 1} projet={sort === 'projet' || filters.minProjet > 0} onopen={(id) => (openId = id)} /></li>
          {/each}
        </ol>
        {#if shown < visible.length}
          <div class="more">
            <button class="btn btn-outline" onclick={() => (shown += 20)}>Voir 20 formations de plus</button>
            <span class="small faint">{fmtInt(shown)} sur {fmtInt(visible.length)}</span>
          </div>
        {/if}
      {/if}
    </main>
  </div>
</div>

<OfferDetail id={openId} onclose={() => (openId = null)} />

<style>
  .results {
    padding-top: 32px;
    padding-bottom: 64px;
  }
  .top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .top h1 {
    margin: 8px 0 6px;
    font-size: clamp(1.7rem, 1.2rem + 1.6vw, 2.4rem);
  }
  .lead {
    margin: 0;
  }
  .linkbtn {
    border: 0;
    background: none;
    color: var(--brand);
    font-weight: 650;
    cursor: pointer;
    padding: 0;
    margin-left: 6px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .sort {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sort .select {
    width: auto;
    min-height: 44px;
  }
  .notice {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    margin-bottom: 20px;
    border-radius: var(--r-md);
    background: var(--accent-soft);
  }
  .notice span {
    flex: 1;
  }
  .layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 28px;
    align-items: start;
  }
  .side {
    position: sticky;
    top: 88px;
    max-height: calc(100vh - 104px);
    overflow-y: auto;
    padding-right: 4px;
  }
  .side-inner {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .mobile-toggle {
    display: none;
  }
  .box {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .h {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.02rem;
    font-weight: 750;
    margin: 0;
  }
  .toggle {
    border: 0;
    background: none;
    padding: 0;
    cursor: pointer;
    color: var(--text);
    width: 100%;
    text-align: left;
  }
  .box .toggle + p {
    margin: -10px 0 0;
  }
  .search {
    position: relative;
  }
  .search :global(svg) {
    position: absolute;
    left: 12px;
    top: 14px;
    color: var(--faint);
  }
  .search .input {
    padding-left: 38px;
  }
  .chips.sm {
    gap: 6px;
  }
  .chips.sm .chip {
    min-height: 34px;
    padding: 0 12px;
    font-size: 0.85rem;
  }
  .checks {
    display: grid;
    gap: 10px;
    font-size: 0.92rem;
  }
  .checks label {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    cursor: pointer;
  }
  .checks input {
    width: 18px;
    height: 18px;
    accent-color: var(--brand);
    margin-top: 2px;
  }
  .reset {
    align-self: flex-start;
  }
  .presets {
    margin-bottom: 6px;
  }
  .cards {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 14px;
  }
  .more {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
  }
  .empty {
    text-align: center;
    padding: 48px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--muted);
  }
  .empty h2 {
    color: var(--text);
    margin: 8px 0 0;
  }
  .skeleton {
    height: 150px;
    margin-bottom: 14px;
    background: linear-gradient(90deg, var(--surface) 0%, var(--surface-2) 50%, var(--surface) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
  }
  @keyframes shimmer {
    to { background-position: -200% 0; }
  }
  .compare-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    margin-bottom: 14px;
    position: sticky;
    top: 76px;
    z-index: 5;
    background: var(--brand-soft);
    border-color: var(--brand);
  }
  @media (max-width: 980px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .side {
      position: static;
      max-height: none;
      overflow: visible;
    }
    .mobile-toggle {
      display: inline-flex;
      width: 100%;
    }
    .side-inner {
      display: none;
      margin-top: 12px;
    }
    .side-inner.open {
      display: flex;
    }
  }
</style>
