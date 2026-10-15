import { ConfigCampagne } from '../config/types';
import { critereActif } from './filtres';
import { EtatCampagne } from './etat';
import { messageVide, versHtmlTeams } from './message';
import { Collaborateur, PayloadFlow } from './types';

export function construirePayload(destinataires: readonly Collaborateur[], message: string): PayloadFlow {
  return {
    destinataires: destinataires.map(d => (d.email as string).trim()),
    message: versHtmlTeams(message)
  };
}

/** Description lisible des critères, pour la vérification et la traçabilité. */
export function decrireCriteres(etat: EtatCampagne, config: ConfigCampagne): string[] {
  const grades = config.grades.filter(g => etat.grades.indexOf(g) !== -1);
  const complementaires = config.criteresComplementaires
    .filter(c => critereActif(c) && etat.complementaires.indexOf(c.id) !== -1)
    .map(c => c.libelle);
  return [
    `Grades : ${grades.length > 0 ? grades.join(', ') : 'aucun'}`,
    `Critères complémentaires : ${complementaires.length > 0 ? complementaires.join(', ') : 'aucun'}`,
    `Retraits manuels : ${etat.retraits.length}`
  ];
}

export type PreparationEnvoi =
  | { ok: true; payload: PayloadFlow; criteres: string[] }
  | { ok: false; raison: string };

/**
 * Dernier garde-fou avant l'appel au service. Refuse tout envoi qui ne vient pas
 * d'une confirmation explicite, à l'étape de vérification, avec destinataires et message.
 */
export function preparerEnvoi(
  etat: EtatCampagne,
  destinataires: readonly Collaborateur[],
  config: ConfigCampagne
): PreparationEnvoi {
  if (etat.etape !== 'verifier') return { ok: false, raison: 'La campagne doit être vérifiée avant l\'envoi.' };
  if (!etat.confirmationOuverte) return { ok: false, raison: 'L\'envoi doit être confirmé explicitement.' };
  if (etat.envoi.statut === 'enCours' || etat.envoi.statut === 'succes') return { ok: false, raison: 'Cette campagne a déjà été transmise.' };
  if (destinataires.length === 0) return { ok: false, raison: 'Aucun destinataire.' };
  if (destinataires.some(d => d.email === null)) return { ok: false, raison: 'Un destinataire n\'a pas d\'email.' };
  if (messageVide(etat.message)) return { ok: false, raison: 'Le message est vide.' };

  const payload = construirePayload(destinataires, etat.message);
  if (JSON.stringify(payload).length > config.tailleMaxPayload) {
    return { ok: false, raison: 'La campagne est trop volumineuse (message ou nombre de destinataires) pour être transmise en une fois.' };
  }
  return { ok: true, payload, criteres: decrireCriteres(etat, config) };
}
