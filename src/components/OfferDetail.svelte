<script lang="ts">
  import { STATUT_LABELS, TYPES, ZONE_LABELS } from '../lib/constants';
  import { CRITERIA, IMPORTANCE_LABELS } from '../lib/criteria';
  import { DOMAIN_BY_ID } from '../lib/domains';
  import { fmt1, fmtDuration, fmtEuro, fmtInt, fmtKm, fmtPct, scoreTone } from '../lib/format';
  import { ORIGIN_LABELS, assess, combine, isApprentice } from '../lib/scoring';
  import { app } from '../lib/state.svelte';
  import { data } from '../lib/store.svelte';
  import type { Profile } from '../lib/types';
  import Icon from './Icon.svelte';
  import ScoreRing from './ui/ScoreRing.svelte';

  interface Props {
    id: string | null;
    onclose: () => void;
  }
  let { id, onclose }: Props = $props();

  const offer = $derived(id ? data.byId.get(id) ?? null : null);
  const ev = $derived.by(() => {
    if (!offer) return null;
    const a = assess(offer, $state.snapshot(app.profile) as Profile, data.ctx, true);
    return { ...a, ...combine(a, app.weights) };
  });
  const order = $derived(
    ev ? [...CRITERIA].sort((x, y) => (app.weights[y.id] ?? 0) - (app.weights[x.id] ?? 0) || (ev.scores[x.id].score ?? 101) - (ev.scores[y.id].score ?? 101)) : []
  );
  const CONF = { data: 'Calculé sur données publiques', estimate: 'Estimation', na: 'Non concerné' } as const;

  // Métiers accessibles (fiches métiers ONISEP), métiers visés en premier.
  let showAllJobs = $state(false);
  const reach = $derived.by(() => {
    if (!offer?.fo || !data.jobs) return [];
    const list = data.jobs.byFor.get(offer.fo) ?? [];
    return [...list].sort((a, b) => Number(app.profile.metiers.includes(b.id)) - Number(app.profile.metiers.includes(a.id)) || a.name.localeCompare(b.name, 'fr'));
  });
  const chosen = $derived(reach.filter((m) => app.profile.metiers.includes(m.id)));
  $effect(() => {
    void id;
    showAllJobs = false;
  });

  let dialog: HTMLDivElement | undefined = $state();
  $effect(() => {
    if (id && dialog) {
      dialog.focus();
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  });
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
  const ORIGINS = ['l3', 'lp', 'but', 'm', 'au'] as const;
  const ORIGIN_SHORT: Record<string, string> = { l3: 'L3', lp: 'Licence pro', but: 'BUT', m: 'Master', au: 'Autres' };
</script>

{#if offer && ev}
  <div class="backdrop" onclick={onclose} aria-hidden="true"></div>
  <div class="drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" tabindex="-1" bind:this={dialog} onkeydown={onKey}>
    <header class="dh">
      <ScoreRing score={ev.total} size={76} />
      <div class="ttl">
        <div class="row tags">
          <span class="badge badge-brand">{TYPES[offer.ty].label}</span>
          <span class="badge">{STATUT_LABELS[offer.st ?? 0]}</span>
          {#if (offer.al ?? 0) >= 1}<span class="badge badge-accent">{offer.al === 2 ? 'En alternance' : 'Alternance possible'}</span>{/if}
        </div>
        <h2 id="detail-title">{offer.nm}</h2>
        {#if offer.pc}<p class="muted pc">{offer.pc}</p>{/if}
        <p class="small muted">{offer.etab} · {offer.commune.nom} ({offer.commune.dep})</p>
      </div>
      <button class="btn btn-ghost btn-icon close" aria-label="Fermer" onclick={onclose}><Icon name="x" size={22} /></button>
    </header>

    <div class="actions row">
      <a class="btn btn-primary btn-sm" href={offer.url} target="_blank" rel="noopener">{offer.urlLabel} <Icon name="external" size={16} /></a>
      {#if offer.ur && offer.uo}<a class="btn btn-outline btn-sm" href={offer.ur} target="_blank" rel="noopener">Site de la formation <Icon name="external" size={16} /></a>{/if}
      <button class="btn btn-outline btn-sm" aria-pressed={app.favorites.includes(offer.id)} onclick={() => app.toggleFavorite(offer.id)}>
        <Icon name={app.favorites.includes(offer.id) ? 'starfill' : 'star'} size={16} />
        {app.favorites.includes(offer.id) ? 'Favori' : 'Ajouter aux favoris'}
      </button>
      <button class="btn btn-outline btn-sm" disabled={!app.compare.includes(offer.id) && app.compare.length >= 4} onclick={() => app.toggleCompare(offer.id)}>
        <Icon name="columns" size={16} />
        {app.compare.includes(offer.id) ? 'Retirer de la comparaison' : 'Comparer'}
      </button>
    </div>

    {#if ev.alerts.length}
      <ul class="alerts">
        {#each ev.alerts as al (al)}<li><Icon name="alert" size={16} /> {al}</li>{/each}
      </ul>
    {/if}

    <section>
      <h3>Pourquoi {ev.total} % ?</h3>
      <p class="small muted">
        Chaque critère reçoit une note de 0 à 100, pondérée par l’importance que tu lui donnes. Fiabilité :
        <strong>{Math.round(ev.reliability * 100)} %</strong> du calcul repose sur des données officielles, le reste sur des estimations.
      </p>
      <ul class="crit">
        {#each order as c (c.id)}
          {@const s = ev.scores[c.id]}
          {@const w = app.weights[c.id]}
          <li class:muted-row={w === 0 || s.score == null}>
            <div class="ch">
              <span class="ci tone-{scoreTone(s.score)}"><Icon name={c.icon} size={18} /></span>
              <div class="cl">
                <strong>{c.label}</strong>
                <span class="tiny faint">Importance : {IMPORTANCE_LABELS[w]}</span>
              </div>
              <span class="cs num tone-{scoreTone(s.score)}">{s.score ?? '–'}</span>
            </div>
            <div class="bar tone-{scoreTone(s.score)}"><span style="width: {s.score ?? 0}%"></span></div>
            <p class="sum">{s.summary}</p>
            {#if s.details?.length}
              <ul class="det small muted">
                {#each s.details as d (d)}<li>{d}</li>{/each}
              </ul>
            {/if}
            <span class="conf badge {s.confidence === 'data' ? 'badge-great' : s.confidence === 'estimate' ? 'badge-fair' : ''}">
              {CONF[s.confidence]}{s.source ? ` · ${s.source}` : ''}
            </span>
          </li>
        {/each}
      </ul>
    </section>

    <section>
      <h3>Budget mensuel estimé</h3>
      <table class="budget">
        <tbody>
          {#each ev.budget.lines as l (l.label)}
            <tr class={l.kind}>
              <td>{l.label}{#if l.note}<span class="tiny faint"> · {l.note}</span>{/if}</td>
              <td class="num">{l.kind === 'in' ? '+' : '−'} {fmtEuro(l.amount)}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class:neg={ev.budget.balance < 0}>
            <td>{ev.budget.balance >= 0 ? 'Reste à vivre' : 'Manque à financer'}</td>
            <td class="num">{fmtEuro(ev.budget.balance)}</td>
          </tr>
        </tfoot>
      </table>
      {#if isApprentice(offer, app.profile)}
        <p class="tiny faint">Le salaire d’apprenti est un minimum légal brut ; il peut être plus élevé selon la convention collective.</p>
      {/if}
    </section>

    <section>
      <h3>En chiffres</h3>
      <div class="facts">
        {#if offer.ca != null}<div><span class="k">Capacité d’accueil</span><span class="v num">{fmtInt(offer.ca)} places</span></div>{/if}
        {#if offer.nc != null}<div><span class="k">Candidats 2025</span><span class="v num">{fmtInt(offer.nc)}</span></div>{/if}
        {#if offer.ta != null}<div><span class="k">Taux de propositions 2025</span><span class="v num">{fmtPct(offer.ta)}</span></div>{/if}
        {#if offer.in}
          <div><span class="k">Emploi salarié à 18 mois</span><span class="v num">{fmtPct(offer.in[0])}</span></div>
          {#if offer.in[1] != null}<div><span class="k">Emplois stables</span><span class="v num">{fmtPct(offer.in[1])}</span></div>{/if}
          {#if offer.in[2] != null}<div><span class="k">Salaire net médian</span><span class="v num">{fmtEuro(offer.in[2])}</span></div>{/if}
        {/if}
        <div><span class="k">Loyer moyen T1-T2</span><span class="v num">{offer.commune.loyerM2 != null ? `${fmt1(offer.commune.loyerM2)} €/m²` : 'n.d.'}</span></div>
        <div><span class="k">Résidences Crous à moins de 10 km</span><span class="v num">{offer.commune.crous10}</span></div>
        {#if Number.isFinite(ev.mobility.distanceKm)}
          <div><span class="k">Distance de chez toi</span><span class="v num">{fmtKm(ev.mobility.distanceKm)}</span></div>
          <div><span class="k">{ev.mobility.moves ? 'Trajet local (après déménagement)' : 'Trajet quotidien (aller)'}</span><span class="v num">≈ {fmtDuration(ev.mobility.commuteMin)}</span></div>
        {/if}
        <div><span class="k">Émissions des trajets</span><span class="v num">≈ {fmtInt(ev.mobility.co2KgYear)} kg CO2e/an</span></div>
      </div>
      {#if offer.commune.zone}<p class="small muted zone">Zonage ABC : {ZONE_LABELS[offer.commune.zone] ?? offer.commune.zone}.</p>{/if}

      {#if offer.ao && Object.keys(offer.ao).length}
        <h4>Taux de propositions selon le diplôme d’origine (Mon Master 2025)</h4>
        <ul class="bars">
          {#each ORIGINS as k (k)}
            {#if offer.ao[k] != null}
              <li>
                <span class="bl">{ORIGIN_SHORT[k]}</span>
                <span class="bt"><span style="width: {offer.ao[k]}%"></span></span>
                <span class="bv num">{fmtPct(offer.ao[k])}</span>
              </li>
            {/if}
          {/each}
        </ul>
      {/if}
      {#if offer.ad && Object.keys(offer.ad).length}
        <h4>Origine des admis 2025</h4>
        <div class="stack-bar" role="img" aria-label="Origine des admis">
          {#each ORIGINS as k, i (k)}
            {#if (offer.ad[k] ?? 0) > 0}
              <span style="flex: {offer.ad[k]}; opacity: {1 - i * 0.16}" title="{ORIGIN_SHORT[k]} : {fmtPct(offer.ad[k])}">{(offer.ad[k] ?? 0) >= 12 ? `${ORIGIN_SHORT[k]} ${fmtPct(offer.ad[k])}` : ''}</span>
            {/if}
          {/each}
        </div>
      {/if}
      {#if offer.mt}
        <h4>Mentions au bac des admis 2025</h4>
        <div class="stack-bar" role="img" aria-label="Mentions des admis">
          {#each ['Sans mention', 'AB', 'B', 'TB', 'TB félicitations'] as lab, i (lab)}
            {#if offer.mt[i] > 0}
              <span style="flex: {offer.mt[i]}; opacity: {0.35 + i * 0.16}" title="{lab} : {fmtPct(offer.mt[i])}">{offer.mt[i] >= 12 ? `${lab} ${fmtPct(offer.mt[i])}` : ''}</span>
            {/if}
          {/each}
        </div>
      {/if}
      <p class="tiny faint">
        Domaines : {offer.dm.map((d) => DOMAIN_BY_ID[d]?.label).join(' · ')}{offer.sector ? ` · Secteur : ${offer.sector}` : ''}
        {#if app.profile.level === 3 && offer.ao}· Origine retenue pour toi : candidats {ORIGIN_LABELS[app.profile.diploma === 'licence' ? 'l3' : app.profile.diploma === 'lp' ? 'lp' : app.profile.diploma === 'but' ? 'but' : 'au']}{/if}
      </p>
    </section>

    {#if reach.length}
      <section>
        <h3>Métiers auxquels cette formation prépare</h3>
        <p class="small muted">D’après les fiches métiers de l’ONISEP{chosen.length ? ' ; tes métiers visés sont mis en avant' : ''}.</p>
        <ul class="jobs">
          {#each reach.slice(0, showAllJobs ? reach.length : 10) as m (m.id)}
            <li class:on={app.profile.metiers.includes(m.id)}>
              <a href={m.url} target="_blank" rel="noopener">{m.name}</a>
              {#if app.profile.metiers.includes(m.id)}<span class="badge badge-great">visé</span>{/if}
            </li>
          {/each}
        </ul>
        {#if reach.length > 10 && !showAllJobs}
          <button class="btn btn-ghost btn-sm" onclick={() => (showAllJobs = true)}>Voir les {reach.length} métiers</button>
        {/if}
      </section>
    {/if}

    <section class="links">
      <h3>Pour aller plus loin</h3>
      <ul>
        <li><a href={offer.url} target="_blank" rel="noopener">{offer.urlLabel} : modalités de candidature, calendrier</a></li>
        <li><a href="https://trouverunlogement.lescrous.fr/" target="_blank" rel="noopener">Trouver un logement Crous</a></li>
        <li><a href="https://wwwd.caf.fr/wps/portal/caffr/aidesetdemarches/mesdemarches/faireunesimulation/lelogement" target="_blank" rel="noopener">Simuler l’aide au logement (CAF)</a></li>
        <li><a href="https://www.onisep.fr/" target="_blank" rel="noopener">ONISEP : fiches métiers et formations</a></li>
      </ul>
    </section>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(10 12 24 / 45%);
    z-index: 900;
    animation: fade 0.2s ease;
  }
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(720px, 100%);
    background: var(--bg);
    z-index: 901;
    overflow-y: auto;
    box-shadow: var(--shadow-3);
    padding: 28px clamp(18px, 4vw, 36px) 48px;
    animation: slide 0.25s ease;
    outline: none;
  }
  @keyframes slide {
    from { transform: translateX(40px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
  @keyframes fade {
    from { opacity: 0; }
  }
  .dh {
    display: flex;
    gap: 18px;
    align-items: flex-start;
  }
  .ttl {
    flex: 1;
    min-width: 0;
  }
  .tags {
    gap: 6px;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 1.5rem;
    margin: 0;
  }
  .pc {
    margin: 4px 0 0;
  }
  .close {
    margin: -6px -8px 0 0;
  }
  .actions {
    margin: 22px 0 8px;
    gap: 8px;
  }
  .actions [aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  section {
    margin-top: 32px;
  }
  h4 {
    font-size: 0.95rem;
    margin: 22px 0 10px;
  }
  .alerts {
    list-style: none;
    padding: 12px 16px;
    margin: 18px 0 0;
    border-radius: var(--r-md);
    background: var(--weak-soft);
    color: var(--weak);
    display: grid;
    gap: 6px;
    font-weight: 600;
    font-size: 0.92rem;
  }
  .alerts li {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .crit {
    list-style: none;
    padding: 0;
    margin: 14px 0 0;
    display: grid;
    gap: 12px;
  }
  .crit > li {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 14px 16px;
  }
  .muted-row {
    opacity: 0.65;
  }
  .ch {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ci {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    background: var(--tone-soft);
    color: var(--tone);
    flex: none;
  }
  .cl {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .cs {
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--tone);
  }
  .bar {
    height: 6px;
    border-radius: 99px;
    background: var(--tone-soft);
    margin: 10px 0 8px;
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--tone);
    border-radius: 99px;
  }
  .sum {
    margin: 0;
    font-weight: 550;
  }
  .det {
    margin: 6px 0 0;
    padding-left: 18px;
  }
  .conf {
    margin-top: 10px;
  }
  .budget {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    background: var(--surface);
    border-radius: var(--r-md);
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .budget td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .budget td.num {
    text-align: right;
    white-space: nowrap;
    font-weight: 650;
  }
  .budget tr.in td.num {
    color: var(--great);
  }
  .budget tfoot td {
    font-weight: 800;
    border-bottom: 0;
    background: var(--great-soft);
    color: var(--great);
  }
  .budget tfoot tr.neg td {
    background: var(--weak-soft);
    color: var(--weak);
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    margin-top: 12px;
  }
  .facts div {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .k {
    font-size: 0.8rem;
    color: var(--muted);
  }
  .v {
    font-weight: 750;
    font-size: 1.05rem;
  }
  .zone {
    margin-top: 10px;
  }
  .bars {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }
  .bars li {
    display: grid;
    grid-template-columns: 90px 1fr 48px;
    gap: 10px;
    align-items: center;
    font-size: 0.88rem;
  }
  .bt {
    height: 10px;
    border-radius: 99px;
    background: var(--surface-3);
    overflow: hidden;
  }
  .bt span {
    display: block;
    height: 100%;
    background: var(--brand);
  }
  .bv {
    text-align: right;
    font-weight: 700;
  }
  .stack-bar {
    display: flex;
    height: 30px;
    border-radius: 10px;
    overflow: hidden;
    gap: 2px;
  }
  .stack-bar span {
    background: var(--brand);
    color: var(--brand-ink);
    font-size: 0.75rem;
    font-weight: 700;
    display: grid;
    place-items: center;
    white-space: nowrap;
    overflow: hidden;
    padding: 0 6px;
  }
  .jobs {
    list-style: none;
    padding: 0;
    margin: 12px 0 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .jobs li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.88rem;
  }
  .jobs li.on {
    border-color: var(--great);
    background: var(--great-soft);
  }
  .jobs a {
    color: var(--text);
    text-decoration: none;
    font-weight: 600;
  }
  .jobs a:hover {
    color: var(--brand-strong);
    text-decoration: underline;
  }
  .links ul {
    padding-left: 18px;
    display: grid;
    gap: 6px;
  }
</style>
