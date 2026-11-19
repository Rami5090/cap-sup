<script lang="ts">
  import Icon from './components/Icon.svelte';
  import { app, router } from './lib/state.svelte';
  import Compare from './views/Compare.svelte';
  import Home from './views/Home.svelte';
  import Methodology from './views/Methodology.svelte';
  import Results from './views/Results.svelte';
  import Wizard from './views/Wizard.svelte';

  const route = $derived.by(() => {
    const p = router.path;
    const m = p.match(/^\/profil\/(\d+)/);
    if (m) return { name: 'profil' as const, step: Number(m[1]) };
    if (p.startsWith('/resultats')) return { name: 'resultats' as const };
    if (p.startsWith('/comparer')) return { name: 'comparer' as const };
    if (p.startsWith('/methode')) return { name: 'methode' as const };
    return { name: 'accueil' as const };
  });

  $effect(() => {
    const root = document.documentElement;
    if (app.theme === 'auto') delete root.dataset.theme;
    else root.dataset.theme = app.theme;
  });

  const TITLES = { accueil: 'Accueil', profil: 'Mon profil', resultats: 'Résultats', comparer: 'Comparer', methode: 'Méthode et sources' };
  $effect(() => {
    document.title = `${TITLES[route.name]} · Cap Sup`;
  });

  function cycleTheme() {
    const dark = app.theme === 'dark' || (app.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    app.theme = dark ? 'light' : 'dark';
  }
  const isDark = $derived(app.theme === 'dark' || (app.theme === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches));
  let menu = $state(false);
</script>

<a class="skip" href="#contenu">Aller au contenu</a>

<header class="bar">
  <div class="container inner">
    <a class="brand" href="#/" aria-label="Cap Sup, accueil">
      <span class="logo"><Icon name="compass" size={22} stroke={2.2} /></span>
      <span>Cap <strong>Sup</strong></span>
    </a>
    <button class="btn btn-ghost btn-icon burger" aria-label="Menu" aria-expanded={menu} onclick={() => (menu = !menu)}><Icon name="menu" /></button>
    <nav class:open={menu} aria-label="Navigation principale">
      <a href="#/profil/1" aria-current={route.name === 'profil' ? 'page' : undefined} onclick={() => (menu = false)}><Icon name="edit" size={18} /> Mon profil</a>
      <a href="#/resultats" aria-current={route.name === 'resultats' ? 'page' : undefined} onclick={() => (menu = false)}><Icon name="list" size={18} /> Résultats</a>
      <a href="#/comparer" aria-current={route.name === 'comparer' ? 'page' : undefined} onclick={() => (menu = false)}>
        <Icon name="columns" size={18} /> Comparer {#if app.compare.length}<span class="count">{app.compare.length}</span>{/if}
      </a>
      <a href="#/methode" aria-current={route.name === 'methode' ? 'page' : undefined} onclick={() => (menu = false)}><Icon name="info" size={18} /> Méthode et sources</a>
    </nav>
    <button class="btn btn-ghost btn-icon theme" onclick={cycleTheme} aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'} title="Thème">
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  </div>
</header>

<main id="contenu">
  {#if route.name === 'profil'}
    <Wizard step={route.step} />
  {:else if route.name === 'resultats'}
    <Results />
  {:else if route.name === 'comparer'}
    <Compare />
  {:else if route.name === 'methode'}
    <Methodology />
  {:else}
    <Home />
  {/if}
</main>

<footer class="foot">
  <div class="container inner small muted">
    <span>Cap Sup · aide à la décision pour la poursuite d’études</span>
    <span>Données : Mon Master, Parcoursup, InserSup (MESR) · ONISEP · ANIL · Crous · ADEME · IGN</span>
    <a href="#/methode">Méthode, sources et limites</a>
  </div>
</footer>

<style>
  .skip {
    position: absolute;
    left: -999px;
    top: 8px;
    z-index: 1000;
    background: var(--surface);
    padding: 8px 14px;
    border-radius: 8px;
  }
  .skip:focus {
    left: 12px;
  }
  .bar {
    position: sticky;
    top: 0;
    z-index: 800;
    background: color-mix(in srgb, var(--bg) 82%, transparent);
    backdrop-filter: saturate(1.4) blur(12px);
    -webkit-backdrop-filter: saturate(1.4) blur(12px);
    border-bottom: 1px solid var(--border);
  }
  .bar .inner {
    display: flex;
    align-items: center;
    gap: 16px;
    min-height: 68px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: var(--text);
    font-size: 1.2rem;
    letter-spacing: -0.01em;
    margin-right: auto;
  }
  .logo {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: var(--brand);
    color: var(--brand-ink);
  }
  nav {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  nav a {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    border-radius: var(--r-pill);
    color: var(--muted);
    text-decoration: none;
    font-weight: 600;
    font-size: 0.94rem;
  }
  nav a:hover {
    color: var(--text);
    background: var(--surface-2);
  }
  nav a[aria-current='page'] {
    color: var(--brand-strong);
    background: var(--brand-soft);
  }
  .count {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 99px;
    background: var(--brand);
    color: var(--brand-ink);
    font-size: 0.75rem;
    display: inline-grid;
    place-items: center;
  }
  .burger {
    display: none;
  }
  main {
    min-height: calc(100vh - 68px - 90px);
  }
  .foot {
    border-top: 1px solid var(--border);
    padding: 26px 0;
  }
  .foot .inner {
    display: flex;
    gap: 8px 24px;
    flex-wrap: wrap;
    justify-content: space-between;
  }
  @media (max-width: 900px) {
    .burger {
      display: inline-flex;
      order: 2;
    }
    .theme {
      order: 1;
    }
    nav {
      display: none;
      position: absolute;
      top: 68px;
      left: 0;
      right: 0;
      flex-direction: column;
      align-items: stretch;
      padding: 12px 16px 18px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      box-shadow: var(--shadow-2);
    }
    nav.open {
      display: flex;
    }
    nav a {
      padding: 12px 14px;
      border-radius: var(--r-md);
    }
  }
</style>
