import competences from './generated/competences.json';
import synonymes from './generated/synonymes.json';
import metiers from './generated/metiers.json';
import sourcing from './generated/sourcing.json';
import grades from './grades.json';
import config from './config.json';
import type { Referentiels } from '../types';
import { validateReferentiels } from './validate';

let cache: Referentiels | null = null;

/** Charge et valide les référentiels générés. Lève une erreur si un contrôle échoue. */
export function loadReferentiels(): Referentiels {
  if (cache) return cache;
  // Les JSON sont produits par scripts/build-referentiels.ts depuis ces mêmes types ;
  // la validation ci-dessous vérifie leur cohérence à l'exécution.
  const ref = { competences, synonymes, metiers, sourcing, grades, config } as Referentiels;
  const errors = validateReferentiels(ref);
  if (errors.length) throw new Error(`Référentiels incohérents :\n- ${errors.join('\n- ')}`);
  cache = ref;
  return ref;
}
