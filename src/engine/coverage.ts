import type {
  CompetenceId,
  CouvertureItem,
  MetierId,
  MetierRetenu,
  Referentiels,
  Residuel,
  ResultatCouverture,
} from '../types';
import { combinations } from './combinations';
import { buildIndex, statutDans, type EngineIndex } from './indexes';
import { apportCoreUnique, compareScores, isValidCombination, scoreCombination, type Score } from './scoring';
import { prepareSelection, type Selection } from './selection';

/**
 * Détermine le plus petit ensemble cohérent de métiers couvrant les compétences demandées.
 *
 * Recherche exacte bornée par `config.plafondMetiers` : parmi les combinaisons valides
 * (chaque métier a un apport Core unique), on retient la meilleure selon `scoreCombination`,
 * puis on la restitue sous forme de couverture progressive.
 *
 * Le grade n'est volontairement pas un paramètre : il ne peut pas influencer les métiers.
 */
export function computeCoverage(competenceIds: readonly CompetenceId[], ref: Referentiels): ResultatCouverture {
  const index = buildIndex(ref);
  const selection = prepareSelection(competenceIds, index);
  const plafond = ref.config.plafondMetiers;

  const candidats = index.metierIds.filter((m) =>
    selection.declenchantes.some((c) => statutDans(index, m, c) === 'Core'),
  );

  let best: { combinaison: MetierId[]; score: Score } = {
    combinaison: [],
    score: scoreCombination([], selection, index),
  };
  let ex_aequo: MetierId[][] = [[]];
  for (let k = 1; k <= Math.min(plafond, candidats.length); k++) {
    for (const combinaison of combinations(candidats, k)) {
      if (!isValidCombination(combinaison, selection, index)) continue;
      const score = scoreCombination(combinaison, selection, index);
      const cmp = compareScores(score, best.score);
      if (cmp > 0) {
        best = { combinaison, score };
        ex_aequo = [combinaison];
      } else if (cmp === 0) {
        ex_aequo.push(combinaison);
      }
    }
  }

  const ordre = ordreProgressif(best.combinaison, selection, index);
  const metiers = restituer(ordre, ex_aequo, selection, index);
  const couvertesSet = new Set(metiers.flatMap((m) => m.nouvelles.map((i) => i.competenceId)));
  const residuels = selection.toutes
    .filter((c) => !couvertesSet.has(c))
    .map((c) => residuel(c, best.combinaison, selection, index, plafond));

  return {
    metiers,
    residuels,
    tauxCouverture: selection.toutes.length ? couvertesSet.size / selection.toutes.length : 0,
    ambigu: ex_aequo.length > 1,
  };
}

/** Ordonne les métiers retenus : à chaque rang, celui qui apporte le plus de compétences encore non couvertes. */
function ordreProgressif(combinaison: readonly MetierId[], selection: Selection, index: EngineIndex): MetierId[] {
  const restants = [...combinaison];
  const couvertes = new Set<CompetenceId>();
  const ordre: MetierId[] = [];
  while (restants.length) {
    const gain = (m: MetierId): [number, number] => {
      const nouvelles = selection.toutes.filter((c) => !couvertes.has(c) && statutDans(index, m, c) !== undefined);
      return [nouvelles.length, nouvelles.filter((c) => statutDans(index, m, c) === 'Core').length];
    };
    restants.sort((a, b) => {
      const [ga, gb] = [gain(a), gain(b)];
      return gb[0] - ga[0] || gb[1] - ga[1] || a.localeCompare(b);
    });
    const m = restants.shift()!;
    for (const c of selection.toutes) if (statutDans(index, m, c) !== undefined) couvertes.add(c);
    ordre.push(m);
  }
  return ordre;
}

function restituer(
  ordre: readonly MetierId[],
  ex_aequo: readonly MetierId[][],
  selection: Selection,
  index: EngineIndex,
): MetierRetenu[] {
  const dejaCouvertes = new Set<CompetenceId>();
  return ordre.map((metierId, i) => {
    const nouvelles: CouvertureItem[] = [];
    const partagees: CouvertureItem[] = [];
    for (const c of selection.toutes) {
      const statut = statutDans(index, metierId, c);
      if (!statut) continue;
      (dejaCouvertes.has(c) ? partagees : nouvelles).push({ competenceId: c, statut });
    }
    for (const item of nouvelles) dejaCouvertes.add(item.competenceId);

    // Alternative : métier qui, substitué à celui-ci, donne une combinaison ex aequo.
    const autres = ordre.filter((m) => m !== metierId);
    const alternatives = ex_aequo
      .filter((combi) => autres.every((m) => combi.includes(m)) && !combi.includes(metierId))
      .flatMap((combi) => combi.filter((m) => !autres.includes(m)))
      .sort();

    return {
      metierId,
      rang: i + 1,
      nouvelles,
      partagees,
      apportCoreUnique: apportCoreUnique(metierId, ordre, selection, index),
      alternatives,
    };
  });
}

function residuel(
  competenceId: CompetenceId,
  retenus: readonly MetierId[],
  selection: Selection,
  index: EngineIndex,
  plafond: number,
): Residuel {
  const porteurs = (index.metiersParCompetence.get(competenceId) ?? []).filter((m) => !retenus.includes(m));
  const enCore = porteurs.filter((m) => statutDans(index, m, competenceId) === 'Core');
  const metiersCandidats = [...enCore, ...porteurs.filter((m) => !enCore.includes(m))];

  let motif: Residuel['motif'];
  if (selection.transverses.includes(competenceId)) motif = 'transverse-vers-grade';
  else if (porteurs.length === 0) motif = 'hors-signatures';
  else if (enCore.length === 0) motif = 'non-core-uniquement';
  else if (retenus.length >= plafond) motif = 'plafond-atteint';
  else motif = 'arbitrage-couverture';

  return { competenceId, motif, metiersCandidats };
}
