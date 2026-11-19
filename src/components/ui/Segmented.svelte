<script lang="ts" generics="T extends string | number | boolean">
  interface Props {
    options: { value: T; label: string }[];
    value: T;
    label: string;
    onchange?: (v: T) => void;
  }
  let { options, value = $bindable(), label, onchange }: Props = $props();
</script>

<div class="segmented" role="group" aria-label={label}>
  {#each options as opt (String(opt.value))}
    <button
      type="button"
      aria-pressed={value === opt.value}
      onclick={() => {
        value = opt.value;
        onchange?.(opt.value);
      }}>{opt.label}</button
    >
  {/each}
</div>
