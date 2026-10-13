# Qualification des besoins de recrutement — BU Data & IA

Prototype : un responsable Subject Matter sélectionne des compétences et un grade. Le moteur
retient le plus petit ensemble cohérent de métiers qui les couvre et prépare la fiche recruteur
(couverture par métier, résiduels, attentes transverses du grade, viviers, entreprises, intitulés marché).

**État : données, moteur et tests. Aucune interface pour le moment.** Spécification : [`CLAUDE.md`](CLAUDE.md).

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
| `src/data/config.json` | Paramètres du moteur (plafond, poids des statuts, compétences transverses → axe) |

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
   `plafond-atteint`, `arbitrage-couverture`, avec les métiers candidats.

Après le matching, `buildFicheRecruteur` ajoute les attentes du grade (avec le niveau attendu pour les
transverses non couvertes), le sourcing et les intitulés marché des métiers retenus.

## Points d'attention sur les référentiels

- Sourcing et corpus de fiches ne reposent pas sur le même échantillon d'employeurs : ils sont
  restitués séparément, sans fusion.
- 3 synonymes ambigus (« data transformation », « monitoring », « spark sql »).
- 73 compétences sur 140 n'apparaissent dans aucune signature métier (résiduel `hors-signatures`).
- Certains intitulés de métier portent une séniorité (Senior, Lead / Principal) alors que le grade est
  orthogonal : les données sont conservées telles quelles.
- Le rattachement des 7 compétences transverses aux axes du grade (`config.json`) est une proposition
  à valider : Avant-vente et Business development → développement commercial, Pilotage de programme
  → gestion de projet, Relation client → relation client, Leadership technique → leadership,
  Management d'équipe et Mentorat / coaching → management.
