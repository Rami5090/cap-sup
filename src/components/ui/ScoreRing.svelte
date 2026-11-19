<script lang="ts">
  import { scoreTone } from '../../lib/format';

  interface Props {
    score: number | null;
    size?: number;
    label?: string;
  }
  let { score, size = 64, label = 'Compatibilité' }: Props = $props();
  const r = 26;
  const c = 2 * Math.PI * r;
  const tone = $derived(scoreTone(score));
  const dash = $derived(score == null ? 0 : (Math.max(0, Math.min(100, score)) / 100) * c);
</script>

<div class="ring tone-{tone}" style="width:{size}px;height:{size}px" role="img" aria-label="{label} : {score == null ? 'non calculé' : `${score} %`}">
  <svg viewBox="0 0 64 64" width={size} height={size}>
    <circle cx="32" cy="32" r={r} fill="none" stroke="var(--tone-soft)" stroke-width="7" />
    <circle
      cx="32"
      cy="32"
      r={r}
      fill="none"
      stroke="var(--tone)"
      stroke-width="7"
      stroke-linecap="round"
      stroke-dasharray="{dash} {c}"
      transform="rotate(-90 32 32)"
    />
  </svg>
  <span class="val num" style="font-size:{Math.round(size * 0.27)}px">{score == null ? '–' : score}<small>{score == null ? '' : '%'}</small></span>
</div>

<style>
  .ring {
    position: relative;
    flex: none;
  }
  .ring svg circle:last-of-type {
    transition: stroke-dasharray 0.4s ease;
  }
  .val {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--tone);
    letter-spacing: -0.02em;
  }
  small {
    font-size: 0.55em;
    font-weight: 700;
    margin-left: 1px;
  }
  .val {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
