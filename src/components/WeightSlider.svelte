<script lang="ts">
  import { IMPORTANCE_LABELS, type CriterionInfo } from '../lib/criteria';
  import Icon from './Icon.svelte';

  interface Props {
    criterion: CriterionInfo;
    value: number;
    share?: number; // part du poids total (0-1)
    compact?: boolean;
  }
  let { criterion, value = $bindable(), share = 0, compact = false }: Props = $props();
  const uid = $derived(`w-${criterion.id}${compact ? '-c' : ''}`);
</script>

<div class="w" class:compact class:off={value === 0}>
  <div class="head">
    <span class="ico"><Icon name={criterion.icon} size={compact ? 16 : 18} /></span>
    <div class="txt">
      <label for={uid}>{criterion.label}</label>
      {#if !compact}<span class="small muted">{criterion.question}</span>{/if}
    </div>
    <span class="imp" title="Part dans le calcul : {Math.round(share * 100)} %">{IMPORTANCE_LABELS[value]}</span>
  </div>
  <div class="ctrl">
    <input
      id={uid}
      type="range"
      min="0"
      max="5"
      step="1"
      bind:value
      style="--pct: {value * 20}%"
      aria-valuetext={IMPORTANCE_LABELS[value]}
    />
    <span class="share num small faint" aria-hidden="true">{Math.round(share * 100)} %</span>
  </div>
</div>

<style>
  .w {
    padding: 14px 0;
    border-bottom: 1px solid var(--border);
  }
  .w:last-child {
    border-bottom: 0;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .ico {
    flex: none;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--brand-soft);
    color: var(--brand-strong);
  }
  .off .ico {
    background: var(--surface-2);
    color: var(--faint);
  }
  .txt {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  label {
    font-weight: 650;
  }
  .imp {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--brand-strong);
    white-space: nowrap;
  }
  .off .imp {
    color: var(--faint);
  }
  .ctrl {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
    padding-left: 46px;
  }
  .share {
    width: 40px;
    text-align: right;
  }
  .compact {
    padding: 8px 0;
  }
  .compact .ico {
    width: 28px;
    height: 28px;
  }
  .compact label {
    font-size: 0.9rem;
  }
  .compact .ctrl {
    padding-left: 40px;
    margin-top: 0;
  }
</style>
