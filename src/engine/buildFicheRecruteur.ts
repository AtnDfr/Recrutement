import type { DemandeInput, FicheRecruteur, IntituleMarche, MetierId, Referentiels, Sourcing } from '../types';
import { computeCoverage } from './coverage';
import { getAttentesTransverses, getGrade, renvoyerTransversesAuGrade } from './grade';
import { getIntitulesMarche, getSourcing } from './sourcing';

/**
 * Assemble la fiche transmise au recruteur. Le matching est calculé sans le grade ;
 * le grade et le sourcing n'interviennent qu'ensuite, en enrichissement.
 */
export function buildFicheRecruteur(demande: DemandeInput, ref: Referentiels): FicheRecruteur {
  const grade = getGrade(demande.grade, ref);
  const resultat = computeCoverage(demande.competenceIds, ref);

  const sourcingParMetier: Record<MetierId, Sourcing | null> = {};
  const intitulesMarche: Record<MetierId, IntituleMarche[]> = {};
  for (const { metierId } of resultat.metiers) {
    sourcingParMetier[metierId] = getSourcing(metierId, ref);
    intitulesMarche[metierId] = getIntitulesMarche(metierId, ref);
  }

  return {
    demande,
    gradeLibelle: grade.libelle,
    resultat,
    echelle: ref.grades.echelle,
    attentesTransverses: getAttentesTransverses(grade.id, ref),
    transversesRenvoyees: renvoyerTransversesAuGrade(resultat, grade.id, ref),
    sourcingParMetier,
    intitulesMarche,
  };
}
