import { ConfigCampagne } from './types';

/**
 * ★ SEUL FICHIER À COMPLÉTER.
 *
 * Les valeurs marquées « À CONFIRMER » sont déduites de l'export CSV de la liste et n'ont pas pu
 * être vérifiées sur SharePoint. Pour obtenir les noms internes exacts des colonnes, ouvrir dans le
 * navigateur (connecté au tenant) :
 *
 *   https://digiplace.sharepoint.com/sites/WOFHR-RECRUITMENTACTIVITIES/_api/web/lists/getbytitle('IA - Suivi des acteurs - Acteurs')/fields?$select=Title,InternalName,TypeAsString&$filter=Hidden eq false
 *
 * (voir README, section « Compléter la configuration »).
 */
export const configCampagne: ConfigCampagne = {
  siteUrl: 'https://digiplace.sharepoint.com/sites/WOFHR-RECRUITMENTACTIVITIES',

  listeActeurs: {
    // Titre affiché de la liste (confirmé). L'URL, elle, contient « IA  Suivi des acteurs  Acteurs ».
    titre: 'IA - Suivi des acteurs - Acteurs',
    // À CONFIRMER : nom interne de la colonne Person « Acteurs ».
    colonnePersonne: 'Acteurs',
    // À CONFIRMER : nom interne de la colonne « Grade ».
    colonneGrade: 'Grade'
  },

  colonnes: [
    // Colonne Person (confirmé par l'affichage de la liste). À CONFIRMER : nom interne.
    { cle: 'cdm', libelle: 'CDM', nomInterne: 'CDM', type: 'personne', afficher: true },
    // Colonne Choix. À CONFIRMER : nom interne.
    { cle: 'statut', libelle: 'Statut', nomInterne: 'statut', type: 'texte', afficher: true },
    // Colonne Choix. À CONFIRMER : nom interne (l'espace devient en général « _x0020_ »).
    { cle: 'typeEntretien', libelle: 'Type entretien', nomInterne: 'Type_x0020_Entretien', type: 'texte', afficher: true }
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
