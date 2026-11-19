<script lang="ts">
  interface Props {
    label: string;
    hint?: string;
    value: number;
  }
  let { label, hint, value = $bindable() }: Props = $props();
  const LEVELS = ['Débutant', 'Fragile', 'Correct', 'À l’aise', 'Excellent'];
</script>

<div class="skill">
  <div class="txt">
    <span class="lbl">{label}</span>
    {#if hint}<span class="small muted">{hint}</span>{/if}
  </div>
  <div class="dots" role="radiogroup" aria-label={label}>
    {#each [1, 2, 3, 4, 5] as n (n)}
      <button
        type="button"
        role="radio"
        aria-checked={value === n}
        aria-label="{n} sur 5 : {LEVELS[n - 1]}"
        title={LEVELS[n - 1]}
        class:filled={n <= value}
        onclick={() => (value = n)}
      >{n}</button>
    {/each}
    <span class="lvl small muted">{LEVELS[value - 1]}</span>
  </div>
</div>

<style>
  .skill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .skill:last-child {
    border-bottom: 0;
  }
  .txt {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 220px;
    flex: 1;
  }
  .lbl {
    font-weight: 650;
  }
  .dots {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  button {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    color: var(--muted);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.12s;
  }
  button:hover {
    border-color: var(--brand);
  }
  button.filled {
    background: var(--brand);
    border-color: var(--brand);
    color: var(--brand-ink);
  }
  .lvl {
    width: 80px;
    margin-left: 6px;
  }
</style>
