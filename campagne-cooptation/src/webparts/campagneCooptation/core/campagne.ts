import { ConfigCampagne } from '../config/types';
import { campagnePrete, donneesCarte } from './contenu';
import { EtatCampagne } from './etat';
import { critereActif, OptionCdm } from './filtres';
import { appliquerModele, ResultatModele } from './modeleCarte';
import { Collaborateur, Contenu, PayloadFlow } from './types';

/** Carte finale pour l'état courant : c'est elle qui est affichée ET envoyée. */
export function carteDeLaCampagne(contenu: Contenu, modele: unknown): ResultatModele {
  return appliquerModele(modele, donneesCarte(contenu));
}

export function construirePayload(
  destinataires: readonly Collaborateur[],
  etat: EtatCampagne,
  carte: { carte: Record<string, unknown>; modele: string }
): PayloadFlow {
  const donnees = donneesCarte(etat.contenu);
  return {
    destinataires: destinataires.map(d => (d.email as string).trim()),
    titre: donnees.titre ?? '',
    message: donnees.message ?? '',
    ctaLibelle: donnees.ctaLibelle,
    ctaUrl: donnees.ctaUrl,
    modele: carte.modele,
    carte: carte.carte
  };
}

/** Description lisible des critères, pour le récapitulatif, la vérification et la traçabilité. */
export function decrireCriteres(etat: EtatCampagne, config: ConfigCampagne, cdms: readonly OptionCdm[]): string[] {
  const grades = config.grades.filter(g => etat.grades.indexOf(g) !== -1);
  const lignes = [`Grades : ${grades.length > 0 ? grades.join(', ') : 'aucun'}`];
  const complementaires = config.criteresComplementaires
    .filter(c => critereActif(c) && etat.complementaires.indexOf(c.id) !== -1)
    .map(c => c.libelle);
  if (complementaires.length > 0) lignes.push(`Critères : ${complementaires.join(', ')}`);
  if (etat.estCdm) lignes.push('Est CDM');
  if (etat.cdms.length > 0) {
    const noms = etat.cdms.map(email => cdms.find(o => o.email === email)?.nom ?? email);
    lignes.push(`Collaborateurs de : ${noms.join(', ')}`);
  }
  if (etat.retraits.length > 0) lignes.push(`Retraits manuels : ${etat.retraits.length}`);
  return lignes;
}

export type PreparationEnvoi =
  | { ok: true; payload: PayloadFlow; criteres: string[] }
  | { ok: false; raison: string };

/**
 * Dernier garde-fou avant l'appel au service. Refuse tout envoi qui ne vient pas
 * d'une confirmation explicite, à l'étape de vérification, avec une campagne complète.
 */
export function preparerEnvoi(
  etat: EtatCampagne,
  destinataires: readonly Collaborateur[],
  modele: unknown,
  config: ConfigCampagne,
  cdms: readonly OptionCdm[]
): PreparationEnvoi {
  if (etat.etape !== 'verification') return { ok: false, raison: 'La campagne doit être vérifiée avant l\'envoi.' };
  if (!etat.confirmationOuverte) return { ok: false, raison: 'L\'envoi doit être confirmé explicitement.' };
  if (etat.envoi.statut === 'enCours' || etat.envoi.statut === 'succes') return { ok: false, raison: 'Cette campagne a déjà été transmise.' };
  if (destinataires.length === 0) return { ok: false, raison: 'Aucun destinataire.' };
  if (destinataires.some(d => d.email === null)) return { ok: false, raison: 'Un destinataire n\'a pas d\'email.' };
  if (!campagnePrete(etat.contenu, destinataires.length, config)) return { ok: false, raison: 'La campagne est incomplète.' };

  const carte = carteDeLaCampagne(etat.contenu, modele);
  if (!carte.ok) return { ok: false, raison: carte.erreur };

  const payload = construirePayload(destinataires, etat, carte);
  if (JSON.stringify(payload).length > config.tailleMaxPayload) {
    return { ok: false, raison: 'La campagne est trop volumineuse (message ou nombre de destinataires) pour être transmise en une fois.' };
  }
  return { ok: true, payload, criteres: decrireCriteres(etat, config, cdms) };
}
