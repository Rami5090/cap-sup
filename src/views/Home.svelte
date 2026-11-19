<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { app, router } from '../lib/state.svelte';
  import type { Level } from '../lib/types';

  function start(level: Level) {
    app.setLevel(level);
    router.go('/profil/1');
  }

  const SOURCES = [
    { name: 'Mon Master 2025', what: 'capacités, candidatures et taux de proposition par parcours', by: 'Ministère de l’Enseignement supérieur' },
    { name: 'InserSup', what: 'emploi et salaires des diplômés', by: 'Ministère de l’Enseignement supérieur' },
    { name: 'ONISEP', what: 'formations, établissements, coûts, hébergement', by: 'Idéo – open data ONISEP' },
    { name: 'Parcoursup 2025', what: 'formations post-bac et profils des admis', by: 'Ministère de l’Enseignement supérieur' },
    { name: 'Carte des loyers 2025', what: 'loyers au m² par commune', by: 'ANIL / Ministère du Logement' },
    { name: 'Zonage ABC 2026', what: 'tension du marché du logement', by: 'Ministère du Logement' },
    { name: 'Résidences Crous', what: 'logements étudiants géolocalisés', by: 'CNOUS' },
    { name: 'Impact CO2', what: 'émissions des modes de transport', by: 'ADEME' }
  ];
</script>

