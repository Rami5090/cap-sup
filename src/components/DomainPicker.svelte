<script lang="ts">
  import { DOMAINS } from '../lib/domains';
  import type { DomainId } from '../lib/types';
  import Icon from './Icon.svelte';

  interface Props {
    interests: Partial<Record<DomainId, 1 | 2 | 3>>;
  }
  let { interests = $bindable() }: Props = $props();

  function toggle(id: DomainId) {
    const next = { ...interests };
    if (next[id]) delete next[id];
    else next[id] = 2;
    interests = next;
  }
  function passion(id: DomainId, e: Event) {
    e.stopPropagation();
    const next = { ...interests };
    next[id] = next[id] === 3 ? 2 : 3;
    interests = next;
  }
</script>

<div class="grid" role="group" aria-label="Centres d’intérêt">
  {#each DOMAINS as d (d.id)}
    {@const lvl = interests[d.id] ?? 0}
    <div class="dom" class:on={lvl >= 1} class:passion={lvl === 3}>
      <button type="button" class="main" aria-pressed={lvl >= 1} onclick={() => toggle(d.id)} title={d.label}>
        <span class="ico"><Icon name={d.icon} size={22} /></span>
        <span class="txt">{d.short}</span>
        {#if lvl >= 1}<span class="tick"><Icon name="check" size={16} stroke={2.6} /></span>{/if}
      </button>
      {#if lvl >= 1}
        <button
          type="button"
          class="heart"
          aria-pressed={lvl === 3}
          aria-label={lvl === 3 ? `${d.short} : passion (cliquer pour revenir à intérêt)` : `Marquer ${d.short} comme une passion`}
          title="C'est une passion"
          onclick={(e) => passion(d.id, e)}
        >
          <Icon name={lvl === 3 ? 'heartfill' : 'heart'} size={18} />
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 10px;
  }
  .dom {
    position: relative;
  }
  .main {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 58px;
    padding: 10px 44px 10px 14px;
    border-radius: var(--r-md);
    border: 1px solid var(--border-strong);
    background: var(--surface);
    text-align: left;
    font-weight: 600;
    font-size: 0.92rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .main:hover {
    border-color: var(--brand);
  }
  .ico {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    flex: none;
    border-radius: 10px;
    background: var(--surface-2);
    color: var(--muted);
  }
  .on .main {
    border-color: var(--brand);
    background: var(--brand-soft);
  }
  .on .ico {
    background: var(--brand);
    color: var(--brand-ink);
  }
  .passion .main {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .passion .ico {
    background: var(--accent);
    color: #2b1a00;
  }
  .tick {
    position: absolute;
    left: 38px;
    top: 6px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--surface);
    color: var(--brand);
    box-shadow: var(--shadow-1);
  }
  .heart {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--faint);
    cursor: pointer;
  }
  .heart:hover {
    background: var(--surface);
    color: var(--accent);
  }
  .passion .heart {
    color: #e0731a;
  }
</style>
