# Liste SharePoint « Campagnes cooptation »

Cette liste fait le lien entre l'application et le flow Power Automate.
L'application y crée **un élément par campagne confirmée**. Le flow démarre à la création de l'élément.
La liste sert aussi d'historique : qui, quand, combien de destinataires, quels critères, quel statut d'envoi.

## Création (propriétaire du site)

Site : `https://digiplace.sharepoint.com/sites/WOFHR-RECRUITMENTACTIVITIES`

Créer une liste vide nommée **Campagnes cooptation**, puis ajouter les colonnes ci-dessous.

> Créer chaque colonne d'abord avec le **nom exact** indiqué (sans espace ni accent). Ce nom devient
> le nom interne, celui qu'utilise l'application. On peut ensuite renommer le libellé affiché à volonté.

| Nom (interne) | Type SharePoint | Contenu |
|---|---|---|
| `Title` | (colonne Titre existante) | « Campagne de cooptation — N destinataire(s) » |
| `Payload` | Plusieurs lignes de texte, **texte brut** (pas de texte enrichi) | JSON `{ destinataires, titre, message, ctaLibelle, ctaUrl, modele, carte }` (voir `power-automate.md`) |
| `NombreDestinataires` | Nombre | Nombre exact de destinataires confirmé par l'utilisateur |
| `Criteres` | Plusieurs lignes de texte, texte brut | Critères utilisés (grades, critères complémentaires, retraits) |
| `Statut` | Choix : `À envoyer`, `En cours`, `Envoyé`, `Envoyé avec erreurs`, `Erreur` | Créé à `À envoyer`, mis à jour par le flow |
| `Erreurs` *(facultatif)* | Plusieurs lignes de texte, texte brut | Destinataires en échec, renseigné par le flow |

Les colonnes système *Créé par* et *Créé* donnent le demandeur et la date.

Si les noms internes diffèrent, les reporter dans `listeCampagnes.champs` de
`src/webparts/campagneCooptation/config/campagne.config.ts`.

## Permissions : c'est le vrai contrôle d'accès à l'envoi

Toute personne qui peut **ajouter un élément** à cette liste peut déclencher un envoi : par l'application,
mais aussi directement depuis la liste. Il faut donc :

1. arrêter l'héritage des permissions de la liste ;
2. donner **Collaboration** (ajout) uniquement aux personnes autorisées à lancer une campagne ;
3. donner **Modification** au compte de connexion du flow, pour la mise à jour du statut ;
4. ne donner aucun accès aux autres membres du site.

En complément, on peut ajouter dans le flow une condition de déclenchement qui restreint l'auteur à une liste
d'emails autorisés (voir `power-automate.md`).

## Bibliothèque du modèle de carte

Le modèle unique `modeles/carte-cooptation.json` est déposé dans une bibliothèque du site, par exemple « Modeles cooptation ».
Il doit être lisible par les utilisateurs de l'application, et modifiable uniquement par les personnes chargées de la présentation de la carte.
Son adresse est `urlModeleCarte` dans la configuration.
