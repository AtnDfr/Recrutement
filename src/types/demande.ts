import type {
  AxeTransverse,
  CompetenceId,
  GradeId,
  MetierId,
  SignatureStatut,
  Sourcing,
} from './referentiels';

export interface DemandeInput {
  demandeur: string;
  /** Date ISO 8601. */
  date: string;
  grade: GradeId;
  competenceIds: CompetenceId[];
  texte?: string;
  transcription?: string;
}

export interface CouvertureItem {
  competenceId: CompetenceId;
  statut: SignatureStatut;
}

export interface MetierRetenu {
  metierId: MetierId;
  /** 1 = premier métier de la couverture progressive. */
  rang: number;
  /** Compétences demandées couvertes pour la première fois par ce métier. */
  nouvelles: CouvertureItem[];
  /** Compétences demandées déjà couvertes par un métier précédent, présentes aussi dans cette signature. */
  partagees: CouvertureItem[];
  /** Compétences déclenchantes en Core qu'aucun autre métier retenu ne couvre : la justification du métier. */
  apportCoreUnique: CompetenceId[];
  /** Métiers interchangeables à ce rang (même score). */
  alternatives: MetierId[];
}

export type MotifResiduel =
  /** Présente dans aucune signature métier. */
  | 'hors-signatures'
  /** Compétence transverse non couverte : renvoyée aux attentes du grade. */
  | 'transverse-vers-grade'
  /** Seuls des métiers non retenus la portent, et jamais en Core : pas de couverture significative. */
  | 'non-core-uniquement'
  /** Un métier la porterait en Core, mais le plafond de métiers est atteint. */
  | 'plafond-atteint'
  /** Un métier la porterait en Core, mais l'ajouter ferait perdre plus de couverture qu'il n'en apporte. */
  | 'arbitrage-couverture';

export interface Residuel {
  competenceId: CompetenceId;
  motif: MotifResiduel;
  /** Métiers non retenus qui contiennent la compétence dans leur signature. */
  metiersCandidats: MetierId[];
}

export interface ResultatCouverture {
  metiers: MetierRetenu[];
  residuels: Residuel[];
  /** Part des compétences demandées couvertes par les métiers retenus (0 à 1 ; 0 si rien n'est demandé). */
  tauxCouverture: number;
  /** Vrai si une autre combinaison obtient exactement le même score. */
  ambigu: boolean;
}

export interface AttenteTransverse {
  axe: AxeTransverse;
  libelle: string;
  niveau: number;
}

/** Compétence transverse demandée et non couverte par un métier : portée par le grade. */
export interface TransverseRenvoyee {
  competenceId: CompetenceId;
  axe: AxeTransverse;
  niveauAttendu: number;
}

export interface IntituleMarche {
  intitule: string;
  entreprises: string[];
}

export interface FicheRecruteur {
  demande: DemandeInput;
  gradeLibelle: string;
  resultat: ResultatCouverture;
  echelle: { min: number; max: number };
  attentesTransverses: AttenteTransverse[];
  transversesRenvoyees: TransverseRenvoyee[];
  sourcingParMetier: Record<MetierId, Sourcing | null>;
  intitulesMarche: Record<MetierId, IntituleMarche[]>;
}
