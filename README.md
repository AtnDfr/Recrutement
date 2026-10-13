# Qualification des besoins de recrutement — BU Data & IA

Prototype : un responsable Subject Matter sélectionne des compétences et un grade. Le moteur
retient le plus petit ensemble cohérent de métiers qui les couvre et prépare la fiche recruteur
(couverture par métier, résiduels, attentes transverses du grade, viviers, entreprises, intitulés marché).

**État : données, normalisation, moteur et tests. Aucune interface pour le moment.** Spécification : [`CLAUDE.md`](CLAUDE.md).

## Commandes

```bash
npm install
npm test             # Vitest
npm run typecheck    # TypeScript strict
npm run build:data   # régénère src/data/generated/*.json depuis data/raw/*.xlsx
npm run check:data   # échoue si les JSON commités ne correspondent plus aux classeurs
```

## Données

| Fichier | Origine |
|---|---|
| `data/raw/Ref_Competences.xlsx` | 140 compétences, 17 blocs, synonymes |
| `data/raw/Ref_Profils.xlsx` | 29 métiers : signatures (Core ≥ 3/5, Récurrente 2/5, Spécialisante 1/5), 145 fiches de poste |
| `data/raw/Ref_Sourcing.xlsx` | Viviers, entreprises, approche et confiance par métier |
| `src/data/grades.json` | Niveaux attendus (1 à 5) par grade et par axe transverse, fournis par la BU |
| `src/data/config.json` | Paramètres : plafond, poids des statuts, compétences transverses → axe du grade, formes à confirmer |

Les JSON de `src/data/generated/` sont produits par `scripts/build-referentiels.ts` et commités.
Aucune donnée n'est inventée : la sentinelle « Aucun vivier secondaire observé » devient `null`.

## Moteur de couverture (`src/engine/`)

`computeCoverage(competenceIds, referentiels)` ne reçoit pas le grade : il ne peut pas influencer les métiers.

1. Les compétences transverses (`config.competencesTransverses`) ne déclenchent jamais un métier.
2. Recherche exacte parmi les combinaisons d'au plus `plafondMetiers` métiers (3 par défaut).
   Une combinaison n'est **valide** que si chaque métier couvre **en Core** au moins une compétence
   demandée qu'aucun autre métier de la combinaison ne couvre. Une compétence déjà couverte ne peut
   donc jamais justifier seule un métier supplémentaire.
3. Choix lexicographique : plus de compétences couvertes → moins de métiers → meilleure qualité de
   couverture (Core 3, Récurrente 2, Spécialisante 1) → plus de transverses couvertes en bonus → moins
   de spécialisation non demandée portée en Core (technologie ou transverse) → ordre des identifiants.
   Les combinaisons ex aequo sont exposées (`ambigu`, `alternatives`).
4. Restitution progressive : pour chaque métier, `nouvelles` (couvertes pour la première fois) et
   `partagees` (déjà couvertes, présentes aussi dans sa signature). Une compétence peut figurer dans
   plusieurs métiers retenus, mais ne sort qu'une fois du résiduel.
5. Résiduels motivés : `hors-signatures`, `transverse-vers-grade`, `non-core-uniquement`,
   `plafond-atteint`, `arbitrage-couverture`, avec les métiers candidats. Pour `arbitrage-couverture`,
   chaque métier écarté est expliqué : métiers retenus qu'il rendrait redondants, meilleure combinaison
   qui l'inclut, couverture comparée, critère décisif et raison lisible.

Après le matching, `buildFicheRecruteur` ajoute les attentes du grade, le sourcing et les intitulés
marché des métiers retenus. Chaque compétence transverse demandée est rattachée à l'axe du grade
(niveau attendu) **et** reste dans la couverture des métiers retenus qui la portent : le grade porte la
séniorité / le leadership, le métier les compétences techniques et fonctionnelles.

## Normalisation (`src/engine/normalisation.ts`)

`normaliserTermes(formulations)` rattache chaque formulation à une compétence canonique, avant le moteur.

- Formes utilisées : identifiant (`C102`), nom canonique, synonymes (`1_Competences` et `2_Synonymes`).
  Rien d'autre ; aucune compétence n'est jamais créée.
- Correspondance exacte après mise en forme typographique : casse, accents, ligatures, apostrophes,
  tirets, espaces (y compris autour de `/`). Pas de correspondance approchée, de racinisation ni de
  correspondance partielle.
- Statuts : `reconnu` (transmis au moteur), `ambigu` (plusieurs compétences : candidats exposés),
  `a-confirmer` (forme listée dans `config.formesAConfirmer` car son rattachement peut changer le sens),
  `non-reconnu` (signalé tel quel). Seul `reconnu` est transmis au moteur. La formulation d'origine est
  toujours conservée.
- `detecterDansTexte(texte)` repère les formes dans le texte libre ou la transcription (mots entiers, la
  plus longue d'abord, sans chevauchement, avec position dans le texte d'origine). Ce sont des
  suggestions, jamais transmises au moteur.

## Points d'attention sur les référentiels

- Sourcing et corpus de fiches ne reposent pas sur le même échantillon d'employeurs : ils sont
  restitués séparément, sans fusion.
- 3 synonymes ambigus (« data transformation », « monitoring », « spark sql »).
- 73 compétences sur 140 n'apparaissent dans aucune signature métier (résiduel `hors-signatures`).
- Certains intitulés de métier portent une séniorité (Senior, Lead / Principal) alors que le grade est
  orthogonal : les données sont conservées telles quelles.
- « Monitoring » est à la fois le nom canonique de C059 et un synonyme d'Observabilité (C060) :
  traité comme ambigu.
- Certains synonymes peuvent changer le sens (« CV », « TypeScript », « risk », « valeur », « ROI »,
  « production », « run », « lake », « logs ») : listés dans `config.formesAConfirmer`.
