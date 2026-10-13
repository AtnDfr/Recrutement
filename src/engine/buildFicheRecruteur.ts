import type { DemandeInput, FicheRecruteur, IntituleMarche, MetierId, Referentiels, Sourcing } from '../types';
import { computeCoverage } from './coverage';
import { getAttentesTransverses, getGrade, rattacherTransversesAuGrade } from './grade';
import { detecterDansTexte, normaliserTermes } from './normalisation';
import { getIntitulesMarche, getSourcing } from './sourcing';

/**
 * Assemble la fiche transmise au recruteur.
 * 1. Normalisation des formulations libres : seules les compétences reconnues sans ambiguïté
 *    rejoignent la sélection ; ambiguës et inconnues restent visibles dans la trace.
 * 2. Matching, calculé sans le grade.
 * 3. Enrichissements : grade (attentes et transverses), sourcing, intitulés marché.
 * Le texte libre et la transcription ne produisent que des suggestions, jamais transmises au moteur.
 */
export function buildFicheRecruteur(demande: DemandeInput, ref: Referentiels): FicheRecruteur {
  const grade = getGrade(demande.grade, ref);
  const normalisation = demande.termes?.length ? normaliserTermes(demande.termes, ref) : null;
  const competencesAnalysees = [...new Set([...demande.competenceIds, ...(normalisation?.competenceIds ?? [])])];
  const resultat = computeCoverage(competencesAnalysees, ref);

  const sourcingParMetier: Record<MetierId, Sourcing | null> = {};
  const intitulesMarche: Record<MetierId, IntituleMarche[]> = {};
  for (const { metierId } of resultat.metiers) {
    sourcingParMetier[metierId] = getSourcing(metierId, ref);
    intitulesMarche[metierId] = getIntitulesMarche(metierId, ref);
  }

  return {
    demande,
    gradeLibelle: grade.libelle,
    competencesAnalysees,
    resultat,
    echelle: ref.grades.echelle,
    attentesTransverses: getAttentesTransverses(grade.id, ref),
    transverses: rattacherTransversesAuGrade(competencesAnalysees, resultat, grade.id, ref),
    normalisation,
    detectionsTexte: {
      texte: demande.texte ? detecterDansTexte(demande.texte, ref) : [],
      transcription: demande.transcription ? detecterDansTexte(demande.transcription, ref) : [],
    },
    sourcingParMetier,
    intitulesMarche,
  };
}
