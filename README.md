# Cap Sup — aide à la décision pour la poursuite d’études

Cap Sup aide les étudiants qui **terminent un Bac+2 ou un Bac+3** à choisir leur prochaine formation : masters,
licences professionnelles, L3, BUT 3e année, écoles d’ingénieurs et de commerce (admissions parallèles), MSc…
Un mode **post-bac** (Parcoursup) est aussi disponible.

L’application calcule pour chaque formation un **taux de compatibilité** à partir de 17 critères, dont l’étudiant règle
lui-même l’importance. Chaque note est expliquée et sourcée.

**Site en ligne : https://rami5090.github.io/cap-sup/**

## Fonctionnalités

- Questionnaire en 8 étapes : parcours, situation actuelle (formation initiale ou alternance, entreprise, sujet traité),
  matières et compétences, projet de formation, métiers et enjeux d’avenir, vie pratique, budget, priorités.
- Recherche parmi les 1 138 métiers de l’ONISEP et les 48 secteurs d’activité (par exemple la logistique mène aussi à
  l’aéronautique), avec les formations qui préparent à chaque métier.
- Taux de compatibilité pondéré, recalculé en direct quand on bouge un curseur de priorité.
- Fiche détaillée par formation : explication de chaque critère, budget mensuel, taux de propositions selon le diplôme
  d’origine (L3, licence pro, BUT), insertion professionnelle, loyers, résidences Crous, empreinte carbone.
- Filtres (rayon, type, public, alternance, budget, domaines), tri, favoris.
- Carte des formations (fond Plan IGN) avec les résidences Crous.
- Comparateur de 2 à 4 formations (graphique radar et tableau).
- Page « Méthode et sources » : formule, hypothèses, limites.
- Tri et filtre par **proximité avec ton projet et ton sujet** (mots en commun avec la formation).
- **Sauvegarde en ligne chiffrée de bout en bout**, facultative : les réponses suivent l’étudiant d’un appareil à
  l’autre, illisibles pour le serveur comme pour son administrateur (voir plus bas). Fichier de sauvegarde à exporter
  ou importer.
- Thème clair ou sombre, affichage mobile, navigation au clavier. Sans sauvegarde en ligne, les réponses restent dans
  le navigateur.

## Les 17 critères

| Famille | Critères |
| --- | --- |
| Ton projet | Intérêt pour le domaine, format et rythme, proximité avec ton projet et ton sujet, continuité avec ton entreprise (alternance) |
| Réussite | Cohérence avec le parcours, chances d’admission, niveau dans les matières clés, compétences |
| Métiers et avenir | Débouchés vers tes métiers, insertion professionnelle, enjeux pour plus tard (emploi, salaire, international, impact…) |
| Argent | Budget (ressources − coûts), coût de l’immobilier |
| Vie quotidienne | Logement disponible, trajet, ratio énergie / charge |
| Planète | Empreinte carbone des trajets |

`taux = Σ (importance × note) ÷ Σ importance`. Un critère « non concerné » (par exemple le logement quand on reste chez
soi) est retiré du calcul.

## Sources de données (open data officielles)

| Donnée | Producteur |
| --- | --- |
| Mon Master 2025 : capacités, candidatures, propositions par origine | Ministère de l’Enseignement supérieur (SIES) |
| InserSup : emploi et salaires des diplômés | Ministère de l’Enseignement supérieur (SIES) |
| Compatibilités mentions de licence → master | Ministère de l’Enseignement supérieur |
| Parcoursup 2025 (mode post-bac) | Ministère de l’Enseignement supérieur (SIES) |
| Idéo-Actions de formation – enseignement supérieur | ONISEP |
| Idéo-Fiches métiers (secteurs, niveau d’accès, formations menant au métier) — licence ODbL | ONISEP |
| Idéo-Métiers (domaines et codes ROME des métiers) | ONISEP |
| Trouver mon master : mots-clés métiers, secteurs et disciplines des mentions | Ministère de l’Enseignement supérieur |
| Carte des loyers 2025 (T1-T2) | Estimations ANIL, à partir des données du Groupe SeLoger et de leboncoin |
| Zonage ABC (juin 2026) | Ministère du Logement |
| Résidences étudiantes | CNOUS (réseau des Crous) |
| Communes (recherche, centres) | geo.api.gouv.fr |
| Facteurs d’émission des transports | ADEME – Impact CO2 |
| Droits d’inscription, CVEC, bourses, salaire apprenti 2026-2027 | service-public.gouv.fr |
| Fond de carte | IGN – Plan IGN (Géoplateforme) |

