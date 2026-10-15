import { ConfigCampagne } from '../config/types';
import { campagnePrete, contenuVide } from './contenu';
import { Contenu } from './types';

/**
 * État du parcours : une page d'édition, puis une vérification obligatoire, puis la confirmation.
 * Aucune action de ce reducer ne déclenche d'envoi : l'envoi n'est possible qu'après preparerEnvoi()
 * (campagne.ts), à l'étape « verification », confirmation ouverte.
 */

export type Etape = 'edition' | 'verification';

export type Envoi =
  | { statut: 'inactif' }
  | { statut: 'enCours' }
  | { statut: 'succes'; reference: string }
  | { statut: 'erreur'; message: string };

export interface EtatCampagne {
  etape: Etape;
  grades: string[];
  complementaires: string[];
  estCdm: boolean;
  /** Emails des CDM choisis dans « Collaborateurs de… ». */
  cdms: string[];
  /** Emails retirés manuellement. */
  retraits: string[];
  contenu: Contenu;
  confirmationOuverte: boolean;
  envoi: Envoi;
}

export type Action =
  | { type: 'BASCULER_GRADE'; grade: string }
  | { type: 'DEFINIR_GRADES'; grades: string[] }
  | { type: 'BASCULER_CRITERE'; id: string }
  | { type: 'BASCULER_EST_CDM' }
  | { type: 'DEFINIR_CDMS'; emails: string[] }
  | { type: 'RETIRER'; email: string }
  | { type: 'REINTEGRER'; email: string }
  | { type: 'REINTEGRER_TOUS' }
  | { type: 'MODIFIER_CONTENU'; contenu: Partial<Contenu> }
  | { type: 'OUVRIR_VERIFICATION'; nbDestinataires: number; config: ConfigCampagne }
  | { type: 'FERMER_VERIFICATION' }
  | { type: 'OUVRIR_CONFIRMATION'; nbDestinataires: number; config: ConfigCampagne }
  | { type: 'FERMER_CONFIRMATION' }
  | { type: 'ENVOI_REFUSE'; raison: string }
  | { type: 'ENVOI_DEMARRE' }
  | { type: 'ENVOI_REUSSI'; reference: string }
  | { type: 'ENVOI_ECHOUE'; message: string }
  | { type: 'NOUVELLE_CAMPAGNE' };

export const etatInitial: EtatCampagne = {
  etape: 'edition',
  grades: [],
  complementaires: [],
  estCdm: false,
  cdms: [],
  retraits: [],
  contenu: contenuVide,
  confirmationOuverte: false,
  envoi: { statut: 'inactif' }
};

/** Une campagne envoyée ou en cours d'envoi ne peut plus être modifiée. */
export function verrouillee(etat: EtatCampagne): boolean {
  return etat.envoi.statut === 'enCours' || etat.envoi.statut === 'succes';
}

export function reducer(etat: EtatCampagne, action: Action): EtatCampagne {
  if (action.type === 'NOUVELLE_CAMPAGNE') {
    return etat.envoi.statut === 'enCours' ? etat : etatInitial;
  }
  if (action.type === 'ENVOI_REUSSI') {
    return etat.envoi.statut === 'enCours' ? { ...etat, confirmationOuverte: false, envoi: { statut: 'succes', reference: action.reference } } : etat;
  }
  if (action.type === 'ENVOI_ECHOUE') {
    return etat.envoi.statut === 'enCours' ? { ...etat, confirmationOuverte: false, envoi: { statut: 'erreur', message: action.message } } : etat;
  }
  if (verrouillee(etat)) return etat;

  // Toute modification renvoie à l'édition et ferme la confirmation : la vérification doit être refaite.
  const modifie = (partiel: Partial<EtatCampagne>): EtatCampagne =>
    ({ ...etat, ...partiel, etape: 'edition', confirmationOuverte: false, envoi: { statut: 'inactif' } });

  switch (action.type) {
    case 'BASCULER_GRADE':
      return modifie({ grades: basculer(etat.grades, action.grade) });
    case 'DEFINIR_GRADES':
      return modifie({ grades: action.grades.slice() });
    case 'BASCULER_CRITERE':
      return modifie({ complementaires: basculer(etat.complementaires, action.id) });
    case 'BASCULER_EST_CDM':
      return modifie({ estCdm: !etat.estCdm });
    case 'DEFINIR_CDMS':
      return modifie({ cdms: action.emails.slice() });
    case 'RETIRER':
      return etat.retraits.indexOf(action.email) !== -1 ? etat : modifie({ retraits: etat.retraits.concat(action.email) });
    case 'REINTEGRER':
      return modifie({ retraits: etat.retraits.filter(e => e !== action.email) });
    case 'REINTEGRER_TOUS':
      return modifie({ retraits: [] });
    case 'MODIFIER_CONTENU':
      return modifie({ contenu: { ...etat.contenu, ...action.contenu } });
    case 'OUVRIR_VERIFICATION':
      return campagnePrete(etat.contenu, action.nbDestinataires, action.config)
        ? { ...etat, etape: 'verification', confirmationOuverte: false }
        : etat;
    case 'FERMER_VERIFICATION':
      return { ...etat, etape: 'edition', confirmationOuverte: false };
    case 'OUVRIR_CONFIRMATION':
      return etat.etape === 'verification' && campagnePrete(etat.contenu, action.nbDestinataires, action.config)
        ? { ...etat, confirmationOuverte: true }
        : etat;
    case 'FERMER_CONFIRMATION':
      return { ...etat, confirmationOuverte: false };
    case 'ENVOI_REFUSE':
      return { ...etat, confirmationOuverte: false, envoi: { statut: 'erreur', message: action.raison } };
    case 'ENVOI_DEMARRE':
      return etat.etape === 'verification' && etat.confirmationOuverte ? { ...etat, envoi: { statut: 'enCours' } } : etat;
  }
}

function basculer(valeurs: string[], valeur: string): string[] {
  return valeurs.indexOf(valeur) !== -1 ? valeurs.filter(v => v !== valeur) : valeurs.concat(valeur);
}
