# Campagne de cooptation — BU Data & IA

Web part SharePoint (SPFx 1.23, React, Fluent UI) pour préparer une campagne de cartes Teams individuelles
destinées aux collaborateurs de la BU : cibler, rédiger, vérifier, confirmer.
**L'application n'envoie aucun message Teams.** Elle transmet la campagne à un flow Power Automate.

> **Phase actuelle : démo navigable.** L'expérience se valide dans [`demo/`](#démo-navigable), sur des données
> fictives et un faux flow. SharePoint, la liste Campagnes, Power Automate et Teams ne sont pas encore branchés.

## Architecture

```
Page SharePoint du site WOFHR-RECRUITMENTACTIVITIES
└─ Web part « Campagne de cooptation »  (SSO, droits de l'utilisateur connecté)
     ├─ lit     « IA - Suivi des acteurs - Acteurs »   (Acteurs, Grade, CDM, statut, Type Entretien)
     ├─ lit     modeles/carte-cooptation.json          (modèle UNIQUE de carte, déposé dans une bibliothèque)
     │          → applique le modèle au contenu saisi → aperçu = carte envoyée
     └─ crée    1 élément dans « Campagnes cooptation »  { destinataires, contenu, modele, carte }
                       │ déclencheur « Lorsqu'un élément est créé »
                 Flow Power Automate : pour chaque destinataire → publier `carte` telle quelle
```

- **SPFx** : authentification transparente, ni inscription Entra ID ni serveur.
- **Power Automate reste responsable de l'envoi** : aucune permission Graph `Chat.*` côté application.
- **Liste intermédiaire** plutôt qu'un déclencheur HTTP : pas d'URL secrète, pas de CORS, un historique de chaque campagne, et un accès contrôlé par les permissions de la liste.
- **Un seul modèle de carte**, chargé à l'exécution :
  - ce qui s'affiche dans l'aperçu est ce qui est envoyé ;
  - changer la carte ne demande ni redéploiement ni modification du flow ;
  - pourquoi l'injection ne se fait pas dans Power Automate : voir [docs/power-automate.md](docs/power-automate.md).

## Parcours

**Une page d'édition**, avec un récapitulatif toujours visible, puis une **vérification obligatoire**, puis une **confirmation explicite**.

- **Destinataires**
  - grades en pastilles, avec leur effectif ;
  - « Affiner » : Profil Maker / Non-maker, Acteur recrutement actif, Est CDM, Collaborateurs de… ;
  - résultat sous forme d'avatars, avec « Gérer la liste » qui ouvre un panneau : recherche, retrait, réintégration, personnes sans email, doublons.
- **Message**
  - un titre ;
  - un éditeur léger : gras, italique, listes, liens https et emojis ; le collage se fait toujours en texte brut ;
  - un sélecteur d'emojis, aussi disponible dans le titre (liste dans `config.emojis`) ;
  - une image ou un GIF facultatif en bannière : galerie de visuels approuvés (`config.galerieImages`) ou adresse https, avec vérification que l'image s'affiche ;
  - un bouton facultatif (libellé + lien) ;
  - l'aperçu de la carte exacte dans un faux fil Teams.
- **Récapitulatif**
  - nombre de destinataires, critères et liste de contrôle ;
  - le bouton « Vérifier et envoyer » reste inactif tant qu'il manque quelque chose ;
  - sur téléphone, il devient une barre fixe en bas d'écran.
- **Vérification** : synthèse, critères, liste complète et carte envoyée, puis « Envoyer à N collaborateurs… ». La confirmation affiche : « Vous êtes sur le point d'envoyer ce message individuellement à N collaborateurs. »

## Règles de ciblage

| Filtre | Règle | Où |
|---|---|---|
| Grades | colonne `Grade` (jamais `JobTitle`), OU entre les grades. **Aucun grade = personne.** | config `grades` |
| Maker | Type Entretien **contient** `(maker)` | config, provisoire |
| Non-maker | Type Entretien **contient** `(non maker)`. Ce n'est **pas** « tout sauf Maker » : sans Type Entretien, une personne n'est ni l'un ni l'autre. | config, provisoire |
| Maker + Non-maker cochés | OU (même groupe `profil`) : « profil connu » | config `groupe` |
| Acteur recrutement actif | statut **égal à** `Actif` (Back-up, Stand-by… exclus) | config |
| Est CDM | l'email du collaborateur figure dans la colonne CDM d'au moins une ligne | `core/filtres.ts` |
| Collaborateurs de… | le CDM du collaborateur, par son email, fait partie des CDM choisis | `core/filtres.ts` |

Les filtres de natures différentes se combinent en **ET**. L'email utilisé est `Acteurs.EMail`, fourni par SharePoint, et n'est jamais reconstruit.
Les personnes sans email sont signalées et exclues, et un même email ne reçoit qu'un message.

## Garde-fous

