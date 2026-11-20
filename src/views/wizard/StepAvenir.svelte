<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import { GOALS, LEVEL_LABEL, searchMetiers } from '../../lib/jobs';
  import { app } from '../../lib/state.svelte';
  import { data } from '../../lib/store.svelte';
  import type { DomainId, GoalId, Metier } from '../../lib/types';

  $effect(() => {
    data.init();
  });

  let query = $state('');
  let showAll = $state(false);
  let sectorFilter = $state('');

  // Métiers accessibles après la poursuite d'études visée (niveau d'accès minimum compatible).
  const RANGE: Record<number, [number, number]> = { 3: [3, 6], 2: [2, 5], 0: [0, 5] };
  const range = $derived(RANGE[app.profile.level] ?? [0, 9]);
  const selected = $derived(app.profile.metiers.map((id) => data.jobs?.byId.get(id)).filter((m): m is Metier => !!m));

  const results = $derived.by(() => {
    const jobs = data.jobs;
    if (!jobs) return [];
    if (query.trim().length >= 2) return searchMetiers(jobs, query, 24);
    const sectors = new Set(app.profile.sectors);
    const domains = new Set<DomainId>([...(Object.keys(app.profile.interests) as DomainId[]), ...app.profile.currentDomains]);
    const [lo, hi] = range;
    let list = jobs.metiers.filter((m) => m.fors.length && (m.level == null || (m.level >= lo && m.level <= hi)));
    if (sectors.size) list = list.filter((m) => m.sectors.some((s) => sectors.has(s)));
    else if (domains.size) list = list.filter((m) => m.domains.some((d) => domains.has(d)));
    else return [];
    return list.sort((a, b) => b.fors.length - a.fors.length).slice(0, showAll ? 60 : 12);
  });
  const sectorsShown = $derived(
    (data.jobs?.sectors ?? []).map((s, i) => [s, i] as const).filter(([s]) => !sectorFilter || s.toLowerCase().includes(sectorFilter.toLowerCase()))
  );

  function toggleSector(i: number) {
    const cur = app.profile.sectors;
    app.profile.sectors = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
  }
  function toggleMetier(id: number) {
    const cur = app.profile.metiers;
    app.profile.metiers = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  }
  function toggleGoal(g: GoalId) {
    const cur = app.profile.goals;
    app.profile.goals = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
  }
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<div class="stack" style="--gap: 40px">
  <section>
    <div class="row">
      <h2 class="h"><Icon name="layers" size={20} /> Les secteurs qui t’attirent</h2>
      <span class="spacer"></span>
      <span class="badge {app.profile.sectors.length ? 'badge-brand' : ''}">{app.profile.sectors.length} choisi{app.profile.sectors.length > 1 ? 's' : ''}</span>
    </div>
    <p class="muted">
      Les 48 secteurs d’activité de l’ONISEP, plus larges que les domaines d’études. Par exemple, la logistique mène aussi à
      l’aéronautique, à l’automobile ou au commerce.
    </p>
    <input class="input filter" type="search" placeholder="Filtrer les secteurs…" bind:value={sectorFilter} aria-label="Filtrer les secteurs" />
    <div class="chips sm">
      {#each sectorsShown as [s, i] (i)}
        <button type="button" class="chip" aria-pressed={app.profile.sectors.includes(i)} onclick={() => toggleSector(i)}>{s}</button>
      {/each}
    </div>
  </section>

  <section>
    <div class="row">
      <h2 class="h"><Icon name="target" size={20} /> Les métiers que tu envisages</h2>
      <span class="spacer"></span>
      <span class="badge {selected.length ? 'badge-brand' : ''}">{selected.length} choisi{selected.length > 1 ? 's' : ''}</span>
    </div>
    <p class="muted">Cherche un métier ou pioche dans les suggestions. Les liens entre formations et métiers viennent des fiches métiers de l’ONISEP.</p>

    {#if selected.length}
      <ul class="picked">
        {#each selected as m (m.id)}
          <li>
            <span>{cap(m.name)}</span>
            <button type="button" aria-label="Retirer {m.name}" onclick={() => toggleMetier(m.id)}><Icon name="x" size={14} /></button>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="search">
      <Icon name="search" size={18} />
      <input class="input" type="search" placeholder="Rechercher un métier : aéronautique, logisticien, data…" bind:value={query} aria-label="Rechercher un métier" />
    </div>

    {#if !data.jobs}
      <p class="small faint">Chargement des métiers…</p>
    {:else if !results.length}
      <p class="small muted empty">
        {query.trim().length >= 2 ? 'Aucun métier ne correspond à ta recherche.' : 'Choisis des secteurs ou des centres d’intérêt (étape « Projet ») pour voir des suggestions, ou lance une recherche.'}
      </p>
    {:else}
      <p class="small faint">{query.trim().length >= 2 ? 'Résultats de ta recherche' : `Suggestions accessibles à partir de ${LEVEL_LABEL(range[0])}`}</p>
      <ul class="jobs">
        {#each results as m (m.id)}
          {@const on = app.profile.metiers.includes(m.id)}
          <li class="job" class:on>
            <div class="top">
              <strong>{cap(m.name)}</strong>
              <span class="badge">{LEVEL_LABEL(m.level)}</span>
            </div>
            {#if m.sectors.length}<p class="tiny faint">{m.sectors.slice(0, 2).map((s) => data.jobs?.sectors[s]).join(' · ')}</p>{/if}
            {#if m.accroche}<p class="small muted acc">{m.accroche}</p>{/if}
            <div class="row actions">
              <button type="button" class="btn btn-sm {on ? 'btn-primary' : 'btn-outline'}" aria-pressed={on} onclick={() => toggleMetier(m.id)}>
                <Icon name={on ? 'check' : 'plus'} size={16} /> {on ? 'Choisi' : 'Ajouter'}
              </button>
              <a class="btn btn-ghost btn-sm" href={m.url} target="_blank" rel="noopener">Fiche ONISEP <Icon name="external" size={14} /></a>
            </div>
          </li>
        {/each}
      </ul>
      {#if !query && !showAll && results.length >= 12}
        <button type="button" class="btn btn-ghost btn-sm more" onclick={() => (showAll = true)}>Voir plus de suggestions</button>
      {/if}
    {/if}
  </section>

  <section>
    <div class="row">
      <h2 class="h"><Icon name="compass" size={20} /> Tes enjeux pour plus tard</h2>
      <span class="spacer"></span>
      <span class="badge {app.profile.goals.length ? 'badge-brand' : ''}">{app.profile.goals.length} choisi{app.profile.goals.length > 1 ? 's' : ''}</span>
    </div>
    <p class="muted">Ce qui compte pour ta vie professionnelle. Chaque enjeu est évalué avec les données de chaque formation.</p>
    <div class="goals">
      {#each GOALS as g (g.id)}
        <button type="button" class="goal" aria-pressed={app.profile.goals.includes(g.id)} onclick={() => toggleGoal(g.id)}>
          <span class="gi"><Icon name={g.icon} size={20} /></span>
          <span class="gt">
            <strong>{g.label}</strong>
            <span class="small muted">{g.hint}</span>
          </span>
        </button>
      {/each}
    </div>
  </section>
</div>

<style>
  .h {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.2rem;
    margin: 0;
  }
  .filter {
    max-width: 320px;
    margin: 4px 0 14px;
    min-height: 40px;
  }
  .chips.sm {
    gap: 8px;
  }
  .chips.sm .chip {
    min-height: 36px;
    padding: 0 14px;
    font-size: 0.86rem;
  }
  .picked {
    list-style: none;
    padding: 0;
    margin: 4px 0 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .picked li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 6px 6px 14px;
    border-radius: 99px;
    background: var(--brand);
    color: var(--brand-ink);
    font-weight: 650;
    font-size: 0.88rem;
  }
  .picked button {
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgb(255 255 255 / 20%);
    color: inherit;
    cursor: pointer;
  }
  .search {
    position: relative;
    margin-bottom: 12px;
  }
  .search :global(svg) {
    position: absolute;
    left: 14px;
    top: 14px;
    color: var(--faint);
  }
  .search .input {
    padding-left: 42px;
  }
  .empty {
    padding: 14px 16px;
    border-radius: var(--r-md);
    background: var(--surface-2);
  }
  .jobs {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }
  .job {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .job.on {
    border-color: var(--brand);
    background: var(--brand-soft);
  }
  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
  .acc {
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tiny {
    margin: 0;
  }
  .actions {
    margin-top: auto;
    padding-top: 6px;
    gap: 6px;
  }
  .more {
    margin-top: 10px;
  }
  .goals {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
  .goal {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
  }
  .goal:hover {
    border-color: var(--brand);
  }
  .goal[aria-pressed='true'] {
    border-color: var(--brand);
    background: var(--brand-soft);
  }
  .gi {
    width: 38px;
    height: 38px;
    flex: none;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: var(--surface-2);
    color: var(--muted);
  }
  .goal[aria-pressed='true'] .gi {
    background: var(--brand);
    color: var(--brand-ink);
  }
  .gt {
    display: flex;
    flex-direction: column;
  }
</style>