<section class="hero container">
  <div class="intro fade-in">
    <span class="eyebrow"><Icon name="compass" size={16} /> Aide à la décision · données officielles</span>
    <h1>Ta poursuite d’études,<br /><span class="hl">choisie selon tes priorités.</span></h1>
    <p class="lead muted">
      Tu termines un Bac+2 ou un Bac+3 ? Cap Sup compare les masters, licences pro, écoles et autres formations
      selon ton profil, ton budget, ton logement et tes trajets. Il calcule un <strong>taux de compatibilité</strong>
      dont tu choisis toi-même les ingrédients.
    </p>
    {#if app.completed}
      <div class="row resume">
        <button class="btn btn-primary btn-lg" onclick={() => router.go('/resultats')}>
          Revoir mes résultats <Icon name="arrow" size={18} />
        </button>
        <button class="btn btn-outline btn-lg" onclick={() => router.go('/profil/1')}>Modifier mon profil</button>
      </div>
    {/if}
  </div>

  <div class="choices">
    <h2 class="sr-only">Où en es-tu ?</h2>
    <button class="choice card fade-in" onclick={() => start(3)}>
      <span class="tag badge badge-brand">Le plus courant</span>
      <span class="ico"><Icon name="cap" size={28} /></span>
      <span class="ttl">Je termine un <strong>Bac+3</strong></span>
      <span class="sub muted">Licence, BUT, licence pro, bachelor…</span>
      <span class="to">Masters (Mon Master), écoles d’ingénieurs et de commerce, MSc <Icon name="arrow" size={16} /></span>
    </button>
    <button class="choice card fade-in" onclick={() => start(2)}>
      <span class="ico"><Icon name="layers" size={28} /></span>
      <span class="ttl">Je termine un <strong>Bac+2</strong></span>
      <span class="sub muted">BTS, BUT 2e année, L2, prépa, DEUST…</span>
      <span class="to">Licences pro, L3, BUT 3e année, écoles, bachelors <Icon name="arrow" size={16} /></span>
    </button>
    <button class="choice-mini" onclick={() => start(0)}>
      Tu es en terminale ? <strong>Mode post-bac (Parcoursup)</strong> <Icon name="right" size={16} />
    </button>
  </div>
</section>

<section class="steps container">
  <div class="step">
    <span class="n">1</span>
    <div>
      <h3>Ton profil</h3>
      <p class="muted">Ton parcours, tes notes, tes compétences, ce qui te plaît. Compte environ 5 minutes.</p>
    </div>
  </div>
  <div class="step">
    <span class="n">2</span>
    <div>
      <h3>Tes contraintes et tes priorités</h3>
      <p class="muted">Budget, logement, trajets, énergie… et l’importance de chaque critère dans le calcul.</p>
    </div>
  </div>
  <div class="step">
    <span class="n">3</span>
    <div>
      <h3>Des offres classées et expliquées</h3>
      <p class="muted">Un taux de compatibilité pour chaque formation, avec le détail critère par critère et les sources.</p>
    </div>
  </div>
</section>

<section class="sources container">
  <div class="card card-flat">
    <div class="row head">
      <Icon name="shieldcheck" size={22} />
      <h2>Des données publiques et vérifiables</h2>
    </div>
    <p class="muted">
      Chaque chiffre vient d’un jeu de données ouvert publié par un organisme public. Quand une valeur est une
      estimation (temps de trajet, loyer d’un studio…), l’application l’indique clairement.
    </p>
    <ul class="src-grid">
      {#each SOURCES as s (s.name)}
        <li>
          <strong>{s.name}</strong>
          <span class="small muted">{s.what}</span>
          <span class="tiny faint">{s.by}</span>
        </li>
      {/each}
    </ul>
    <div class="row foot">
      <span class="small muted"><Icon name="lock" size={16} class="inline" /> Tes réponses restent dans ton navigateur : rien n’est envoyé à un serveur.</span>
      <span class="spacer"></span>
      <a class="btn btn-ghost btn-sm" href="#/methode">Méthode et sources <Icon name="arrow" size={16} /></a>
    </div>
  </div>
</section>

<style>
  .hero {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: clamp(28px, 5vw, 64px);
    align-items: center;
    padding-top: clamp(32px, 6vw, 72px);
    padding-bottom: clamp(32px, 5vw, 56px);
  }
  .hl {
    background: linear-gradient(90deg, var(--brand), #7b5cff);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .lead {
    font-size: 1.12rem;
    max-width: 56ch;
    margin-top: 18px;
  }
  .resume {
    margin-top: 28px;
  }
  .choices {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .choice {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto auto;
    column-gap: 18px;
    row-gap: 2px;
    text-align: left;
    cursor: pointer;
    color: var(--text);
    transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
  }
  .choice:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-2);
    border-color: var(--brand);
  }
  .choice .ico {
    grid-row: 1 / 4;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    background: var(--brand-soft);
    color: var(--brand-strong);
  }
  .ttl {
    font-size: 1.25rem;
    font-weight: 650;
  }
  .sub {
    font-size: 0.95rem;
  }
  .to {
    margin-top: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--brand-strong);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .to :global(svg) {
    display: inline;
  }
  .tag {
    position: absolute;
    top: 14px;
    right: 14px;
  }
  .choice-mini {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 8px 4px;
    cursor: pointer;
    font-size: 0.95rem;
  }
  .choice-mini:hover {
    color: var(--brand-strong);
  }
  .choice-mini strong {
    color: var(--brand-strong);
  }
  .steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    padding-top: 8px;
    padding-bottom: 48px;
  }
  .step {
    display: flex;
    gap: 14px;
  }
  .step h3 {
    margin-bottom: 4px;
  }
  .n {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    font-weight: 800;
    color: var(--brand-strong);
  }
  .sources {
    padding-bottom: 64px;
  }
  .head {
    gap: 10px;
    color: var(--brand-strong);
  }
  .head h2 {
    margin: 0;
    color: var(--text);
  }
  .src-grid {
    list-style: none;
    padding: 0;
    margin: 20px 0 8px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 12px;
  }
  .src-grid li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px 16px;
    border-radius: var(--r-md);
    background: var(--surface-2);
  }
  .foot {
    margin-top: 12px;
  }
  .foot :global(.inline) {
    display: inline;
    vertical-align: -3px;
    margin-right: 4px;
  }
  @media (max-width: 860px) {
    .hero {
      grid-template-columns: 1fr;
    }
    .steps {
      grid-template-columns: 1fr;
    }
  }
</style>
