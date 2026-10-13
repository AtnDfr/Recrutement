import type {
  AttenteTransverse,
  CompetenceId,
  Grade,
  GradeId,
  Referentiels,
  ResultatCouverture,
  TransverseDemandee,
} from '../types';
import { ReferentielError } from './errors';
import { buildIndex, statutDans } from './indexes';

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
 * Enrichissement après matching. Chaque compétence transverse demandée est rattachée à l'axe
 * du grade qui en porte la dimension de séniorité, avec le niveau attendu. Les métiers retenus
 * qui l'ont dans leur signature restent indiqués : le grade ne retire rien à la couverture métier.
 * Ne modifie jamais le résultat du moteur.
 */
export function rattacherTransversesAuGrade(
  competenceIds: readonly CompetenceId[],
  resultat: ResultatCouverture,
  gradeId: GradeId,
  ref: Referentiels,
): TransverseDemandee[] {
  const grade = getGrade(gradeId, ref);
  const index = buildIndex(ref);
  return [...new Set(competenceIds)]
    .sort()
    .flatMap((competenceId) => {
      const axe = ref.config.competencesTransverses[competenceId];
      if (!axe) return [];
      const metiersPorteurs = resultat.metiers
        .map((m) => m.metierId)
        .filter((m) => statutDans(index, m, competenceId) !== undefined);
      return [
        {
          competenceId,
          axe,
          niveauAttendu: grade.niveaux[axe],
          metiersPorteurs,
          renvoyeeAuGrade: metiersPorteurs.length === 0,
        },
      ];
    });
}
