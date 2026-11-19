<script lang="ts">
  import { searchCommunes } from '../lib/geo';
  import type { Place } from '../lib/types';
  import Icon from './Icon.svelte';

  interface Props {
    value: Place | null;
    label?: string;
    hint?: string;
  }
  let { value = $bindable(), label = 'Ta commune', hint }: Props = $props();

  let query = $state('');
  let results = $state<(Place & { cp?: string })[]>([]);
  let open = $state(false);
  let active = $state(0);
  let status = $state<'idle' | 'loading' | 'error'>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ctrl: AbortController | undefined;
  const uid = `commune-${Math.random().toString(36).slice(2, 8)}`;

  function onInput() {
    clearTimeout(timer);
    ctrl?.abort();
    if (query.trim().length < 2) {
      results = [];
      open = false;
      return;
    }
    timer = setTimeout(async () => {
      status = 'loading';
      ctrl = new AbortController();
      try {
        results = await searchCommunes(query, ctrl.signal);
        open = true;
        active = 0;
        status = 'idle';
      } catch (e) {
        if ((e as Error).name !== 'AbortError') status = 'error';
      }
    }, 220);
  }

  function pick(p: Place) {
    value = { nom: p.nom, code: p.code, dep: p.dep, lat: p.lat, lon: p.lon };
    query = '';
    results = [];
    open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      active = (active + 1) % results.length;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      active = (active - 1 + results.length) % results.length;
      e.preventDefault();
    } else if (e.key === 'Enter') {
      pick(results[active]);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

<div class="field">
  <label for={uid}>{label}</label>
  {#if hint}<p class="field-hint">{hint}</p>{/if}

  {#if value}
    <div class="picked">
      <Icon name="pin" />
      <div>
        <strong>{value.nom}</strong>
        <span class="muted small">({value.dep})</span>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" onclick={() => (value = null)}>Changer</button>
    </div>
  {:else}
    <div class="box">
      <span class="ico"><Icon name="search" size={18} /></span>
      <input
        id={uid}
        class="input"
        type="text"
        autocomplete="off"
        placeholder="Nom de la commune ou code postal"
        role="combobox"
        aria-expanded={open}
        aria-controls="{uid}-list"
        aria-autocomplete="list"
        aria-activedescendant={open && results.length ? `${uid}-opt-${active}` : undefined}
        bind:value={query}
        oninput={onInput}
        onkeydown={onKey}
        onblur={() => setTimeout(() => (open = false), 150)}
      />
      {#if open && results.length}
        <ul class="list" id="{uid}-list" role="listbox">
          {#each results as r, i (r.code)}
            <li
              id="{uid}-opt-{i}"
              role="option"
              aria-selected={i === active}
              class:active={i === active}
              onmousedown={(e) => {
                e.preventDefault();
                pick(r);
              }}
            >
              <strong>{r.nom}</strong> <span class="muted small">{r.cp ?? ''} · {r.dep}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    {#if status === 'loading'}<p class="small faint">Recherche…</p>{/if}
    {#if status === 'error'}<p class="small" style="color: var(--weak)">La recherche de communes (geo.api.gouv.fr) ne répond pas. Vérifie ta connexion.</p>{/if}
  {/if}
</div>

<style>
  .box {
    position: relative;
  }
  .ico {
    position: absolute;
    left: 14px;
    top: 14px;
    color: var(--faint);
  }
  .box .input {
    padding-left: 42px;
  }
  .list {
    position: absolute;
    z-index: 30;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    margin: 0;
    padding: 6px;
    list-style: none;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    box-shadow: var(--shadow-2);
  }
  li {
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
  }
  li.active,
  li:hover {
    background: var(--brand-soft);
  }
  .picked {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 10px 10px 16px;
    border-radius: var(--r-md);
    background: var(--brand-soft);
    color: var(--brand-strong);
  }
  .picked div {
    flex: 1;
    color: var(--text);
  }
</style>
