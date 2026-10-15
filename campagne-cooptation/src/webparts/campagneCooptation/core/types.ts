/** Une personne lue dans une colonne Person SharePoint. */
export interface Personne {
  nom: string;
  /** null si SharePoint ne fournit pas d'email. */
  email: string | null;
}

/** Un collaborateur lu dans la liste SharePoint, normalisé. */
export interface Collaborateur {
  /** Identifiant stable : id de l'élément SharePoint (+ rang si la colonne Person est multiple). */
  id: string;
  nom: string;
  /** Acteurs.EMail tel que fourni par SharePoint. Jamais reconstruit. null si absent. */
  email: string | null;
  /** Valeur de la colonne Grade. */
  grade: string | null;
  /** Valeurs affichables des colonnes configurées, par clé logique. */
  champs: Record<string, string | null>;
  /** Personnes des colonnes de type Person (avec leur email), par clé logique. */
  personnes: Record<string, Personne[]>;
}

/** Choix de ciblage de l'utilisateur. */
export interface Criteres {
  grades: readonly string[];
  /** Identifiants des critères complémentaires cochés. */
  complementaires: readonly string[];
  /** Ne garder que les personnes qui sont CDM d'au moins un collaborateur. */
  estCdm: boolean;
  /** Emails des CDM choisis : ne garder que leurs collaborateurs. Vide = pas de filtre. */
  cdms: readonly string[];
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

/** Contenu métier de la campagne, saisi par l'utilisateur. */
export interface Contenu {
  titre: string;
  /** Markdown Teams : **gras**, _italique_, listes, [liens](https://…). */
  message: string;
  avecBouton: boolean;
  ctaLibelle: string;
  ctaUrl: string;
}

/** Contrat transmis au flow Power Automate. */
export interface PayloadFlow {
  destinataires: string[];
  titre: string;
  message: string;
  ctaLibelle: string | null;
  ctaUrl: string | null;
  /** Identifiant et version du modèle de carte utilisé (traçabilité). */
  modele: string;
  /** Adaptive Card finale : exactement celle affichée dans l'aperçu. Le flow la publie telle quelle. */
  carte: Record<string, unknown>;
}
