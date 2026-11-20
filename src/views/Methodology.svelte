<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import {
    ALTERNANCE_LOAD, APPRENTI_SOURCE, BOURSES_SOURCE, CO2_PER_KM, CO2_SOURCE, COLOC_FACTOR, CROUS_RENT, DETOUR, FEES,
    FEES_SOURCE, PENIBILITE, RENT_SOURCE, SMIC_BRUT, STUDIO_M2, TRANSPORT_LABELS, TYPES, TYPES_BY_LEVEL, ZONAGE_SOURCE
  } from '../lib/constants';
  import { CRITERIA, FAMILIES } from '../lib/criteria';
  import { fmt1, fmtEuro, fmtInt } from '../lib/format';
  import { data } from '../lib/store.svelte';
  import type { TransportMode } from '../lib/types';

  $effect(() => {
    data.init();
  });

  const generated = $derived(data.meta ? new Date(data.meta.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '…');
  const modes = Object.keys(TRANSPORT_LABELS) as TransportMode[];

  const HOW: Record<string, string> = {
    interet: 'Passion = 100, intérêt = 75. Un domaine voisin de tes intérêts obtient 25, un domaine sans lien 5.',
    format: '60 % pour le type de formation (100 s’il fait partie de tes choix, 35 sinon, 80 si tu n’as rien choisi) et 40 % pour l’alternance selon ta préférence.',
    thematique: 'Mots de ton projet de formation, de ton sujet actuel et de tes missions retrouvés dans l’intitulé, le parcours et les mots-clés de la formation (Trouver mon master, sous-domaines ONISEP). Les mots rares pèsent plus que les mots courants. Aucun mot en commun = 15 ; la moitié des mots (pondérés) = 100. Non concerné si tu n’as rien décrit.',
    entreprise: 'Non concerné si tu n’es pas en alternance avec une entreprise qui peut te garder. Sinon : 10 si la formation ne propose pas l’alternance ; avec alternance, 100 jusqu’à 30 km de ton entreprise, 70 à 80 km, 40 à 200 km ; + 10 si la formation mène à des métiers du secteur de ton entreprise.',
    metiers: '100 si la formation fait partie des formations qui mènent à un métier que tu vises (fiches métiers ONISEP) ; 75 si elle mène à des métiers des secteurs choisis ; 55 si sa thématique est proche d’un métier visé ; 35 si même domaine ; 5 sinon. Non concerné si tu n’as choisi ni métier ni secteur.',
    enjeux: 'Moyenne des enjeux choisis : emploi (taux d’emploi à 18 mois), salaire (salaire médian, sinon ordre de grandeur par type de diplôme), stabilité (emplois stables), international, entrepreneuriat, service public, recherche et impact (mots-clés, domaines, statuts des métiers accessibles), alternance, équilibre (ratio énergie / charge) et proximité (trajet).',
    parcours: 'Bac+3 vers master : 100 si ta mention de licence figure dans la liste officielle des licences compatibles avec la mention de master. Sinon, de 20 à 85 selon la proximité des domaines, avec un ajustement selon la part d’admis 2025 venant du même type de diplôme que toi. Post-bac : part des admis ayant le même type de bac.',
    admission: 'Taux de proposition observé pour ton origine (L3, licence pro, BUT… dans Mon Master 2025) ou taux d’accès Parcoursup, modulé selon ta position estimée (moyenne et classement). La probabilité obtenue est convertie en note : 50 % de chances ≈ 67/100.',
    matieres: 'Moyenne de tes notes dans les matières clés du domaine, comparée au niveau attendu (déduit de la sélectivité ou des mentions des admis). Égalité = 70 ; chaque point d’écart vaut 12 points de note.',
    competences: 'Chaque compétence exigée (domaine + type de formation + alternance) fixe un niveau cible de 3 à 5 sur 5. La note mesure l’écart avec ton auto-évaluation.',
    insertion: 'Taux d’emploi salarié à 18 mois (60 %), part d’emplois stables (25 %) et salaire net médian (15 %) des diplômés, pour ce diplôme dans l’établissement, sinon à défaut la moyenne nationale de la mention ou celle de l’établissement.',
    budget: 'Différence entre tes ressources mensuelles (aides, bourse lissée sur 10 mois, épargne, salaire d’apprenti) et tes dépenses (logement si tu déménages, vie courante, transports, frais de scolarité et CVEC lissés). Équilibre = 70/100 ; −500 €/mois = 0 ; +300 €/mois = 100.',
    immobilier: 'Loyer au m² charges comprises des T1-T2 dans la commune : 11 €/m² = 100, 17 €/m² = 60, 33 €/m² = 5. Non concerné si tu restes chez toi.',
    logement: 'Résidences Crous à moins de 10 km et tension du marché (zonage ABC : A bis = 20 … C = 85), pondérées selon le logement que tu vises. Bonus si l’établissement propose un internat ou des solutions d’hébergement.',
    trajet: 'Si tu fais les trajets : 100 jusqu’à 40 % de ton temps maximum, puis baisse jusqu’à 50 au maximum. Si tu déménages : 75, moins 10 à 30 points selon l’éloignement de chez toi. 0 si le trajet dépasse ton maximum et que tu ne veux pas déménager.',
    energie: 'Ratio entre ton énergie hebdomadaire et ta charge totale : cours et travail personnel, trajets pondérés par leur pénibilité, job étudiant. Ratio 1,1 = 85 ; 0,95 = 65 ; 0,8 = 35.',
    carbone: 'Émissions annuelles des trajets (32 semaines de cours ; si tu déménages, trajets locaux et 10 allers-retours chez toi par an), avec les facteurs de l’ADEME. 150 kg = 80 ; 400 kg = 55 ; 800 kg = 30.'
  };
</script>

<div class="method container">
  <header>
    <span class="eyebrow"><Icon name="database" size={16} /> Transparence</span>
    <h1>Méthode et sources</h1>
    <p class="lead muted">
      Cap Sup ne remplace pas un conseiller d’orientation (Psy-EN, service d’orientation de ton université ou CIO). Il
      t’aide à comparer des options avec des données publiques, selon des critères que tu pondères toi-même.
    </p>
  </header>

  <section class="card formula">
    <h2>Le taux de compatibilité</h2>
    <p>Chaque formation reçoit une note de 0 à 100 sur 17 critères. Le taux est leur moyenne pondérée par l’importance que tu donnes à chacun (de 0 à 5) :</p>
    <p class="eq">Taux = Σ (importance × note) ÷ Σ importance</p>
    <p class="muted small">
      Un critère « non concerné » (par exemple le coût du logement quand tu restes chez toi) est retiré du calcul : il ne
      pénalise ni ne favorise la formation. La <strong>fiabilité</strong> affichée dans chaque fiche indique la part du calcul
      qui repose sur des données officielles plutôt que sur des estimations.
    </p>
  </section>

  {#each FAMILIES as f (f.id)}
    <section class="fam">
      <h2><Icon name={f.icon} size={20} /> {f.label}</h2>
      <div class="grid">
        {#each CRITERIA.filter((c) => c.family === f.id) as c (c.id)}
          <article class="card card-flat crit">
            <h3><Icon name={c.icon} size={18} /> {c.label}</h3>
            <p class="small muted">{c.help}</p>
            <p class="small">{HOW[c.id]}</p>
          </article>
        {/each}
      </div>
    </section>
  {/each}

  <section>
    <h2>Données utilisées</h2>
    <p class="muted">Jeu de données préparé le {generated} à partir des sources suivantes, toutes sous licence ouverte :</p>
    <ul class="sources">
      {#each data.meta?.sources ?? [] as s (s.key)}
        <li class="card card-flat">
          <strong>{s.label}</strong>
          <span class="small muted">{s.producer} · {s.licence}</span>
          <a class="small" href={s.page} target="_blank" rel="noopener">Voir le jeu de données <Icon name="external" size={14} class="inline" /></a>
        </li>
      {/each}
      <li class="card card-flat">
        <strong>Droits d’inscription et CVEC 2026-2027</strong>
        <span class="small muted">Licence {fmtEuro(FEES.licence)}, master {fmtEuro(FEES.master)}, ingénieur {fmtEuro(FEES.ingenieur)}, CVEC {fmtEuro(FEES.cvec)}</span>
        <a class="small" href={FEES_SOURCE.url} target="_blank" rel="noopener">{FEES_SOURCE.label}</a>
      </li>
      <li class="card card-flat">
        <strong>Bourses sur critères sociaux 2026-2027</strong>
        <span class="small muted">Montants annuels par échelon, versés en 10 mensualités</span>
        <a class="small" href={BOURSES_SOURCE.url} target="_blank" rel="noopener">{BOURSES_SOURCE.label}</a>
      </li>
      <li class="card card-flat">
        <strong>Rémunération des apprentis</strong>
        <span class="small muted">Pourcentage du SMIC selon l’âge (SMIC brut 2026 : {fmtEuro(SMIC_BRUT)})</span>
        <a class="small" href={APPRENTI_SOURCE.url} target="_blank" rel="noopener">{APPRENTI_SOURCE.label}</a>
      </li>
      <li class="card card-flat">
        <strong>Facteurs d’émission des transports</strong>
        <span class="small muted">kg CO2e par voyageur·km</span>
        <a class="small" href={CO2_SOURCE.url} target="_blank" rel="noopener">{CO2_SOURCE.label}</a>
      </li>
      <li class="card card-flat">
        <strong>Fond de carte</strong>
        <span class="small muted">Plan IGN, service de tuiles de la Géoplateforme</span>
        <a class="small" href="https://geoservices.ign.fr/" target="_blank" rel="noopener">IGN – Géoservices</a>
      </li>
    </ul>
    <p class="small muted">Mention obligatoire pour les loyers : {RENT_SOURCE.label}. Zonage : {ZONAGE_SOURCE.label}.</p>
  </section>

  <section>
    <h2>Hypothèses de calcul</h2>
    <p class="muted">Ces valeurs ne viennent pas d’un jeu de données : ce sont des ordres de grandeur. Elles sont signalées comme « estimations » dans les fiches.</p>
    <div class="hyp">
      <div class="card card-flat">
        <h3>Logement</h3>
        <ul class="small">
          <li>Studio : {STUDIO_M2} m² au loyer moyen T1-T2 de la commune (ANIL, charges comprises) ; colocation : {Math.round(COLOC_FACTOR * 100)} % de ce montant.</li>
          <li>
            Résidence Crous, selon le zonage : {#each Object.entries(CROUS_RENT) as [z, v], i (z)}{z} {fmtEuro(v)}{i < 4 ? ' · ' : ''}{/each}. S’il n’y a pas de résidence à moins de 10 km, on retient le prix d’un studio.
          </li>
          <li>Tu continues d’habiter chez toi tant que le trajet reste sous ton maximum ; au-delà, tu déménages (si tu l’as accepté).</li>
        </ul>
      </div>
      <div class="card card-flat">
        <h3>Trajets</h3>
        <ul class="small">
          <li>Distance routière ≈ {fmt1(DETOUR)} × la distance à vol d’oiseau ; vitesse moyenne et temps d’accès fixes selon le mode.</li>
          <li>32 semaines de cours par an, 5 jours par semaine ; après un déménagement, trajet local de 3 km et 10 allers-retours par an vers chez toi.</li>
          <li>Coûts : voiture 0,15 €/km (carburant et usure), covoiturage 0,07 €/km, bus ou tram 30 €/mois, abonnement TER plafonné à 160 €/mois, vélo 10 €/mois.</li>
          <li>Pénibilité d’une heure de trajet : {#each modes as m, i (m)}{TRANSPORT_LABELS[m].toLowerCase()} {fmt1(PENIBILITE[m])}{i < modes.length - 1 ? ' · ' : ''}{/each}.</li>
          <li>Émissions (kg CO2e/km) : {#each modes as m, i (m)}{TRANSPORT_LABELS[m].toLowerCase()} {CO2_PER_KM[m]}{i < modes.length - 1 ? ' · ' : ''}{/each}.</li>
        </ul>
      </div>
      <div class="card card-flat">
        <h3>Charge de travail hebdomadaire</h3>
        <p class="small muted">Cours et travail personnel, en heures. Semaine en alternance : {ALTERNANCE_LOAD} h.</p>
        <ul class="small cols">
          {#each [...new Set([...TYPES_BY_LEVEL[3], ...TYPES_BY_LEVEL[2], ...TYPES_BY_LEVEL[0]])] as t (t)}
            <li>{TYPES[t].label} : {fmtInt(TYPES[t].load)} h</li>
          {/each}
        </ul>
      </div>
      <div class="card card-flat">
        <h3>Quand il n’y a pas de statistique publique</h3>
        <p class="small">
          Les formations issues de l’ONISEP (licences pro, L3, écoles…) n’ont pas de taux d’admission publié. Le calcul utilise
          alors un taux indicatif par type de formation, signalé comme estimation. Les frais de scolarité inconnus d’un
          établissement privé sont estimés par la médiane des formations comparables qui les publient.
        </p>
      </div>
    </div>
  </section>

  <section class="card card-flat limits">
    <h2>Limites à connaître</h2>
    <ul>
      <li>Les statistiques d’admission sont celles de la campagne 2025 : elles changent d’une année à l’autre.</li>
      <li>Depuis 2022, les données ouvertes de l’ONISEP ne recensent plus les formations proposées en apprentissage : l’alternance y est signalée seulement quand l’offre la mentionne.</li>
      <li>Les données d’insertion ne couvrent pas toutes les formations ; elles portent sur les diplômés qui ont quitté l’enseignement supérieur.</li>
      <li>Les temps de trajet sont estimés : vérifie-les avec un calculateur d’itinéraire avant de décider.</li>
      <li>Les exigences en matières et en compétences par domaine sont une grille de lecture inspirée des attendus nationaux et des fiches ONISEP, pas une règle officielle.</li>
    </ul>
  </section>

  <section class="card card-flat privacy">
    <h2><Icon name="lock" size={20} /> Confidentialité</h2>
    <p class="small">
      Tes réponses sont enregistrées uniquement dans ton navigateur (stockage local). L’application interroge seulement
      deux services publics : l’API Découpage administratif (geo.api.gouv.fr) avec le texte que tu tapes pour chercher ta
      commune, et les tuiles du Plan IGN pour la carte.
    </p>
  </section>
</div>

<style>
  .method {
    padding-top: 36px;
    padding-bottom: 72px;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }
  .lead {
    font-size: 1.08rem;
    max-width: 72ch;
  }
  .formula .eq {
    font-size: 1.25rem;
    font-weight: 750;
    padding: 18px 20px;
    border-radius: var(--r-md);
    background: var(--brand-soft);
    color: var(--brand-strong);
    text-align: center;
  }
  .fam h2 {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
  }
  .crit h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.02rem;
  }
  .crit p:last-child {
    margin-bottom: 0;
  }
  .sources {
    list-style: none;
    padding: 0;
    margin: 16px 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }
  .sources li {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
  }
  .hyp {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 14px;
    margin-top: 16px;
  }
  .hyp ul {
    padding-left: 18px;
    display: grid;
    gap: 6px;
    margin: 0;
  }
  .cols {
    columns: 2;
    display: block !important;
  }
  .limits ul {
    padding-left: 18px;
    display: grid;
    gap: 8px;
    margin: 0;
  }
  .privacy h2 {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  :global(.inline) {
    display: inline;
    vertical-align: -2px;
  }
</style>
