# Projet

Application interne de qualification des besoins de recrutement pour la BU Data & IA.

# Principe produit

Le système est centré sur les compétences.

Un responsable Subject Matter sélectionne des compétences et un grade.

Une demande peut produire 1 à N métiers.

Le système cherche le plus petit ensemble cohérent de métiers permettant de couvrir les compétences demandées.

# Règle fondamentale de couverture

Lorsqu'une compétence est couverte par un métier retenu :

- elle sort du besoin résiduel ;
- elle ne doit plus justifier à elle seule l'ajout d'un second métier ;
- elle reste cependant disponible dans les signatures des autres métiers ;
- elle peut donc apparaître dans plusieurs métiers retenus.

Chaque métier supplémentaire doit apporter une nouvelle couverture significative.

# Grade

Le grade est orthogonal au métier.

Grades :

- Analyste
- Consultant
- Consultant Senior
- Manager
- Senior Manager

Le grade détermine uniquement les attentes transverses :

- gestion de projet
- leadership
- management
- relation client
- développement commercial

Il ne doit jamais créer un métier supplémentaire.

# Interfaces

Deux interfaces :

1. Subject Matter
2. Recruteur

## SM

Le SM doit passer le minimum de temps possible.

Il peut :

- sélectionner des compétences ;
- ajouter facultativement du texte ;
- ajouter facultativement du vocal ;
- sélectionner le grade ;
- envoyer.

Aucune validation ultérieure obligatoire.

## Recruteur

Le recruteur reçoit :

- demandeur ;
- date ;
- grade ;
- besoin original ;
- compétences ;
- métiers générés ;
- couverture par métier ;
- compétences résiduelles ;
- attentes transverses ;
- viviers ;
- entreprises ;
- intitulés marché.

# Architecture

React TypeScript Vite

La logique métier doit être totalement indépendante des composants UI.

src/data/ src/engine/ src/types/ src/components/ src/pages/ src/tests/

# Principes de développement

- TypeScript strict.
- Pas de logique métier dans les composants React.
- Fonctions du moteur pures autant que possible.
- Pas de données métier hardcodées dans les composants.
- Référentiels chargés depuis les fichiers de données.
- Toute règle métier importante doit être testée.
- Ne pas inventer de données manquantes.
- Préférer une solution simple et lisible.
