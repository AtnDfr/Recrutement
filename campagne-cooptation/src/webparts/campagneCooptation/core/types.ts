/** Un collaborateur lu dans la liste SharePoint, normalisé. */
export interface Collaborateur {
  /** Identifiant stable : id de l'élément SharePoint (+ rang si la colonne Person est multiple). */
  id: string;
  nom: string;
  /** Acteurs.EMail tel que fourni par SharePoint. Jamais reconstruit. null si absent. */
  email: string | null;
  /** Valeur de la colonne Grade. */
  grade: string | null;
  /** Valeurs des colonnes configurées, par clé logique. */
  champs: Record<string, string | null>;
}

/** Choix de ciblage de l'utilisateur. */
export interface Criteres {
  grades: readonly string[];
  /** Identifiants des critères complémentaires cochés. */
  complementaires: readonly string[];
}

export interface ResultatCiblage {
  /** Collaborateurs correspondant aux critères, avant retraits manuels. */
  cibles: Collaborateur[];
  /** Destinataires finaux : avec email, non retirés, dédoublonnés par email. */
  destinataires: Collaborateur[];
  /** Ciblés mais sans email : jamais inclus. */
  sansEmail: Collaborateur[];
  /** Ciblés mais retirés manuellement. */
  retires: Collaborateur[];
  /** Nombre de lignes écartées car leur email figure déjà parmi les destinataires. */
  doublons: number;
}

/** Contrat transmis au flow Power Automate. */
export interface PayloadFlow {
  destinataires: string[];
  /** Message au format HTML accepté par Teams. */
  message: string;
}
