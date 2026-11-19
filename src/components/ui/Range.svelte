<script lang="ts">
  interface Props {
    label: string;
    hint?: string;
    min: number;
    max: number;
    step?: number;
    value: number;
    format?: (v: number) => string;
    minLabel?: string;
    maxLabel?: string;
    id?: string;
  }
  let { label, hint, min, max, step = 1, value = $bindable(), format = (v) => String(v), minLabel, maxLabel, id }: Props = $props();
  const fallbackId = `range-${Math.random().toString(36).slice(2, 9)}`;
  const uid = $derived(id ?? fallbackId);
  const pct = $derived(((value - min) / (max - min)) * 100);
</script>

<div class="field range">
  <div class="head">
    <label for={uid}>{label}</label>
    <output for={uid} class="num">{format(value)}</output>
  </div>
  {#if hint}<p class="field-hint">{hint}</p>{/if}
  <input
    id={uid}
    type="range"
    {min}
    {max}
    {step}
    bind:value
    style="--pct: {pct}%"
    aria-valuetext={format(value)}
  />
  {#if minLabel || maxLabel}
    <div class="ends small faint"><span>{minLabel}</span><span>{maxLabel}</span></div>
  {/if}
</div>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .head label {
    font-weight: 650;
    font-size: 0.95rem;
  }
  output {
    font-weight: 750;
    color: var(--brand-strong);
    background: var(--brand-soft);
    padding: 2px 10px;
    border-radius: var(--r-pill);
    font-size: 0.92rem;
    white-space: nowrap;
  }
  .ends {
    display: flex;
    justify-content: space-between;
    margin-top: -4px;
  }
</style>
