<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    hint?: string;
  }
  let { checked = $bindable(), label, hint }: Props = $props();
</script>

<label class="toggle">
  <input type="checkbox" role="switch" bind:checked />
  <span class="track" aria-hidden="true"><span class="thumb"></span></span>
  <span class="text">
    <span class="lbl">{label}</span>
    {#if hint}<span class="small muted">{hint}</span>{/if}
  </span>
</label>

<style>
  .toggle {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    cursor: pointer;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track {
    flex: none;
    width: 46px;
    height: 28px;
    border-radius: 99px;
    background: var(--surface-3);
    border: 1px solid var(--border-strong);
    position: relative;
    transition: background 0.15s;
  }
  .thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--surface);
    box-shadow: var(--shadow-1);
    transition: transform 0.18s;
  }
  input:checked + .track {
    background: var(--brand);
    border-color: var(--brand);
  }
  input:checked + .track .thumb {
    transform: translateX(18px);
  }
  input:focus-visible + .track {
    box-shadow: var(--focus);
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .lbl {
    font-weight: 650;
  }
</style>
