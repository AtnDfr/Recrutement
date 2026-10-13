import type { CompetenceId } from '../types';
import { ReferentielError } from './errors';
import type { EngineIndex } from './indexes';

export interface Selection {
  /** Compétences demandées, dédoublonnées et triées par ID (le résultat ne dépend pas de l'ordre de saisie). */
  toutes: CompetenceId[];
  /** Compétences qui peuvent justifier l'ajout d'un métier. */
  declenchantes: CompetenceId[];
  /** Compétences transverses : couvertes en bonus, jamais déclenchantes. */
  transverses: CompetenceId[];
  /** Compétences déclenchantes présentes dans aucune signature métier. */
  horsSignatures: CompetenceId[];
}

export function prepareSelection(competenceIds: readonly CompetenceId[], index: EngineIndex): Selection {
  const toutes = [...new Set(competenceIds)].sort();
  const inconnues = toutes.filter((id) => !index.competences.has(id));
  if (inconnues.length) throw new ReferentielError(`Compétences inconnues : ${inconnues.join(', ')}`);

  const transverses = toutes.filter((id) => index.transverses.has(id));
  const declenchantes = toutes.filter((id) => !index.transverses.has(id));
  const horsSignatures = declenchantes.filter((id) => !index.metiersParCompetence.has(id));
  return { toutes, declenchantes, transverses, horsSignatures };
}
