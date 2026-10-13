import type {
  ArbitrageCouverture,
  CompetenceId,
  CritereDecisif,
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
    .map((c) => residuel(c, best, candidats, selection, index, plafond));

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
  retenue: { combinaison: MetierId[]; score: Score },
  candidats: readonly MetierId[],
  selection: Selection,
  index: EngineIndex,
  plafond: number,
): Residuel {
  const retenus = retenue.combinaison;
  const porteurs = (index.metiersParCompetence.get(competenceId) ?? []).filter((m) => !retenus.includes(m));
  const enCore = porteurs.filter((m) => statutDans(index, m, competenceId) === 'Core');
  const metiersCandidats = [...enCore, ...porteurs.filter((m) => !enCore.includes(m))];

  if (selection.transverses.includes(competenceId)) return { competenceId, motif: 'transverse-vers-grade', metiersCandidats };
  if (porteurs.length === 0) return { competenceId, motif: 'hors-signatures', metiersCandidats };
  if (enCore.length === 0) return { competenceId, motif: 'non-core-uniquement', metiersCandidats };
  if (retenus.length >= plafond) return { competenceId, motif: 'plafond-atteint', metiersCandidats };
  return {
    competenceId,
    motif: 'arbitrage-couverture',
    metiersCandidats,
    arbitrages: enCore.map((m) => expliquerArbitrage(competenceId, m, retenue, candidats, selection, index, plafond)),
  };
}

const CRITERES: CritereDecisif[] = [
  'couverture',
  'nombre-de-metiers',
  'qualite-des-statuts',
  'transverses-couvertes',
  'specialisation-non-demandee',
];

const LIBELLE_CRITERE: Record<CritereDecisif, string> = {
  couverture: 'moins de compétences demandées couvertes',
  'nombre-de-metiers': 'davantage de métiers pour la même couverture',
  'qualite-des-statuts': 'couverture reposant sur des statuts moins forts (moins de Core)',
  'transverses-couvertes': 'moins de compétences transverses demandées couvertes',
  'specialisation-non-demandee': 'davantage de spécialisations Core non demandées',
  'ordre-des-identifiants': 'solution ex aequo, départagée par l’ordre des identifiants',
};

/**
 * Pourquoi un métier qui porte la compétence en Core n'a pas été retenu, alors que le plafond
 * n'était pas atteint : on compare la solution retenue à la meilleure combinaison valide qui l'inclut.
 */
function expliquerArbitrage(
  competenceId: CompetenceId,
  metierEcarte: MetierId,
  retenue: { combinaison: MetierId[]; score: Score },
  candidats: readonly MetierId[],
  selection: Selection,
  index: EngineIndex,
  plafond: number,
): ArbitrageCouverture {
  const avecEcarte = [...retenue.combinaison, metierEcarte];
  const metiersRendusRedondants = retenue.combinaison.filter(
    (m) => apportCoreUnique(m, avecEcarte, selection, index).length === 0,
  );

  // Le métier seul est toujours valide (il porte la compétence en Core, non couverte ailleurs).
  let meilleure = { combinaison: [metierEcarte], score: scoreCombination([metierEcarte], selection, index) };
  const autres = candidats.filter((m) => m !== metierEcarte);
  for (let k = 1; k < plafond; k++) {
    for (const reste of combinations(autres, k)) {
      const combinaison = [...reste, metierEcarte].sort();
      if (!isValidCombination(combinaison, selection, index)) continue;
      const score = scoreCombination(combinaison, selection, index);
      if (compareScores(score, meilleure.score) > 0) meilleure = { combinaison, score };
    }
  }

  const i = retenue.score.findIndex((v, j) => v !== meilleure.score[j]);
  const critereDecisif = i === -1 ? 'ordre-des-identifiants' : CRITERES[i]!;
  const couvertureRetenue = retenue.score[0];
  const couvertureAvecEcarte = meilleure.score[0];

  const nomMetier = (m: MetierId) => `« ${index.metiers.get(m)?.nom ?? m} »`;
  const nomCompetence = `« ${index.competences.get(competenceId)?.nom ?? competenceId} »`;
  const raisons: string[] = [];
  if (metiersRendusRedondants.length) {
    raisons.push(
      `l’ajouter à la solution retenue rendrait ${metiersRendusRedondants.map(nomMetier).join(', ')} ` +
        `redondant (plus aucune compétence Core propre)`,
    );
  }
  raisons.push(
    `la meilleure combinaison qui l’inclut (${meilleure.combinaison.map(nomMetier).join(', ')}) couvre ` +
      `${couvertureAvecEcarte} compétence(s) déclenchante(s) contre ${couvertureRetenue} pour la solution retenue ` +
      `(critère décisif : ${LIBELLE_CRITERE[critereDecisif]})`,
  );

  return {
    competenceId,
    metierEcarte,
    metiersRendusRedondants,
    couvertureRetenue,
    meilleureCombinaisonAvecEcarte: meilleure.combinaison,
    couvertureAvecEcarte,
    critereDecisif,
    raison: `${nomMetier(metierEcarte)} aurait couvert ${nomCompetence} en Core, mais ${raisons.join(' ; ')}.`,
  };
}
