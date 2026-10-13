import type { CompetenceId } from './referentiels';

/** Comment une formulation a été rattachée au référentiel. */
export type ModeCorrespondance = 'identifiant' | 'nom-canonique' | 'synonyme';

export interface Correspondance {
  competenceId: CompetenceId;
  via: ModeCorrespondance;
  /** Forme du référentiel qui a permis le rattachement. */
  formeReferentiel: string;
}

export interface TermeReconnu extends Correspondance {
  statut: 'reconnu';
  /** Formulation telle que saisie, conservée pour la traçabilité. */
  original: string;
}

/** Formulation rattachée à plusieurs compétences : jamais résolue automatiquement. */
export interface TermeAmbigu {
  statut: 'ambigu';
  original: string;
  candidats: Correspondance[];
}

/** Formulation reconnue, mais dont le rattachement peut changer le sens : jamais appliquée automatiquement. */
export interface TermeAConfirmer {
  statut: 'a-confirmer';
  original: string;
  candidats: Correspondance[];
  raison: string;
}

/** Formulation absente du référentiel : signalée, jamais rapprochée d'une compétence voisine. */
export interface TermeNonReconnu {
  statut: 'non-reconnu';
  original: string;
}

export type TermeNormalise = TermeReconnu | TermeAmbigu | TermeAConfirmer | TermeNonReconnu;

export interface ResultatNormalisation {
  /** Une entrée par formulation saisie non vide, dans l'ordre de saisie. */
  termes: TermeNormalise[];
  /** Compétences canoniques reconnues sans ambiguïté, dédoublonnées, dans l'ordre de saisie. */
  competenceIds: CompetenceId[];
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
  ambigu: boolean;
  /** Raison si la forme est « à confirmer » (config.formesAConfirmer), sinon null. */
  aConfirmer: string | null;
  /** Forme de 4 caractères ou moins (ex. « run », « CV ») : risque élevé de faux positif. */
  formeCourte: boolean;
}
