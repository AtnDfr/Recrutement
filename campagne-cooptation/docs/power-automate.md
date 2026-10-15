# Adaptation du flow Power Automate

Le flow existant sait déjà : boucler sur des emails → créer un chat Teams → poster le message.
**Seul son déclencheur change.** L'application ne crée aucun chat et n'envoie aucun message.

## Pourquoi un déclencheur « élément créé » plutôt qu'un déclencheur HTTP

- Aucune URL secrète de flow dans le code du navigateur.
- Pas de problème CORS ni d'authentification à monter : l'application écrit dans SharePoint avec les droits de l'utilisateur.
- Les permissions de la liste contrôlent qui peut envoyer, et la liste trace chaque campagne.

## Étapes du flow

1. **Déclencheur** – SharePoint « Lorsqu'un élément est créé ».
   Site : `WOFHR-RECRUITMENTACTIVITIES`. Liste : `Campagnes cooptation`.
   *Paramètres → Conditions de déclenchement* (facultatif, mais recommandé) :
   ```
   @equals(triggerOutputs()?['body/Statut/Value'], 'À envoyer')
   ```
   Pour restreindre en plus les auteurs autorisés :
   ```
   @contains(createArray('personne1@wavestone.com','personne2@wavestone.com'), toLower(triggerOutputs()?['body/Author/Email']))
   ```

2. **Analyser JSON** (Parse JSON). Contenu : `triggerOutputs()?['body/Payload']`. Schéma :
   ```json
   {
     "type": "object",
     "properties": {
       "destinataires": { "type": "array", "items": { "type": "string" } },
       "message": { "type": "string" }
     },
     "required": ["destinataires", "message"]
   }
   ```

3. **Contrôle de cohérence** (Condition) :
   `length(body('Analyser_JSON')?['destinataires'])` est égal à `triggerOutputs()?['body/NombreDestinataires']`.
   Si ce n'est pas le cas, mettre Statut à `Erreur` et arrêter (action *Terminer*).

4. **Mettre à jour l'élément** : Statut = `En cours`.

5. **Appliquer à chacun** sur `body('Analyser_JSON')?['destinataires']`. On réutilise ici les actions existantes :
   - Teams « Créer une conversation », Membres : `items('Appliquer_à_chacun')`.
   - Teams « Publier un message dans une conversation ou un canal ».
     Publier dans : *Conversation de groupe*. Conversation : l'id renvoyé par l'action précédente.
     Message : `body('Analyser_JSON')?['message']`. Ce message est du **HTML** (`<p>`, `<strong>`, `<em>`, `<ul>`, `<a>`), que Teams affiche tel quel.
   - *Paramètres de la boucle → Contrôle d'accès concurrentiel* : degré 1 à 5, pour rester sous les limites du connecteur Teams.
   - En option, collecter les échecs : une action *Ajouter à une variable tableau* configurée en « Configurer l'exécution après → a échoué ».

6. **Mettre à jour l'élément** : Statut = `Envoyé` (ou `Envoyé avec erreurs`, et colonne `Erreurs`).

## Points à décider

- **Expéditeur des messages** : un chat 1:1 est créé entre le **compte de connexion du flow** et chaque
  destinataire. Les messages partent donc au nom de ce compte, quelle que soit la personne qui a lancé la campagne.
  À valider : compte nominatif (ex. responsable de la BU) ou compte de service.
- **Volumétrie** : quelques centaines de destinataires par campagne restent dans les limites habituelles du
  connecteur Teams, avec une concurrence faible. Au-delà, prévoir un délai dans la boucle.
