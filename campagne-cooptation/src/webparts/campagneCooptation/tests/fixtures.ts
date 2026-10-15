import { ConfigCampagne } from '../config/types';
import { Collaborateur, Contenu } from '../core/types';

/** Configuration de test : indépendante de la configuration réelle, mêmes règles métier. */
export function configTest(partiel: Partial<ConfigCampagne> = {}): ConfigCampagne {
  return {
    siteUrl: 'https://exemple.sharepoint.com/sites/test',
    listeActeurs: { titre: 'Acteurs', colonnePersonne: 'Acteurs', colonneGrade: 'Grade' },
    colonnes: [
      { cle: 'cdm', libelle: 'CDM', nomInterne: 'CDM', type: 'personne', afficher: true },
      { cle: 'statut', libelle: 'Statut', nomInterne: 'statut', type: 'texte', afficher: true },
      { cle: 'typeEntretien', libelle: 'Type entretien', nomInterne: 'Type_x0020_Entretien', type: 'texte', afficher: true }
    ],
    grades: ['Analyst', 'Consultant', 'Manager'],
    criteresComplementaires: [
      { id: 'maker', libelle: 'Maker', groupe: 'profil', regle: { colonne: 'typeEntretien', operateur: 'contient', valeurs: ['(maker)'] } },
      { id: 'nonMaker', libelle: 'Non-maker', groupe: 'profil', regle: { colonne: 'typeEntretien', operateur: 'contient', valeurs: ['(non maker)'] } },
      { id: 'acteurRecrutementActif', libelle: 'Acteur recrutement actif', regle: { colonne: 'statut', operateur: 'egal', valeurs: ['Actif'] } },
      { id: 'inconnu', libelle: 'Règle inconnue', regle: null }
    ],
    colonneCdm: 'cdm',
    listeCampagnes: {
      titre: 'Campagnes',
      champs: { titre: 'Title', payload: 'Payload', nombreDestinataires: 'Nb', criteres: 'Criteres', statut: 'Statut' },
      statutInitial: 'À envoyer'
    },
    urlModeleCarte: 'https://exemple.sharepoint.com/modele.json',
    emojis: ['🚀', '🤝'],
    galerieImages: [],
    tailleMaxPayload: 60000,
    limites: { titre: 120, ctaLibelle: 40 },
    ...partiel
  };
}

interface OptionsCollab {
  statut?: string | null;
  typeEntretien?: string | null;
  /** Email du CDM. */
  cdm?: string | null;
}

/** Collaborateur de test, données anonymes. */
export function collab(id: string, grade: string | null, email: string | null, options: OptionsCollab = {}): Collaborateur {
  const cdm = options.cdm ?? null;
  return {
    id,
    nom: `Personne ${id}`,
    email,
    grade,
    champs: { cdm: cdm, statut: options.statut ?? null, typeEntretien: options.typeEntretien ?? null },
    personnes: { cdm: cdm === null ? [] : [{ nom: `CDM ${cdm}`, email: cdm }] }
  };
}

export function contenuTest(partiel: Partial<Contenu> = {}): Contenu {
  return { titre: 'On recrute', message: 'Bonjour **à tous**', avecBouton: false, ctaLibelle: '', ctaUrl: '', avecImage: false, imageUrl: '', ...partiel };
}

/** Modèle de carte de test, même forme que modeles/carte-cooptation.json. */
export const modeleTest = {
  type: 'AdaptiveCard',
  version: '1.5',
  'x-modele': 'carte-test@3',
  body: [
    { $when: '${imageUrl}', type: 'Image', url: '${imageUrl}', size: 'Stretch' },
    { type: 'TextBlock', text: '${titre}', weight: 'Bolder' },
    { type: 'TextBlock', text: '${message}', wrap: true }
  ],
  actions: [{ $when: '${ctaUrl}', type: 'Action.OpenUrl', title: '${ctaLibelle}', url: '${ctaUrl}' }]
};
