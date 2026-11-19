<script lang="ts">
  import Icon from '../../components/Icon.svelte';
  import SkillRating from '../../components/SkillRating.svelte';
  import { DOMAIN_SUBJECTS, SKILLS, SUBJECTS } from '../../lib/domains';
  import { fmt1 } from '../../lib/format';
  import { app } from '../../lib/state.svelte';
  import type { DomainId, SubjectId } from '../../lib/types';

  // Matières suggérées : celles des domaines d'études et d'intérêt.
  const suggested = $derived.by(() => {
    const s = new Set<SubjectId>();
    const doms = [...app.profile.currentDomains, ...(Object.keys(app.profile.interests) as DomainId[])];
    for (const d of doms) for (const [k, w] of Object.entries(DOMAIN_SUBJECTS[d] ?? {})) if ((w ?? 0) >= 2) s.add(k as SubjectId);
    return s;
  });
  const ordered = $derived([...SUBJECTS].sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id))));

  function add(id: SubjectId) {
    app.profile.subjects = { ...app.profile.subjects, [id]: Math.round(app.profile.average * 2) / 2 };
  }
  function remove(id: SubjectId) {
    const next = { ...app.profile.subjects };
    delete next[id];
    app.profile.subjects = next;
  }
  function set(id: SubjectId, v: number) {
    app.profile.subjects = { ...app.profile.subjects, [id]: v };
  }
</script>

<div class="stack" style="--gap: 36px">
  <section>
    <h2 class="h">Tes notes par grand bloc de matières</h2>
    <p class="muted">
      Ajoute seulement les matières que tu as suivies cette année. Elles sont comparées au niveau attendu dans chaque
      formation, selon son domaine. Les matières <span class="badge badge-brand">conseillées</span> correspondent à tes domaines.
    </p>
    <ul class="subjects">
      {#each ordered as s (s.id)}
        {@const v = app.profile.subjects[s.id]}
        <li class:active={v != null}>
          <div class="txt">
            <span class="lbl">{s.label} {#if suggested.has(s.id)}<span class="badge badge-brand">conseillée</span>{/if}</span>
            <span class="small muted">{s.hint}</span>
          </div>
          {#if v != null}
            <div class="ctrl">
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={v}
                style="--pct: {(v / 20) * 100}%"
                aria-label="Note en {s.label}"
                oninput={(e) => set(s.id, Number((e.currentTarget as HTMLInputElement).value))}
              />
              <output class="num">{fmt1(v)}</output>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="Retirer {s.label}" onclick={() => remove(s.id)}>
                <Icon name="x" size={16} />
              </button>
            </div>
          {:else}
            <button type="button" class="btn btn-outline btn-sm" onclick={() => add(s.id)}><Icon name="plus" size={16} /> Ajouter une note</button>
          {/if}
        </li>
      {/each}
    </ul>
  </section>

  <section>
    <h2 class="h">Tes compétences</h2>
    <p class="muted">Auto-évalue-toi honnêtement : il n’y a pas de bonne réponse, et cela n’influence que le critère « Compétences ».</p>
    <div class="skills card card-flat">
      {#each SKILLS as s (s.id)}
        <SkillRating label={s.label} hint={s.hint} bind:value={app.profile.skills[s.id]} />
      {/each}
    </div>
  </section>
</div>

<style>
  .h {
    font-size: 1.2rem;
  }
  .subjects {
    list-style: none;
    padding: 0;
    margin: 16px 0 0;
    display: grid;
    gap: 10px;
  }
  .subjects li {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--surface);
  }
  .subjects li.active {
    border-color: var(--brand);
    background: var(--brand-soft);
  }
  .txt {
    flex: 1;
    min-width: 220px;
    display: flex;
    flex-direction: column;
  }
  .lbl {
    font-weight: 650;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .ctrl {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 260px;
    flex: 1;
  }
  output {
    min-width: 44px;
    font-weight: 800;
    color: var(--brand-strong);
    text-align: right;
  }
  .skills {
    margin-top: 14px;
    padding-top: 6px;
    padding-bottom: 6px;
  }
</style>
