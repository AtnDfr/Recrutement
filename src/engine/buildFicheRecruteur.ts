import type {
  CompetenceAnalysee,
  DemandeInput,
  DetectionTexte,
  FicheRecruteur,
  IntituleMarche,
  MetierId,
  OrigineCompetence,
  Referentiels,
  ResultatNormalisation,
  Sourcing,
} from '../types';
import { computeCoverage } from './coverage';
import { getAttentesTransverses, getGrade, rattacherTransversesAuGrade } from './grade';
import { detecterDansTexte, normaliserTermes } from './normalisation';
import { getIntitulesMarche, getSourcing } from './sourcing';

/**
 * Compétences transmises au moteur, chacune avec sa source la plus prioritaire :
 * sélection explicite > nom canonique / identifiant > synonyme sûr (ou forme composée) > détection sûre.
 * Ambiguës, à confirmer et non reconnues ne sont jamais transmises.
 */
function rassembler(
  demande: DemandeInput,
  normalisation: ResultatNormalisation | null,
  detections: { texte: DetectionTexte[]; transcription: DetectionTexte[] },
): CompetenceAnalysee[] {
  const parId = new Map<string, CompetenceAnalysee>();
  const ajouter = (competenceId: string, origine: OrigineCompetence, formulation: string | null) => {
    if (!parId.has(competenceId)) parId.set(competenceId, { competenceId, origine, formulation });
  };

  for (const id of demande.competenceIds) ajouter(id, 'selection', null);
  const termes = normalisation?.termes ?? [];
  const passes: Array<[OrigineCompetence, (t: (typeof termes)[number]) => string[]]> = [
    ['terme-identifiant', (t) => (t.statut === 'reconnu' && t.via === 'identifiant' ? [t.competenceId] : [])],
    ['terme-nom-canonique', (t) => (t.statut === 'reconnu' && t.via === 'nom-canonique' ? [t.competenceId] : [])],
    ['terme-synonyme', (t) => (t.statut === 'reconnu' && t.via === 'synonyme' ? [t.competenceId] : [])],
    ['terme-compose', (t) => (t.statut === 'compose' ? t.composantes.map((c) => c.competenceId) : [])],
  ];
  for (const [origine, ids] of passes) for (const t of termes) for (const id of ids(t)) ajouter(id, origine, t.original);
  for (const source of ['texte', 'transcription'] as const) {
    for (const d of detections[source]) for (const id of d.competenceIds) ajouter(id, source, d.extrait);
  }
  return [...parId.values()];
}

/**
 * Assemble la fiche transmise au recruteur.
 * 1. Normalisation des formulations libres et détection dans le texte / la transcription.
 * 2. Matching sur les compétences sûres, calculé sans le grade.
 * 3. Enrichissements : grade (attentes et transverses), sourcing, intitulés marché.
 */
export function buildFicheRecruteur(demande: DemandeInput, ref: Referentiels): FicheRecruteur {
  const grade = getGrade(demande.grade, ref);
  const normalisation = demande.termes?.length ? normaliserTermes(demande.termes, ref) : null;
  const detectionsTexte = {
    texte: demande.texte ? detecterDansTexte(demande.texte, ref) : [],
    transcription: demande.transcription ? detecterDansTexte(demande.transcription, ref) : [],
  };
  const competencesAnalysees = rassembler(demande, normalisation, detectionsTexte);
  const ids = competencesAnalysees.map((c) => c.competenceId);
  const resultat = computeCoverage(ids, ref);

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
    transverses: rattacherTransversesAuGrade(ids, resultat, grade.id, ref),
    normalisation,
    detectionsTexte,
    sourcingParMetier,
    intitulesMarche,
  };
}
