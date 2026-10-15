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
    // À CONFIRMER : titre exact. L'URL de la liste contient « IA  Suivi des acteurs  Acteurs ».
    titre: 'IA - Suivi des acteurs - Acteurs',
    // À CONFIRMER : nom interne de la colonne Person « Acteurs ».
    colonnePersonne: 'Acteurs',
    // À CONFIRMER : nom interne de la colonne « Grade ».
    colonneGrade: 'Grade'
  },

  colonnes: [
    // À CONFIRMER : nom interne ET type. Les valeurs (« NOM Prénom ») suggèrent une colonne Person.
    { cle: 'cdm', libelle: 'CDM', nomInterne: 'CDM', type: 'texte', afficher: true },
    // À CONFIRMER : nom interne.
    { cle: 'statut', libelle: 'Statut', nomInterne: 'statut', type: 'texte', afficher: true },
    // À CONFIRMER : nom interne (l'espace devient en général « _x0020_ »).
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

  // Règles NON CONNUES à ce jour : les critères sont affichés mais inactifs (regle: null).
  // Exemple de règle, à n'activer qu'une fois validée par la BU :
  //   regle: { colonne: 'typeEntretien', operateur: 'contient', valeurs: ['(maker)'] }
  criteresComplementaires: [
    { id: 'maker', libelle: 'Maker', regle: null },
    { id: 'nonMaker', libelle: 'Non-maker', regle: null },
    { id: 'cdm', libelle: 'CDM', regle: null },
    { id: 'acteurRecrutement', libelle: 'Acteur du recrutement', regle: null }
  ],

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

  // Une colonne « Plusieurs lignes de texte » (texte brut) accepte 63 999 caractères via l'interface.
  tailleMaxPayload: 60000
};
