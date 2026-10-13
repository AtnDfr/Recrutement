import type {
  Competence,
  CompetenceId,
  Metier,
  MetierId,
  Referentiels,
  SignatureStatut,
} from '../types';

export interface EngineIndex {
  ref: Referentiels;
  competences: Map<CompetenceId, Competence>;
  metiers: Map<MetierId, Metier>;
  /** Métiers triés par ID, pour un parcours déterministe. */
  metierIds: MetierId[];
  /** métier → (compétence → statut dans la signature). */
  statut: Map<MetierId, Map<CompetenceId, SignatureStatut>>;
  /** compétence → métiers dont la signature la contient (tous statuts), triés par ID. */
  metiersParCompetence: Map<CompetenceId, MetierId[]>;
  transverses: Set<CompetenceId>;
}

const cache = new WeakMap<Referentiels, EngineIndex>();

export function buildIndex(ref: Referentiels): EngineIndex {
  const cached = cache.get(ref);
  if (cached) return cached;

  const metierIds = ref.metiers.map((m) => m.id).sort();
  const statut = new Map<MetierId, Map<CompetenceId, SignatureStatut>>();
  const metiersParCompetence = new Map<CompetenceId, MetierId[]>();
  for (const m of ref.metiers) {
    statut.set(m.id, new Map(m.signature.map((e) => [e.competenceId, e.statut])));
  }
  for (const id of metierIds) {
    for (const competenceId of statut.get(id)!.keys()) {
      const list = metiersParCompetence.get(competenceId) ?? [];
      list.push(id);
      metiersParCompetence.set(competenceId, list);
    }
  }

  const index: EngineIndex = {
    ref,
    competences: new Map(ref.competences.map((c) => [c.id, c])),
    metiers: new Map(ref.metiers.map((m) => [m.id, m])),
    metierIds,
    statut,
    metiersParCompetence,
    transverses: new Set(Object.keys(ref.config.competencesTransverses)),
  };
  cache.set(ref, index);
  return index;
}

export function statutDans(index: EngineIndex, metierId: MetierId, competenceId: CompetenceId): SignatureStatut | undefined {
  return index.statut.get(metierId)?.get(competenceId);
}
