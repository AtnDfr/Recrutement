# Campagne de cooptation — BU Data & IA

Web part SharePoint (SPFx 1.23, React, Fluent UI) pour préparer une campagne de messages Teams individuels
vers les collaborateurs de la BU : cibler, rédiger, vérifier, confirmer.
**L'application n'envoie aucun message Teams.** Elle transmet la campagne au flow Power Automate existant.

## Architecture

```
Page SharePoint du site WOFHR-RECRUITMENTACTIVITIES
└─ Web part « Campagne de cooptation »  (SSO, droits de l'utilisateur connecté)
     ├─ lit     « IA - Suivi des acteurs - Acteurs »   (REST SharePoint, Acteurs/Title + Acteurs/EMail + Grade…)
     └─ crée    1 élément dans « Campagnes cooptation »  { destinataires[], message } + critères + nombre
                       │ déclencheur « Lorsqu'un élément est créé »
                 Flow Power Automate : Pour chaque destinataire → Créer une conversation → Publier le message
                       └─ met à jour le Statut de l'élément
```

Pourquoi ces choix :

- **SPFx** : l'authentification est transparente, il n'y a pas d'inscription d'application Entra ID ni de serveur, et l'interface s'intègre à SharePoint.
- **Power Automate reste responsable de l'envoi** : l'application n'a besoin d'aucune permission Graph `Chat.*`, qui demanderait un consentement admin.
- **Liste intermédiaire plutôt qu'un déclencheur HTTP** : pas d'URL secrète dans le navigateur, pas de CORS, un historique de chaque campagne, et un contrôle d'accès par les permissions de la liste.

## Parcours et garde-fous

1. **Cibler** : grades (sélection multiple), critères complémentaires, liste consultable avec recherche, retrait ou réintégration manuelle.
2. **Rédiger** : grande zone de texte, mise en forme légère (gras, italique, listes, liens) et aperçu en direct.
3. **Vérifier & envoyer** : nombre de destinataires, liste complète, critères utilisés, aperçu du message, puis confirmation explicite.

Garde-fous (règles pures dans `core/etat.ts` et `core/campagne.ts`, couvertes par les tests) :

- rien n'est envoyé au chargement ni au changement de filtre ;
- l'envoi n'est possible qu'à l'étape « Vérifier », après la confirmation « Vous êtes sur le point d'envoyer ce message individuellement à XX collaborateurs. » ;
- les boutons sont désactivés si la liste compte 0 destinataire ou si le message est vide ;
- toute modification referme la confirmation, pour que le nombre affiché reste exact ;
- pendant et après l'envoi, la campagne est verrouillée, ce qui empêche un double envoi ;
- les personnes sans email sont signalées et exclues, et les doublons d'email sont ignorés ;
- aucun grade coché signifie aucun destinataire, jamais « tout le monde ».

Pour l'email, l'application utilise `Acteurs.EMail` (nom REST du champ « Acteurs.Email » dans Power Automate), sans jamais le reconstruire.
Le ciblage par grade utilise la colonne `Grade`, jamais `JobTitle`.

## Compléter la configuration

Tout ce qui n'est pas encore connu est isolé dans
[`src/webparts/campagneCooptation/config/campagne.config.ts`](src/webparts/campagneCooptation/config/campagne.config.ts),
marqué **À CONFIRMER**.

1. **Noms internes des colonnes de la liste Acteurs** : ouvrir dans le navigateur, connecté au tenant :
   ```
   https://digiplace.sharepoint.com/sites/WOFHR-RECRUITMENTACTIVITIES/_api/web/lists/getbytitle('IA - Suivi des acteurs - Acteurs')/fields?$select=Title,InternalName,TypeAsString&$filter=Hidden eq false
   ```
   Reporter `InternalName` pour Acteurs, Grade, CDM, statut et Type Entretien. Le titre exact de la liste et le type de `CDM` sont à vérifier aussi : si `TypeAsString` vaut `User`, mettre `type: 'personne'`.
2. **Critères complémentaires** (Maker, Non-maker, CDM, Acteur du recrutement) : ils restent affichés comme « règle à préciser » et inactifs tant que `regle` vaut `null`. Une fois la règle validée, il suffit de la décrire, sans toucher au code. Exemple :
   `{ colonne: 'typeEntretien', operateur: 'contient', valeurs: ['(maker)'] }`.
   Opérateurs disponibles : `egal`, `contient`, `nonVide`. La colonne doit être déclarée dans `colonnes`.
3. **Grades** : seules les valeurs listées sont ciblables. Les autres valeurs trouvées dans la liste (ex. « CS - Consulting ») sont signalées dans l'interface.

## Prérequis de déploiement

| Qui | Quoi |
|---|---|
| Admin SharePoint | Déposer `sharepoint/solution/campagne-cooptation.sppkg` dans l'App Catalog (tenant, ou catalogue du site) et l'approuver. |
| Propriétaire du site | Créer la liste « Campagnes cooptation » et ses permissions ([docs/liste-campagnes.md](docs/liste-campagnes.md)), puis ajouter la web part sur une page. |
| Propriétaire de la liste Acteurs (Céline) | Donner la **lecture** sur la liste aux utilisateurs de l'application. |
| Propriétaire du flow | Remplacer le déclencheur du flow existant ([docs/power-automate.md](docs/power-automate.md)) et choisir le compte expéditeur. |

## Développement

Node 22 (≥ 22.14), imposé par SPFx 1.23.

```bash
npm install
npm test          # tests Jest du cœur métier (heft test)
npm run build     # lint + tests + bundle de production + sharepoint/solution/campagne-cooptation.sppkg
npm start         # serveur local, à ouvrir dans le workbench hébergé du site (config/serve.json)
```

Premier essai réel conseillé : dans le workbench du site, cibler un grade, retirer tout le monde sauf soi-même,
puis envoyer.

## Arborescence

```
src/webparts/campagneCooptation/
  CampagneCooptationWebPart.ts   point d'entrée SPFx : branche les services sur l'interface
  config/campagne.config.ts      ★ configuration à compléter (listes, colonnes, grades, règles)
  core/                          logique métier pure, sans React ni SPFx
    mapping.ts                   élément SharePoint → Collaborateur, requête REST
    filtres.ts                   grades (OU) ∧ critères complémentaires (ET)
    destinataires.ts             sans email, doublons, retraits manuels, recherche
    message.ts                   mise en forme → HTML Teams (saisie échappée)
    campagne.ts                  payload {destinataires, message}, dernier garde-fou avant envoi
    etat.ts                      parcours Cibler → Rédiger → Vérifier → Confirmer
  services/                      accès SharePoint (lecture paginée, création de l'élément)
  components/                    interface React (Fluent UI), sans règle métier
  tests/                         tests Jest du cœur métier
docs/                            liste Campagnes, adaptation du flow
```

## Données

Aucune donnée de collaborateur n'est stockée dans le dépôt : tout est lu en direct dans SharePoint.
Les tests utilisent des personnes anonymes (« Personne 1 », `un@x.com`). Les exports CSV sont exclus par `.gitignore`.