## Lancer l’application

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests du moteur de calcul (Vitest)
npm run build      # version statique dans dist/ (hébergeable sur n’importe quel serveur de fichiers)
```

Les données préparées sont déjà dans `public/data/`. Pour les mettre à jour depuis les sources officielles :

```bash
npm run data:refresh   # télécharge les jeux de données dans data-raw/ puis reconstruit public/data/
```

## Mettre le site à jour

Le site est servi par GitHub Pages depuis la branche `gh-pages`. Après une modification :

```bash
npm run deploy   # construit l’application et publie dist/ sur la branche gh-pages
```

Le site se met à jour en une à deux minutes. L’envoi utilise GitHub CLI s’il est connecté, sinon les identifiants Git habituels.

## Sauvegarde en ligne chiffrée

- **Chiffrement sur l’appareil** : la phrase secrète donne la clé (PBKDF2-SHA-256, 600 000 itérations, sel
  aléatoire), les réponses sont chiffrées en AES-256-GCM avant de partir. Le serveur ne reçoit que
  `{v, iter, salt, iv, ct, at}` ; la date `at` est liée au chiffré (une vieille version ne peut pas passer pour
  récente). La phrase ne quitte jamais l’appareil ; la clé y est retenue pour synchroniser sans la redemander.
- **Phrase oubliée** : la sauvegarde est perdue (c’est le principe) ; on peut repartir des réponses d’un appareil avec
  une nouvelle phrase.
- **Entre appareils** : la version la plus récente gagne ; au premier déverrouillage d’un appareil qui a déjà des
  réponses, on choisit lesquelles garder.
- **Où** : sur le site en ligne, dans **Firebase**, avec le compte du Cockpit de révision (même projet, même e-mail et
  même mot de passe), document `capsup/<identifiant du compte>` ; dans **Unaa OS**, sur le serveur de la famille
  (compte = le membre connecté).
- **Mise en service Firebase** (une fois, console du projet `cockpit-revision-44fa9`, Firestore › Règles) : ajouter,
  dans `match /databases/{database}/documents { … }`,

  ```
  match /capsup/{uid} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
  ```

- **Code** : `src/lib/vault.ts` (chiffrement), `cloud.svelte.ts` (synchronisation), `remote.ts` (Unaa OS),
  `remote-firebase.ts` (Firebase, chargé seulement à l’usage), `components/CloudPanel.svelte` (fenêtre).
  Le navigateur ne chiffre que sur une adresse sécurisée (https, ou localhost).

## Dans Unaa OS

Cap Sup est aussi un **module d’Unaa OS** (onglet 🎓 Cap Sup) : la même version construite, servie sous
`/apps/capsup/`. Elle le reconnaît à son adresse : réponses propres à chaque membre de la famille, sauvegarde chiffrée
sur le serveur familial. Mise à jour du module : `bash infra/build-capsup.sh` dans le dépôt Unaa OS, puis déploiement
d’Unaa OS.

## Technologies

- **Svelte 5 (runes) + Vite + TypeScript** : réactivité compilée, le classement de ~10 000 formations se recalcule en
  moins de 10 ms quand une pondération change ; application 100 % statique (~68 Ko gzip, hors carte).
- **Leaflet** (chargé à la demande) avec les tuiles du Plan IGN.
- **Vitest** pour les tests du moteur de compatibilité et du chiffrement.
- **Web Crypto** (chiffrement dans le navigateur) et **Firebase** (Authentication + Firestore Lite), chargé seulement
  pour la sauvegarde en ligne du site.
- Un **pipeline Node** (`scripts/`) qui télécharge, nettoie, géolocalise et croise les jeux de données.

## Structure

```
scripts/            pipeline de données (sources, téléchargement, construction)
public/data/        données préparées (offres par niveau, références, Crous, compatibilités)
src/lib/            moteur : types, constantes sourcées, critères, calcul, classement, état
src/components/     composants d’interface (cartes, fiche détaillée, carte, curseurs…)
src/views/          pages : accueil, questionnaire, résultats, comparateur, méthode
```

## Limites

- Statistiques d’admission de la campagne 2025 : elles évoluent chaque année.
- Les formations ONISEP n’ont pas de taux d’admission public : un ordre de grandeur par type est utilisé (signalé).
- Les temps de trajet, le loyer d’un studio et la charge de travail sont des estimations, affichées comme telles.
- L’outil complète, sans le remplacer, l’accompagnement d’un conseiller d’orientation.
