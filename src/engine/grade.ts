import type {
  AttenteTransverse,
  Grade,
  GradeId,
  Referentiels,
  ResultatCouverture,
  TransverseRenvoyee,
} from '../types';
import { ReferentielError } from './errors';

export function getGrade(gradeId: GradeId, ref: Referentiels): Grade {
  const grade = ref.grades.grades.find((g) => g.id === gradeId);
  if (!grade) throw new ReferentielError(`Grade inconnu : ${gradeId}`);
  return grade;
}

/** Niveaux attendus du grade sur chaque axe transverse, dans l'ordre du référentiel. */
export function getAttentesTransverses(gradeId: GradeId, ref: Referentiels): AttenteTransverse[] {
  const grade = getGrade(gradeId, ref);
  return ref.grades.axes.map((axe) => ({ axe: axe.id, libelle: axe.libelle, niveau: grade.niveaux[axe.id] }));
}

/**
 * Enrichissement après matching : les compétences transverses demandées que les métiers
 * retenus ne couvrent pas sont rattachées à l'axe du grade qui les porte, avec le niveau attendu.
 * Ne modifie jamais les métiers retenus.
 */
export function renvoyerTransversesAuGrade(
  resultat: ResultatCouverture,
  gradeId: GradeId,
  ref: Referentiels,
): TransverseRenvoyee[] {
  const grade = getGrade(gradeId, ref);
  return resultat.residuels
    .filter((r) => r.motif === 'transverse-vers-grade')
    .map((r) => {
      const axe = ref.config.competencesTransverses[r.competenceId];
      if (!axe) throw new ReferentielError(`Compétence transverse sans axe : ${r.competenceId}`);
      return { competenceId: r.competenceId, axe, niveauAttendu: grade.niveaux[axe] };
    });
}
