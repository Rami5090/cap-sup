<script lang="ts">
  interface Props {
    label: string;
    hint?: string;
    value: number;
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
  }
  let { label, hint, value = $bindable(), suffix, min = 0, max = 100000, step = 10 }: Props = $props();
  const uid = `num-${Math.random().toString(36).slice(2, 9)}`;
</script>

<div class="field">
  <label for={uid}>{label}</label>
  {#if hint}<p class="field-hint">{hint}</p>{/if}
  <div class="input-suffix">
    <input
      id={uid}
      class="input num"
      type="number"
      inputmode="numeric"
      {min}
      {max}
      {step}
      value={value}
      oninput={(e) => {
        const v = Number((e.currentTarget as HTMLInputElement).value);
        if (Number.isFinite(v)) value = Math.max(min, Math.min(max, v));
      }}
    />
    {#if suffix}<span>{suffix}</span>{/if}
  </div>
</div>
