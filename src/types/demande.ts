import type {
  AxeTransverse,
  CompetenceId,
  GradeId,
  MetierId,
  SignatureStatut,
  Sourcing,
} from './referentiels';
import type { DetectionTexte, ResultatNormalisation } from './normalisation';

export interface DemandeInput {
  demandeur: string;
  /** Date ISO 8601. */
  date: string;
  grade: GradeId;
  /** Compétences sélectionnées directement dans le référentiel. */
  competenceIds: CompetenceId[];
  /** Formulations libres d'une compétence (une formulation par entrée), normalisées avant le moteur. */
  termes?: string[];
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

/** Critère du score qui a départagé la solution retenue d'une solution incluant le métier écarté. */
export type CritereDecisif =
  | 'couverture'
  | 'nombre-de-metiers'
  | 'qualite-des-statuts'
  | 'transverses-couvertes'
  | 'specialisation-non-demandee'
  | 'ordre-des-identifiants';

/** Explication d'un métier qui aurait couvert la compétence en Core mais n'a pas été retenu. */
export interface ArbitrageCouverture {
  competenceId: CompetenceId;
  /** Métier qui aurait permis de couvrir la compétence. */
  metierEcarte: MetierId;
  /** Métiers retenus qui perdraient tout apport Core propre si ce métier était ajouté. */
  metiersRendusRedondants: MetierId[];
  /** Compétences déclenchantes couvertes par la solution retenue. */
  couvertureRetenue: number;
  /** Meilleure combinaison valide (dans le plafond) qui inclut le métier écarté. */
  meilleureCombinaisonAvecEcarte: MetierId[];
  couvertureAvecEcarte: number;
  critereDecisif: CritereDecisif;
  /** Explication lisible, en français. */
  raison: string;
}

export interface Residuel {
  competenceId: CompetenceId;
  motif: MotifResiduel;
  /** Métiers non retenus qui contiennent la compétence dans leur signature (Core d'abord). */
  metiersCandidats: MetierId[];
  /** Présent uniquement pour le motif « arbitrage-couverture » : un arbitrage par métier écarté. */
  arbitrages?: ArbitrageCouverture[];
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

/**
 * Compétence transverse demandée. Sa dimension de séniorité est toujours portée par le grade
 * (axe et niveau attendu) ; quand un métier retenu l'a dans sa signature, elle figure aussi
 * dans la couverture de ce métier.
 */
export interface TransverseDemandee {
  competenceId: CompetenceId;
  axe: AxeTransverse;
  niveauAttendu: number;
  /** Métiers retenus dont la signature contient cette compétence. */
  metiersPorteurs: MetierId[];
  /** Vrai si aucun métier retenu ne la porte : seul le grade la porte. */
  renvoyeeAuGrade: boolean;
}

export interface IntituleMarche {
  intitule: string;
  entreprises: string[];
}

export interface FicheRecruteur {
  demande: DemandeInput;
  gradeLibelle: string;
  /** Compétences effectivement transmises au moteur (sélection directe + termes reconnus). */
  competencesAnalysees: CompetenceId[];
  resultat: ResultatCouverture;
  echelle: { min: number; max: number };
  attentesTransverses: AttenteTransverse[];
  transverses: TransverseDemandee[];
  /** Trace de normalisation des formulations libres (`demande.termes`), null si aucune. */
  normalisation: ResultatNormalisation | null;
  /** Compétences repérées dans le texte et la transcription : suggestions, jamais envoyées au moteur. */
  detectionsTexte: { texte: DetectionTexte[]; transcription: DetectionTexte[] };
  sourcingParMetier: Record<MetierId, Sourcing | null>;
  intitulesMarche: Record<MetierId, IntituleMarche[]>;
}
