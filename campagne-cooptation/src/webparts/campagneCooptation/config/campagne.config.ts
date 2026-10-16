import { ConfigCampagne } from './types';

/**
 * ★ Configuration de l'application.
 *
 * Les noms internes des colonnes de la liste Acteurs sont confirmés. Il reste « À CONFIRMER »
 * les éléments propres à l'intégration (bibliothèque du modèle de carte, liste Campagnes).
 */
export const configCampagne: ConfigCampagne = {
  siteUrl: 'https://digiplace.sharepoint.com/sites/WOFHR-RECRUITMENTACTIVITIES',

  // Noms internes confirmés depuis les paramètres de la liste (Field=… dans l'adresse).
  listeActeurs: {
    titre: 'IA - Suivi des acteurs - Acteurs',
    // Identifiant de la liste (paramètres de la liste) : il ne change pas si la liste est renommée.
    id: 'B77A91C1-6462-4F94-BFB6-FEDBBE6A9F74',
    colonnePersonne: 'Acteurs',
    colonneGrade: 'Grade'
  },

  colonnes: [
    // Colonne Person.
    { cle: 'cdm', libelle: 'CDM', nomInterne: 'CDM', type: 'personne', afficher: true },
    // Colonne Choix.
    { cle: 'statut', libelle: 'Statut', nomInterne: 'statut', type: 'texte', afficher: true },
    // Colonne Choix (nom interne sans espace).
    { cle: 'typeEntretien', libelle: 'Type entretien', nomInterne: 'TypeEntretien', type: 'texte', afficher: true }
  ],

  // Valeurs présentes dans la colonne Grade. D'autres valeurs existent dans la liste
  // (« CS - Consulting », « Account Developer »…) : elles ne sont pas ciblables tant qu'on ne les ajoute pas ici.
  grades: [
    'Consulting Apprentice',
    'Analyst',
    'Consultant',
    'Senior Consultant',
    'Manager',
    'Senior Manager',
    'Associate Partner',
    'Partner'
  ],

  // Règles validées par la BU (provisoires pour Maker / Non-maker : signal tiré de Type Entretien).
  // Non-maker n'est PAS « tout sauf Maker » : sans Type Entretien, une personne n'est ni l'un ni l'autre.
  criteresComplementaires: [
    { id: 'maker', libelle: 'Maker', groupe: 'profil', regle: { colonne: 'typeEntretien', operateur: 'contient', valeurs: ['(maker)'] } },
    { id: 'nonMaker', libelle: 'Non-maker', groupe: 'profil', regle: { colonne: 'typeEntretien', operateur: 'contient', valeurs: ['(non maker)'] } },
    // Statut « Actif » uniquement : Back-up, Stand-by, En formation… ne sont pas inclus.
    { id: 'acteurRecrutementActif', libelle: 'Acteur recrutement actif', regle: { colonne: 'statut', operateur: 'egal', valeurs: ['Actif'] } }
  ],

  // Colonne Person « CDM » : filtres « Est CDM » et « Collaborateurs de… » (rapprochement par email).
  colonneCdm: 'cdm',

  // Liste à créer (voir docs/liste-campagnes.md). Noms internes à confirmer après création.
  listeCampagnes: {
    titre: 'Campagnes cooptation',
    champs: {
      titre: 'Title',
      payload: 'Payload',
      nombreDestinataires: 'NombreDestinataires',
      criteres: 'Criteres',
      statut: 'Statut'
    },
    statutInitial: 'À envoyer'
  },

  // À CONFIRMER à l'intégration : bibliothèque qui héberge modeles/carte-cooptation.json.
  urlModeleCarte: 'https://digiplace.sharepoint.com/sites/WOFHR-RECRUITMENTACTIVITIES/Modeles%20cooptation/carte-cooptation.json',

  // Une colonne « Plusieurs lignes de texte » (texte brut) accepte 63 999 caractères via l'interface.
  tailleMaxPayload: 60000,

  emojis: [
    '🚀', '🤝', '🎯', '💡', '🎉', '👋', '🙌', '👏', '✅', '📣', '🔥', '⭐',
    '💼', '🧠', '📊', '🤖', '💬', '📅', '👉', '🔎', '🏆', '🌱', '⚡', '🙏',
    '😊', '😉', '💪', '❤️', '📌', '🎁', '☕', '🌍'
  ],

  // À COMPLÉTER : visuels approuvés par la BU, hébergés à une adresse lisible par tous les destinataires.
  // Exemple : { libelle: 'Bannière cooptation', url: 'https://…/banniere-cooptation.png' }
  galerieImages: [],

  limites: { titre: 120, ctaLibelle: 40 }
};
