# Flow Power Automate : publication de la carte Teams

> **État** : à mettre en place lors de l'intégration. La démo actuelle n'appelle aucun flow.

## Principe : ce que vous voyez est ce qui est envoyé

Il n'y a qu'**un seul modèle de carte** : [`modeles/carte-cooptation.json`](../modeles/carte-cooptation.json).

- **L'application** lit ce modèle à l'exécution et y injecte le titre, le message et le bouton.
- Elle **affiche** la carte obtenue dans l'aperçu Teams.
- Elle **transmet cette même carte** au flow, dans `carte`.
- **Le flow publie `carte` telle quelle.** Il n'injecte rien et ne reconstruit rien.

Changer la présentation de la carte (bouton en dessous, nouveau titre, logo…) revient à modifier ce fichier JSON et à le redéposer dans la bibliothèque SharePoint (`urlModeleCarte` dans la configuration). Il n'y a **ni redéploiement SPFx ni modification du flow**.

### Pourquoi l'injection ne se fait pas dans Power Automate

Faire injecter les variables par le flow imposait de **dupliquer le modèle** : un exemplaire dans le flow, un autre dans l'application pour l'aperçu. Les deux finissent tôt ou tard par diverger. De plus, Power Automate gère mal ce travail :

- remplacer du texte dans un JSON exige d'échapper soi-même guillemets et retours à la ligne, d'où des cartes cassées dès qu'un message en contient ;
- `$when` (afficher le bouton seulement s'il est renseigné) n'existe pas dans Power Automate : il faudrait une condition et deux variantes du modèle.

En produisant la carte une seule fois, côté application, à partir d'un modèle unique chargé à l'exécution, on garantit que l'aperçu est la carte envoyée.

## Format du modèle

Le modèle est une Adaptive Card 1.5, qui reste testable dans le [Designer](https://adaptivecards.microsoft.com/designer) avec des données d'exemple. Elle utilise un **sous-ensemble strict** du langage de templating :

| Syntaxe | Effet |
|---|---|
| `"${titre}"`, `"${message}"`, `"${ctaLibelle}"`, `"${ctaUrl}"`, `"${imageUrl}"` | remplacées par le contenu saisi |
| `"$when": "${ctaUrl}"` ou `"$when": "${imageUrl}"` sur un élément | l'élément n'est gardé que si la variable est renseignée |
| `"x-modele": "carte-cooptation@1"` | nom et version du modèle, retirés de la carte et tracés dans le payload |

Toute autre variable, ou toute autre forme de `$when`, est refusée et bloque l'envoi avec un message clair. La version doit être 1.5 au plus, pour Teams. Après chaque modification, **incrémenter la version** dans `x-modele`.

## Payload reçu

Il est écrit dans la colonne `Payload` de la liste « Campagnes cooptation » :

```json
{
  "destinataires": ["prenom.nom@wavestone.com"],
  "titre": "On recrute en Data & IA",
  "message": "Bonjour,\n\nNous cherchons des **data engineers**.\n\n- Prime de cooptation",
  "ctaLibelle": "Je coopte",
  "ctaUrl": "https://forms.office.com/r/…",
  "imageUrl": "https://…/banniere-cooptation.png",
  "modele": "carte-cooptation@2",
  "carte": { "type": "AdaptiveCard", "version": "1.5", "body": [ … ], "actions": [ … ] }
}
```

`titre`, `message`, `ctaLibelle`, `ctaUrl`, `imageUrl` et `modele` servent à la traçabilité. Seuls `destinataires` et `carte` sont utilisés pour l'envoi.

## Étapes du flow

1. **Déclencheur** : SharePoint « Lorsqu'un élément est créé », liste `Campagnes cooptation`.
   Condition de déclenchement recommandée :
   `@equals(triggerOutputs()?['body/Statut/Value'], 'À envoyer')`
   Pour restreindre en plus les auteurs autorisés :
   `@contains(createArray('personne1@wavestone.com','personne2@wavestone.com'), toLower(triggerOutputs()?['body/Author/Email']))`
2. **Analyser JSON** sur `triggerOutputs()?['body/Payload']`, avec ce schéma :
   ```json
   {
     "type": "object",
     "properties": {
       "destinataires": { "type": "array", "items": { "type": "string" } },
       "carte": { "type": "object" }
     },
     "required": ["destinataires", "carte"]
   }
   ```
3. **Contrôle** : `length(body('Analyser_JSON')?['destinataires'])` doit être égal à `NombreDestinataires`. Sinon, Statut = `Erreur` et l'on s'arrête.
4. **Mettre à jour l'élément** : Statut = `En cours`.
5. **Appliquer à chacun** sur `destinataires`, avec un contrôle d'accès concurrentiel de 1 à 5. Une seule action Teams, **« Publier une carte dans une conversation ou un canal »**, dont le champ « Carte adaptative » reçoit `string(body('Analyser_JSON')?['carte'])`. Deux variantes selon l'expéditeur, à décider :
   - **Bot Flow** : Publier en tant que *Flow bot*, Publier dans *Conversation avec le bot Flow*, Destinataire `items('Appliquer_à_chacun')`. Pas besoin de créer de conversation. Expéditeur affiché : « Workflows ».
   - **Utilisateur** : on garde « Créer une conversation » (membre `items('Appliquer_à_chacun')`), puis Publier en tant que *Utilisateur* dans *Conversation de groupe*, avec l'id de la conversation. Expéditeur : le compte de connexion du flow.
6. **Mettre à jour l'élément** : Statut = `Envoyé`, ou `Envoyé avec erreurs` et la colonne `Erreurs`.

## Images et GIF dans la carte

- Teams ne reçoit que l'**adresse** de l'image : chaque destinataire la télécharge lui-même.
  L'adresse doit donc être en https et lisible **sans connexion** par tous les destinataires.
  Une image stockée dans une bibliothèque SharePoint protégée s'affiche cassée.
- Une carte Teams est limitée à environ 28 Ko : on ne peut pas y embarquer l'image elle-même.
- PNG, JPG et GIF animés sont acceptés. Le format bannière (environ 3:1) est conseillé.
- L'application vérifie que l'image se charge chez l'expéditeur avant d'autoriser l'envoi.
- À l'intégration, vérifier l'affichage réel sur Teams bureau, web et mobile, notamment pour les GIF animés.
- La galerie de visuels approuvés se règle dans `galerieImages` de la configuration.