Ce sont des règles pures (`core/etat.ts`, `core/campagne.ts`), couvertes par les tests :

- **Aucun envoi automatique** : rien ne part au chargement ni au changement de filtre.
- **Envoi seulement depuis la vérification**, après la confirmation explicite.
- **Toute modification renvoie à l'édition** : la vérification doit être refaite.
- **Campagne incomplète** : vérification impossible sans destinataire, titre ou message, si le bouton est incomplet (libellé et lien `https://` exigés), ou si l'image ne se charge pas.
- **Modèle invalide** : un modèle de carte invalide bloque l'envoi, avec un message explicite.
- **Pas de double envoi** : la campagne est verrouillée pendant et après l'envoi.

## Compléter la configuration (à l'intégration)

Tout ce qui reste inconnu est isolé dans
[`src/webparts/campagneCooptation/config/campagne.config.ts`](src/webparts/campagneCooptation/config/campagne.config.ts),
marqué **À CONFIRMER**.

1. **Noms internes des colonnes** de la liste Acteurs. Connecté au tenant, ouvrir :
   ```
   https://digiplace.sharepoint.com/sites/WOFHR-RECRUITMENTACTIVITIES/_api/web/lists/getbytitle('IA - Suivi des acteurs - Acteurs')/fields?$select=Title,InternalName,TypeAsString&$filter=Hidden eq false
   ```
2. **Adresse du modèle de carte** (`urlModeleCarte`) : la bibliothèque qui accueille `modeles/carte-cooptation.json`.
3. **Galerie d'images** (`galerieImages`) : visuels approuvés, hébergés à une adresse https lisible par tous les destinataires (voir [docs/power-automate.md](docs/power-automate.md#images-et-gif-dans-la-carte)).
4. **Grades** : seules les valeurs listées sont ciblables (ex. « CS - Consulting » ne l'est pas).

## Développement

Node 22 (≥ 22.14), imposé par SPFx 1.23.

```bash
npm install
npm test             # tests Jest du cœur métier (heft test)
npm run build        # lint + tests + bundle de production + sharepoint/solution/campagne-cooptation.sppkg
npm run demo:serve   # démo navigable sur http://localhost:8080
npm run demo         # construit demo/dist (index.html + app.js + carte-cooptation.json)
```

### Démo navigable

`demo/` affiche **la même interface** (mêmes composants, même logique) sur des données fictives.
Un faux flow y montre le JSON qu'il recevrait, et on peut simuler les erreurs (SharePoint, flow, liste vide).
**Aucun bouton de la démo ne peut envoyer de message** : elle n'appelle ni SharePoint, ni Power Automate, ni Teams.
Elle lit seulement le modèle de carte, publié à côté de la page.

### Poids

| Élément | Gzip |
|---|---|
| Web part SPFx (production) | 161 Ko |
| Démo complète (React + Fluent inclus) | 216 Ko |
| dont `adaptivecards` (moteur officiel de l'aperçu) | 44 Ko |

L'éditeur riche TipTap a été écarté : 105 Ko gzip pour seulement gras, italique, listes et liens. Il est remplacé par un petit éditeur `contentEditable`, dont la conversion vers markdown est testée (`core/editeur.ts`).

## Arborescence

```
modeles/carte-cooptation.json    ★ modèle UNIQUE de carte Teams (versionné, x-modele)
src/webparts/campagneCooptation/
  CampagneCooptationWebPart.ts   point d'entrée SPFx : branche les services sur l'interface
  config/campagne.config.ts      ★ configuration (listes, colonnes, grades, règles)
  core/                          logique métier pure, sans React ni SPFx
    mapping.ts                   élément SharePoint → Collaborateur (avec emails des colonnes Person)
    filtres.ts                   grades, critères groupés, Est CDM, Collaborateurs de…
    destinataires.ts             sans email, doublons, retraits manuels, recherche
    contenu.ts                   contrôles du contenu (titre, message, bouton)
    editeur.ts                   éditeur → markdown Teams
    modeleCarte.ts               application du modèle de carte (sous-ensemble du templating officiel)
    message.ts                   markdown → HTML pour l'aperçu (saisie échappée)
    campagne.ts                  payload, description des critères, dernier garde-fou avant envoi
    etat.ts                      parcours édition → vérification → confirmation
  services/                      accès SharePoint (liste Acteurs, modèle de carte, liste Campagnes)
  components/                    interface React (Fluent UI), sans règle métier
  tests/                         tests Jest du cœur métier
demo/                            démo navigable : données fictives, faux flow, visuels fictifs (demo/images)
docs/                            liste Campagnes, flow Power Automate
```

## Données

Aucune donnée de collaborateur n'est stockée dans le dépôt : tout est lu en direct dans SharePoint.
Les tests et la démo utilisent des personnes fictives. Les exports CSV sont exclus par `.gitignore`.
