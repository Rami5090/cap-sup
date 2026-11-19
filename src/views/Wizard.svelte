<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { LEVEL_LABELS } from '../lib/profile';
  import { app, router } from '../lib/state.svelte';
  import StepBudget from './wizard/StepBudget.svelte';
  import StepMatieres from './wizard/StepMatieres.svelte';
  import StepParcours from './wizard/StepParcours.svelte';
  import StepPriorites from './wizard/StepPriorites.svelte';
  import StepProjet from './wizard/StepProjet.svelte';
  import StepVie from './wizard/StepVie.svelte';

  let { step }: { step: number } = $props();

  const STEPS = [
    { title: 'Ton parcours', short: 'Parcours', icon: 'cap', intro: 'D’où tu pars : ton diplôme, ton niveau et ton classement.', Comp: StepParcours },
    { title: 'Matières et compétences', short: 'Matières', icon: 'book', intro: 'Tes points forts, pour estimer ton aisance dans chaque formation.', Comp: StepMatieres },
    { title: 'Ton projet', short: 'Projet', icon: 'target', intro: 'Ce qui t’attire et le format d’études que tu souhaites.', Comp: StepProjet },
    { title: 'Ta vie pratique', short: 'Vie pratique', icon: 'home', intro: 'Où tu vis, comment tu te déplaces et le rythme que tu peux tenir.', Comp: StepVie },
    { title: 'Ton budget', short: 'Budget', icon: 'wallet', intro: 'Tes ressources, pour vérifier que chaque option est finançable.', Comp: StepBudget },
    { title: 'Tes priorités', short: 'Priorités', icon: 'sliders', intro: 'Le poids de chaque critère dans ton taux de compatibilité.', Comp: StepPriorites }
  ];

  const current = $derived(Math.min(Math.max(1, Number.isFinite(step) ? step : 1), STEPS.length));
  const S = $derived(STEPS[current - 1]);
  const missingHome = $derived(current === 4 && !app.profile.home);

  function next() {
    if (current < STEPS.length) router.go(`/profil/${current + 1}`);
    else {
      app.completed = true;
      router.go('/resultats');
    }
  }
  function prev() {
    router.go(current > 1 ? `/profil/${current - 1}` : '/');
  }
</script>

<div class="wizard container">
  <aside class="rail" aria-label="Étapes du questionnaire">
    <p class="small muted lvl">Profil {LEVEL_LABELS[app.profile.level]}</p>
    <ol>
      {#each STEPS as s, i (s.title)}
        <li class:done={i + 1 < current} class:cur={i + 1 === current}>
          <a href="#/profil/{i + 1}" aria-current={i + 1 === current ? 'step' : undefined}>
            <span class="b">{#if i + 1 < current}<Icon name="check" size={16} stroke={2.6} />{:else}{i + 1}{/if}</span>
            <span class="t">{s.short}</span>
          </a>
        </li>
      {/each}
    </ol>
    {#if app.completed}
      <a class="btn btn-outline btn-sm res" href="#/resultats">Voir mes résultats <Icon name="arrow" size={16} /></a>
    {/if}
  </aside>

  <div class="progress" aria-hidden="true"><span style="width: {(current / STEPS.length) * 100}%"></span></div>

  <section class="content card fade-in">
    {#key current}
      <header class="head">
        <span class="eyebrow"><Icon name={S.icon} size={16} /> Étape {current} sur {STEPS.length}</span>
        <h1>{S.title}</h1>
        <p class="muted">{S.intro}</p>
      </header>
      <div class="body">
        <S.Comp />
      </div>
    {/key}
    <footer class="nav">
      <button class="btn btn-ghost" onclick={prev}><Icon name="left" size={18} /> Retour</button>
      <span class="spacer"></span>
      {#if missingHome}<span class="small muted hint">Indique ta commune pour calculer les trajets</span>{/if}
      <button class="btn btn-primary btn-lg" onclick={next}>
        {current === STEPS.length ? 'Voir mes résultats' : 'Continuer'}
        <Icon name="arrow" size={18} />
      </button>
    </footer>
  </section>
</div>

<style>
  .wizard {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 32px;
    align-items: start;
    padding-top: 36px;
    padding-bottom: 64px;
  }
  .rail {
    position: sticky;
    top: 92px;
  }
  .lvl {
    margin: 0 0 12px 6px;
    font-weight: 650;
  }
  .rail ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .rail a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    text-decoration: none;
    color: var(--muted);
    font-weight: 600;
  }
  .rail a:hover {
    background: var(--surface);
    color: var(--text);
  }
  .b {
    width: 30px;
    height: 30px;
    flex: none;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 1px solid var(--border-strong);
    background: var(--surface);
    font-size: 0.85rem;
    font-weight: 750;
  }
  .done .b {
    background: var(--great-soft);
    border-color: transparent;
    color: var(--great);
  }
  .cur a {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-1);
  }
  .cur .b {
    background: var(--brand);
    border-color: var(--brand);
    color: var(--brand-ink);
  }
  .res {
    margin-top: 18px;
  }
  .progress {
    display: none;
  }
  .content {
    padding: clamp(22px, 4vw, 44px);
    min-width: 0;
  }
  .head {
    margin-bottom: 32px;
  }
  .head h1 {
    font-size: clamp(1.6rem, 1.2rem + 1.5vw, 2.2rem);
    margin-top: 10px;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .hint {
    margin-right: 8px;
  }
  @media (max-width: 900px) {
    .wizard {
      grid-template-columns: 1fr;
      gap: 16px;
      padding-top: 20px;
    }
    .rail {
      display: none;
    }
    .progress {
      display: block;
      height: 6px;
      border-radius: 99px;
      background: var(--surface-3);
      overflow: hidden;
    }
    .progress span {
      display: block;
      height: 100%;
      background: var(--brand);
      transition: width 0.3s ease;
    }
  }
</style>
