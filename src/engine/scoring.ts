import type { CompetenceId, MetierId } from '../types';
import { statutDans, type EngineIndex } from './indexes';
import type { Selection } from './selection';

/**
 * Règle fondamentale : chaque métier d'une combinaison doit couvrir en Core au moins une
 * compétence déclenchante qu'aucun autre métier de la combinaison ne couvre (quel que soit
 * le statut). Une compétence déjà couverte ne peut donc pas justifier seule un métier
 * supplémentaire, et un métier redondant rend la combinaison invalide.
 */
export function apportCoreUnique(
  metierId: MetierId,
  combinaison: readonly MetierId[],
  selection: Selection,
  index: EngineIndex,
): CompetenceId[] {
  return selection.declenchantes.filter(
    (c) =>
      statutDans(index, metierId, c) === 'Core' &&
      combinaison.every((autre) => autre === metierId || statutDans(index, autre, c) === undefined),
  );
}

export function isValidCombination(combinaison: readonly MetierId[], selection: Selection, index: EngineIndex): boolean {
  return combinaison.every((m) => apportCoreUnique(m, combinaison, selection, index).length > 0);
}

export function couvertes(
  competenceIds: readonly CompetenceId[],
  combinaison: readonly MetierId[],
  index: EngineIndex,
): CompetenceId[] {
  return competenceIds.filter((c) => combinaison.some((m) => statutDans(index, m, c) !== undefined));
}

/** Clé de score lexicographique : plus grand = meilleur, composante par composante. */
export type Score = readonly [
  couverturesDeclenchantes: number,
  moinsNombreMetiers: number,
  qualite: number,
  transversesCouvertes: number,
  moinsSpecialisationNonDemandee: number,
];

export function scoreCombination(combinaison: readonly MetierId[], selection: Selection, index: EngineIndex): Score {
  const { poidsStatut } = index.ref.config;
  const declenchantesCouvertes = couvertes(selection.declenchantes, combinaison, index);

  let qualite = 0;
  for (const c of declenchantesCouvertes) {
    let best = 0;
    for (const m of combinaison) {
      const s = statutDans(index, m, c);
      if (s) best = Math.max(best, poidsStatut[s]);
    }
    qualite += best;
  }

  // Pénalise une spécialisation non demandée portée en Core : une technologie (ex. GCP Data
  // Engineer face à Senior Data Engineer quand GCP n'est pas demandé) ou une compétence
  // transverse (ex. Lead Data Engineer et son leadership, qui relèvent du grade).
  const demandees = new Set(selection.toutes);
  let specialisation = 0;
  for (const m of combinaison) {
    for (const [c, s] of index.statut.get(m)!) {
      if (s !== 'Core' || demandees.has(c)) continue;
      const type = index.competences.get(c)?.type;
      if (type === 'Technologie' || type === 'Écosystème' || index.transverses.has(c)) specialisation++;
    }
  }

  return [
    declenchantesCouvertes.length,
    -combinaison.length,
    qualite,
    couvertes(selection.transverses, combinaison, index).length,
    -specialisation,
  ];
}

/** > 0 si a est meilleur que b, < 0 s'il est moins bon, 0 en cas d'égalité. */
export function compareScores(a: Score, b: Score): number {
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    if (d !== 0) return d;
  }
  return 0;
}
