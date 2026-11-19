<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import Range from '../../components/ui/Range.svelte';
  import Segmented from '../../components/ui/Segmented.svelte';
  import { DOMAINS } from '../../lib/domains';
  import { fmt1 } from '../../lib/format';
  import { DIPLOMAS_BY_LEVEL } from '../../lib/profile';
  import { app } from '../../lib/state.svelte';
  import { data } from '../../lib/store.svelte';
  import type { DomainId, Level, Rank } from '../../lib/types';

  $effect(() => {
    data.init();
  });

  const levelOptions: { value: Level; label: string }[] = [
    { value: 3, label: 'Un Bac+3' },
    { value: 2, label: 'Un Bac+2' },
    { value: 0, label: 'Le bac (terminale)' }
  ];
  const rankOptions: { value: Rank; label: string }[] = [
    { value: 'top10', label: '10 % premiers' },
    { value: 'top25', label: 'Premier quart' },
    { value: 'mid', label: 'Milieu' },
    { value: 'low', label: 'Dernier quart' },
    { value: 'unknown', label: 'Je ne sais pas' }
  ];

  let level = $state(app.profile.level);
  const showMention = $derived(app.profile.diploma === 'licence' && app.profile.level !== 0);

  function setMention(key: string) {
    app.profile.licenceMention = key || null;
    const m = data.licences.find((l) => l.key === key);
    if (m && m.dm.length && !app.profile.currentDomains.length) app.profile.currentDomains = m.dm.slice(0, 2);
  }
  function toggleDomain(id: DomainId) {
    const cur = app.profile.currentDomains;
    if (cur.includes(id)) app.profile.currentDomains = cur.filter((d) => d !== id);
    else app.profile.currentDomains = [...cur, id].slice(-2);
  }
</script>

<div class="stack" style="--gap: 32px">
  <div class="field">
    <span class="field-label">À la rentrée prochaine, tu seras titulaire de…</span>
    <Segmented options={levelOptions} bind:value={level} label="Niveau atteint" onchange={(v) => app.setLevel(v)} />
  </div>

  <div class="field">
    <span class="field-label">{app.profile.level === 0 ? 'Ton bac' : 'Ton diplôme actuel'}</span>
    <div class="chips">
      {#each DIPLOMAS_BY_LEVEL[app.profile.level] as d (d.id)}
        <button type="button" class="chip" aria-pressed={app.profile.diploma === d.id} title={d.hint} onclick={() => (app.profile.diploma = d.id)}>
          {d.label}
        </button>
      {/each}
    </div>
  </div>

  {#if showMention}
    <div class="field">
      <label for="mention">Ta mention de licence</label>
      <p class="field-hint">
        Elle sert à vérifier la compatibilité officielle entre ta licence et les mentions de master (liste du ministère).
      </p>
      <select id="mention" class="select" value={app.profile.licenceMention ?? ''} onchange={(e) => setMention((e.currentTarget as HTMLSelectElement).value)}>
        <option value="">Choisir ma mention…</option>
        {#each data.licences as l (l.key)}
          <option value={l.key}>{l.label}</option>
        {/each}
      </select>
    </div>
  {/if}

  {#if app.profile.level !== 0}
    <div class="field">
      <span class="field-label">Le domaine de tes études actuelles <span class="faint small">(2 au maximum)</span></span>
      <div class="chips">
        {#each DOMAINS as d (d.id)}
          <button type="button" class="chip" aria-pressed={app.profile.currentDomains.includes(d.id)} onclick={() => toggleDomain(d.id)}>
            <Icon name={d.icon} size={16} />
            {d.short}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="two">
    <Range
      label={app.profile.level === 0 ? 'Ta moyenne générale en terminale' : 'Ta moyenne générale cette année'}
      hint="Une estimation suffit."
      min={6}
      max={19}
      step={0.5}
      bind:value={app.profile.average}
      format={(v) => `${fmt1(v)} / 20`}
      minLabel="6"
      maxLabel="19"
    />
    <div class="field">
      <span class="field-label">Ton classement dans ta promo</span>
      <p class="field-hint">Il affine l’estimation de tes chances d’admission.</p>
      <Segmented options={rankOptions} bind:value={app.profile.rank} label="Classement" />
    </div>
  </div>

  <div class="field age">
    <label for="age">Ton âge à la rentrée</label>
    <p class="field-hint">Il sert uniquement à estimer le salaire minimum d’un apprenti.</p>
    <input id="age" class="input num" type="number" min="16" max="40" bind:value={app.profile.age} />
  </div>
</div>

<style>
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .age {
    max-width: 260px;
  }
  @media (max-width: 760px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
</style>
