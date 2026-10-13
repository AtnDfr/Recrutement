import type { CompetenceId } from './referentiels';

/** Comment une formulation a été rattachée au référentiel. */
export type ModeCorrespondance = 'identifiant' | 'nom-canonique' | 'synonyme';

export interface Correspondance {
  competenceId: CompetenceId;
  via: ModeCorrespondance;
  /** Forme du référentiel qui a permis le rattachement. */
  formeReferentiel: string;
}

interface TermeBase {
  /** Fragment normalisé, tel que saisi (conservé pour la traçabilité). */
  original: string;
  /** Saisie complète dont provient le fragment (identique à `original` sans découpage). */
  saisie: string;
}

export interface TermeReconnu extends TermeBase, Correspondance {
  statut: 'reconnu';
  /**
   * Autres compétences partageant la même forme, écartées parce que le nom canonique prime
   * sur un synonyme (ex. « Monitoring » : C059, et non Observabilité). Vide en général.
   */
  concurrents: Correspondance[];
}

/** Forme qui exprime réellement plusieurs compétences (ex. « Spark SQL » → Spark + SQL). */
export interface TermeCompose extends TermeBase {
  statut: 'compose';
  composantes: Correspondance[];
}

/** Formulation rattachée à plusieurs compétences : jamais résolue automatiquement. */
export interface TermeAmbigu extends TermeBase {
  statut: 'ambigu';
  candidats: Correspondance[];
}

/** Formulation reconnue, mais dont le rattachement peut changer le sens : jamais appliquée automatiquement. */
export interface TermeAConfirmer extends TermeBase {
  statut: 'a-confirmer';
  candidats: Correspondance[];
  raison: string;
}

/** Formulation absente du référentiel : signalée, jamais rapprochée d'une compétence voisine. */
export interface TermeNonReconnu extends TermeBase {
  statut: 'non-reconnu';
}

export type TermeNormalise = TermeReconnu | TermeCompose | TermeAmbigu | TermeAConfirmer | TermeNonReconnu;

export interface ResultatNormalisation {
  /** Une entrée par fragment non vide, dans l'ordre de saisie. */
  termes: TermeNormalise[];
  /** Compétences sûres (reconnues ou composées), dédoublonnées, dans l'ordre de saisie. */
  competenceIds: CompetenceId[];
  composes: TermeCompose[];
  ambigus: TermeAmbigu[];
  aConfirmer: TermeAConfirmer[];
  nonReconnus: TermeNonReconnu[];
}

/** Occurrence d'une forme du référentiel repérée dans un texte libre. */
export interface DetectionTexte {
  /** Extrait exact du texte original. */
  extrait: string;
  /** Position dans le texte original (indices de début inclus et de fin exclus). */
  debut: number;
  fin: number;
  candidats: Correspondance[];
  /** Plusieurs compétences possibles et forme non déclarée composée. */
  ambigu: boolean;
  /** Forme déclarée composée (config.formesComposees) : toutes les compétences sont visées. */
  compose: boolean;
  /** Raison si la forme est « à confirmer » (config.formesAConfirmer), sinon null. */
  aConfirmer: string | null;
  /** Forme de 4 caractères ou moins (ex. « ML », « TOM ») : risque élevé de faux positif. */
  formeCourte: boolean;
  /**
   * Détection sûre, injectée automatiquement dans le moteur : ni ambiguë, ni à confirmer, et,
   * pour une forme courte, écrite exactement avec la casse du référentiel (« SQL », pas « sql »).
   */
  sure: boolean;
  /** Compétences injectées si la détection est sûre (vide sinon). */
  competenceIds: CompetenceId[];
}
