<script lang="ts">
  interface Series {
    label: string;
    color: string;
    values: (number | null)[];
  }
  interface Props {
    axes: string[];
    series: Series[];
    size?: number;
  }
  let { axes, series, size = 420 }: Props = $props();

  const pad = 70;
  const c = $derived(size / 2);
  const r = $derived(size / 2 - pad);
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / axes.length;
  const pt = (i: number, v: number) => [c + Math.cos(angle(i)) * r * (v / 100), c + Math.sin(angle(i)) * r * (v / 100)];
  const poly = (vals: (number | null)[]) => vals.map((v, i) => pt(i, v ?? 0).join(',')).join(' ');
</script>

<svg viewBox="0 0 {size} {size}" class="radar" role="img" aria-label="Comparaison des notes par critère">
  {#each [25, 50, 75, 100] as g (g)}
    <polygon points={poly(axes.map(() => g))} fill="none" stroke="var(--border)" stroke-width="1" />
  {/each}
  {#each axes as a, i (a)}
    {@const [x, y] = pt(i, 100)}
    {@const [lx, ly] = pt(i, 122)}
    <line x1={c} y1={c} x2={x} y2={y} stroke="var(--border)" stroke-width="1" />
    <text
      x={lx}
      y={ly}
      text-anchor={Math.abs(lx - c) < 8 ? 'middle' : lx > c ? 'start' : 'end'}
      dominant-baseline="middle"
      font-size="13"
      font-weight="600"
      fill="var(--muted)">{a}</text
    >
  {/each}
  {#each series as s (s.label)}
    <polygon points={poly(s.values)} fill={s.color} fill-opacity="0.14" stroke={s.color} stroke-width="2.2" stroke-linejoin="round" />
    {#each s.values as v, i (i)}
      {#if v != null}
        {@const [x, y] = pt(i, v)}
        <circle cx={x} cy={y} r="3.2" fill={s.color} />
      {/if}
    {/each}
  {/each}
</svg>

<style>
  .radar {
    width: 100%;
    max-width: 480px;
    height: auto;
    overflow: visible;
    margin: 0 auto;
  }
</style>
