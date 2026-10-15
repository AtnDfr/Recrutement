# Qualification des besoins de recrutement — BU Data & IA

Prototype : un responsable Subject Matter sélectionne des compétences et un grade. Le moteur
retient le plus petit ensemble cohérent de métiers qui les couvre et prépare la fiche recruteur
(couverture par métier, résiduels, attentes transverses du grade, viviers, entreprises, intitulés marché).

**État : données, normalisation, moteur et tests. Aucune interface pour le moment.** Spécification : [`CLAUDE.md`](CLAUDE.md).

> Le dossier [`campagne-cooptation/`](campagne-cooptation/README.md) contient une application distincte : la web part SharePoint de campagne de cooptation Teams.

## Commandes

```bash
npm install
npm test             # Vitest
npm run typecheck    # TypeScript strict
npm run build:data   # régénère src/data/generated/*.json depuis data/raw/*.xlsx
npm run check:data   # échoue si les JSON commités ne correspondent plus aux classeurs
npm run valider      # joue validation/cas.json et écrit validation/rapport.md
npm run valider -- --grade manager --selection "Databricks; Leadership technique" --texte "phrase libre"
```

## Harnais de validation métier (`scripts/valider.ts`)

Sans interface : on injecte des compétences sélectionnées, une phrase libre, des formulations libres
et un grade, et le harnais affiche pour chaque cas les compétences analysées (avec leur provenance),
les ambiguïtés, les métiers proposés et ce qui les justifie, les transverses et le grade, les
résiduels expliqués et le sourcing. Les cas sont dans `validation/cas.json` ; le rapport
`validation/rapport.md` se termine, pour chaque cas, par la question de validation recruteur.

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

Priorité des sources transmises au moteur :
**sélection explicite SM > nom canonique (ou identifiant) > synonyme sûr (ou forme composée) > détection
automatique sûre**. Les formulations ambiguës, à confirmer ou non reconnues ne sont jamais transmises.

- Formes utilisées : identifiant (`C102`), nom canonique, synonymes (`1_Competences` et `2_Synonymes`).
  Aucune compétence n'est jamais créée ; la formulation d'origine est toujours conservée.
- Saisie découpée sur `,`, `;` et les retours à la ligne ; jamais sur `/`, `+`, `&` ou « et ».
- Correspondance exacte après mise en forme typographique (casse, accents, ligatures, apostrophes,
  tirets, espaces). Pas de correspondance approchée, de racinisation ni de correspondance partielle.
- Statuts d'une formulation saisie : `reconnu` ; `compose` (forme de `config.formesComposees`, ex.
  « Spark SQL » → Spark + SQL) ; `ambigu` ; `a-confirmer` (forme de `config.formesAConfirmer`) ;
  `non-reconnu`. Nom canonique > synonyme : « Monitoring » saisi → C059, le concurrent est tracé.
- Texte libre et vocal (`detecterDansTexte`) : mots entiers, la plus longue forme d'abord. Une détection
  est **sûre**, donc injectée automatiquement, si elle n'est ni ambiguë ni à confirmer et, pour une forme
  de 4 caractères ou moins, si sa casse est celle du référentiel (« SQL » oui, « sql » ou « Tom » non).
  En texte libre, le nom canonique ne départage pas : « monitoring » y reste ambigu.

## Points d'attention sur les référentiels

- Sourcing et corpus de fiches ne reposent pas sur le même échantillon d'employeurs : ils sont
  restitués séparément, sans fusion.
- 3 synonymes ambigus (« data transformation », « monitoring », « spark sql »).
- 73 compétences sur 140 n'apparaissent dans aucune signature métier (résiduel `hors-signatures`).
- Certains intitulés de métier portent une séniorité (Senior, Lead / Principal) alors que le grade est
  orthogonal : les données sont conservées telles quelles.
- « Monitoring » est à la fois le nom canonique de C059 et un synonyme d'Observabilité (C060).
- Certains synonymes peuvent changer le sens (« CV », « TypeScript », « risk », « valeur », « ROI »,
  « production », « run », « lake », « logs ») : listés dans `config.formesAConfirmer`.
