import { ConfigCampagne } from '../config/types';
import { Collaborateur } from '../core/types';

/** Configuration de test : indépendante de la configuration réelle. */
export function configTest(partiel: Partial<ConfigCampagne> = {}): ConfigCampagne {
  return {
    siteUrl: 'https://exemple.sharepoint.com/sites/test',
    listeActeurs: { titre: 'Acteurs', colonnePersonne: 'Acteurs', colonneGrade: 'Grade' },
    colonnes: [
      { cle: 'cdm', libelle: 'CDM', nomInterne: 'CDM', type: 'personne', afficher: true },
      { cle: 'typeEntretien', libelle: 'Type entretien', nomInterne: 'Type_x0020_Entretien', type: 'texte', afficher: true }
    ],
    grades: ['Analyst', 'Consultant', 'Manager'],
    criteresComplementaires: [
      { id: 'inconnu', libelle: 'Règle inconnue', regle: null },
      { id: 'avecType', libelle: 'Avec type', regle: { colonne: 'typeEntretien', operateur: 'nonVide' } },
      { id: 'typeA', libelle: 'Type A', regle: { colonne: 'typeEntretien', operateur: 'contient', valeurs: ['(a)'] } }
    ],
    listeCampagnes: {
      titre: 'Campagnes',
      champs: { titre: 'Title', payload: 'Payload', nombreDestinataires: 'Nb', criteres: 'Criteres', statut: 'Statut' },
      statutInitial: 'À envoyer'
    },
    tailleMaxPayload: 60000,
    ...partiel
  };
}

/** Collaborateur de test, données anonymes. */
export function collab(id: string, grade: string | null, email: string | null, typeEntretien: string | null = null): Collaborateur {
  return { id, nom: `Personne ${id}`, email, grade, champs: { cdm: null, typeEntretien } };
}
