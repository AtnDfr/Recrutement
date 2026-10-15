import { messageVide } from './message';

/**
 * État du parcours. Aucune action de ce reducer ne déclenche d'envoi :
 * l'envoi n'est possible qu'après preparerEnvoi() (campagne.ts), à l'étape « verifier », confirmation ouverte.
 */

export type Etape = 'cibler' | 'rediger' | 'verifier';

export type Envoi =
  | { statut: 'inactif' }
  | { statut: 'enCours' }
  | { statut: 'succes'; reference: string }
  | { statut: 'erreur'; message: string };

export interface EtatCampagne {
  etape: Etape;
  grades: string[];
  complementaires: string[];
  /** Emails retirés manuellement. */
  retraits: string[];
  message: string;
  confirmationOuverte: boolean;
  envoi: Envoi;
}

export type Action =
  | { type: 'BASCULER_GRADE'; grade: string }
  | { type: 'DEFINIR_GRADES'; grades: string[] }
  | { type: 'BASCULER_CRITERE'; id: string }
  | { type: 'RETIRER'; email: string }
  | { type: 'REINTEGRER'; email: string }
  | { type: 'REINTEGRER_TOUS' }
  | { type: 'SAISIR_MESSAGE'; message: string }
  | { type: 'ALLER_ETAPE'; etape: Etape; nbDestinataires: number }
  | { type: 'OUVRIR_CONFIRMATION'; nbDestinataires: number }
  | { type: 'FERMER_CONFIRMATION' }
  | { type: 'ENVOI_DEMARRE' }
  | { type: 'ENVOI_REUSSI'; reference: string }
  | { type: 'ENVOI_ECHOUE'; message: string }
  | { type: 'ENVOI_REFUSE'; raison: string }
  | { type: 'NOUVELLE_CAMPAGNE' };

export const etatInitial: EtatCampagne = {
  etape: 'cibler',
  grades: [],
  complementaires: [],
  retraits: [],
  message: '',
  confirmationOuverte: false,
  envoi: { statut: 'inactif' }
};

/** Une campagne envoyée ou en cours d'envoi ne peut plus être modifiée. */
export function verrouillee(etat: EtatCampagne): boolean {
  return etat.envoi.statut === 'enCours' || etat.envoi.statut === 'succes';
}

/** Conditions pour accéder à une étape. */
export function etapeAccessible(etape: Etape, etat: EtatCampagne, nbDestinataires: number): boolean {
  switch (etape) {
    case 'cibler':
      return true;
    case 'rediger':
      return nbDestinataires > 0;
    case 'verifier':
      return nbDestinataires > 0 && !messageVide(etat.message);
  }
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

  // Toute modification ferme la confirmation : le nombre affiché doit rester exact.
  const modifie = (partiel: Partial<EtatCampagne>): EtatCampagne =>
    ({ ...etat, ...partiel, confirmationOuverte: false, envoi: { statut: 'inactif' } });

  switch (action.type) {
    case 'BASCULER_GRADE':
      return modifie({ grades: basculer(etat.grades, action.grade) });
    case 'DEFINIR_GRADES':
      return modifie({ grades: action.grades.slice() });
    case 'BASCULER_CRITERE':
      return modifie({ complementaires: basculer(etat.complementaires, action.id) });
    case 'RETIRER':
      return etat.retraits.indexOf(action.email) !== -1 ? etat : modifie({ retraits: etat.retraits.concat(action.email) });
    case 'REINTEGRER':
      return modifie({ retraits: etat.retraits.filter(e => e !== action.email) });
    case 'REINTEGRER_TOUS':
      return modifie({ retraits: [] });
    case 'SAISIR_MESSAGE':
      return modifie({ message: action.message });
    case 'ALLER_ETAPE':
      return etapeAccessible(action.etape, etat, action.nbDestinataires)
        ? { ...etat, etape: action.etape, confirmationOuverte: false }
        : etat;
    case 'OUVRIR_CONFIRMATION':
      return etat.etape === 'verifier' && etapeAccessible('verifier', etat, action.nbDestinataires)
        ? { ...etat, confirmationOuverte: true }
        : etat;
    case 'FERMER_CONFIRMATION':
      return { ...etat, confirmationOuverte: false };
    case 'ENVOI_REFUSE':
      return { ...etat, confirmationOuverte: false, envoi: { statut: 'erreur', message: action.raison } };
    case 'ENVOI_DEMARRE':
      return etat.etape === 'verifier' && etat.confirmationOuverte ? { ...etat, envoi: { statut: 'enCours' } } : etat;
  }
}

function basculer(valeurs: string[], valeur: string): string[] {
  return valeurs.indexOf(valeur) !== -1 ? valeurs.filter(v => v !== valeur) : valeurs.concat(valeur);
}
