// Modèle des référentiels chargés depuis src/data/.

export type CompetenceId = string; // format « C001 »
export type MetierId = string; // slug stable dérivé du nom de profil
export type GradeId = 'analyste' | 'consultant' | 'consultant-senior' | 'manager' | 'senior-manager';

export type CompetenceType = 'Capacité' | 'Technologie' | 'Méthode' | 'Livrable' | 'Écosystème';
export type SignatureStatut = 'Core' | 'Récurrente' | 'Spécialisante';
export type Confiance = 'Forte' | 'Moyenne' | 'Prudente';

export const AXES_TRANSVERSES = [
  'gestion-projet',
  'leadership',
  'management',
  'relation-client',
  'developpement-commercial',
] as const;
export type AxeTransverse = (typeof AXES_TRANSVERSES)[number];

export interface Competence {
  id: CompetenceId;
  nom: string;
  bloc: string;
  type: CompetenceType;
  synonymes: string[];
  etudes: string[];
  statutReferentiel: string;
}

/** Une forme textuelle ; plusieurs IDs = synonyme ambigu. */
export interface Synonyme {
  forme: string;
  competenceIds: CompetenceId[];
}

export interface SignatureEntry {
  competenceId: CompetenceId;
  statut: SignatureStatut;
  occurrences: number;
  base: number;
}

export interface FicheMarche {
  entreprise: string;
  intitule: string;
}

export interface Metier {
  id: MetierId;
  nom: string;
  signature: SignatureEntry[];
  fichesMarche: FicheMarche[];
}

export interface Vivier {
  libelle: string;
  nb: number;
  part: number;
}

export interface Sourcing {
  metierId: MetierId;
  nbEmployeurs: number;
  vivierCoeur: Vivier;
  vivierSecondaire: Vivier | null;
  entreprisesCoeur: string[];
  entreprisesSecondaires: string[];
  approche: string;
  pointsAVerifier: string[];
  confiance: Confiance;
}

export interface AxeDefinition {
  id: AxeTransverse;
  libelle: string;
}

export interface Grade {
  id: GradeId;
  libelle: string;
  ordre: number;
  /** Niveau attendu par axe transverse, sur l'échelle du référentiel. */
  niveaux: Record<AxeTransverse, number>;
}

export interface ReferentielGrades {
  source: string;
  echelle: { min: number; max: number };
  axes: AxeDefinition[];
  grades: Grade[];
}

export interface EngineConfig {
  plafondMetiers: number;
  /**
   * Compétences non déclenchantes (elles ne justifient jamais seules l'ajout d'un métier),
   * rattachées à l'axe transverse du grade qui les porte.
   */
  competencesTransverses: Record<CompetenceId, AxeTransverse>;
  poidsStatut: Record<SignatureStatut, number>;
  /**
   * Formes du référentiel dont le rattachement peut changer le sens métier : la normalisation
   * les signale « à confirmer » au lieu de les appliquer. Clé = forme, valeur = raison.
   */
  formesAConfirmer: Record<string, string>;
}

export interface Referentiels {
  competences: Competence[];
  synonymes: Synonyme[];
  metiers: Metier[];
  sourcing: Sourcing[];
  grades: ReferentielGrades;
  config: EngineConfig;
}
