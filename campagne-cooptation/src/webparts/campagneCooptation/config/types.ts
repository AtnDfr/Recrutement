/**
 * Forme de la configuration. Les valeurs sont dans campagne.config.ts.
 */

/** Type SharePoint d'une colonne, tel que le moteur doit la lire. */
export type TypeColonne = 'texte' | 'personne' | 'choixMultiple' | 'booleen';

export interface ColonneSource {
  /** Clé logique utilisée dans l'application (règles, affichage). */
  cle: string;
  /** Libellé affiché à l'utilisateur. */
  libelle: string;
  /** Nom INTERNE SharePoint (ex. "Type_x0020_Entretien"), pas le nom affiché. */
  nomInterne: string;
  type: TypeColonne;
  /** Afficher la colonne dans la liste des destinataires. */
  afficher: boolean;
}

export type Operateur = 'egal' | 'contient' | 'nonVide';

/**
 * Règle déclarative d'un critère complémentaire.
 * - egal : la valeur de la colonne est l'une des `valeurs` (insensible à la casse) ;
 * - contient : la valeur contient l'une des `valeurs` (insensible à la casse) ;
 * - nonVide : la colonne est renseignée.
 */
export interface RegleCritere {
  /** Clé logique d'une colonne déclarée dans `colonnes`. */
  colonne: string;
  operateur: Operateur;
  valeurs?: string[];
}

export interface CritereComplementaire {
  id: string;
  libelle: string;
  /**
   * Critères d'un même groupe : combinés en OU (ex. Maker OU Non-maker).
   * Groupes différents, ou critères sans groupe : combinés en ET.
   */
  groupe?: string;
  /** null tant que la règle métier n'est pas connue : le critère est affiché mais inactif. */
  regle: RegleCritere | null;
}

export interface ConfigCampagne {
  /** Site qui porte les deux listes. */
  siteUrl: string;
  listeActeurs: {
    /** Titre (nom affiché) de la liste source. */
    titre: string;
    /** Nom interne de la colonne Person des collaborateurs. Nom, email = sous-champs Title et EMail. */
    colonnePersonne: string;
    /** Nom interne de la colonne Grade. Le ciblage par grade utilise CETTE colonne, jamais JobTitle. */
    colonneGrade: string;
  };
  /** Autres colonnes lues : critères complémentaires et affichage. */
  colonnes: ColonneSource[];
  /** Grades proposés au ciblage, dans l'ordre d'affichage. Libellés identiques aux valeurs de la colonne Grade. */
  grades: string[];
  criteresComplementaires: CritereComplementaire[];
  /**
   * Clé logique de la colonne Person « CDM ». Sert à deux filtres explicites :
   * « Est CDM » (l'email du collaborateur figure dans cette colonne pour au moins une ligne)
   * et « Collaborateurs de… » (le CDM du collaborateur fait partie des CDM choisis).
   */
  colonneCdm: string;
  listeCampagnes: {
    titre: string;
    /** Noms internes des colonnes de la liste « Campagnes cooptation ». */
    champs: {
      titre: string;
      payload: string;
      nombreDestinataires: string;
      criteres: string;
      statut: string;
    };
    /** Valeur de Statut à la création : c'est elle que le flow attend. */
    statutInitial: string;
  };
  /**
   * Adresse du modèle unique de carte Teams (fichier JSON dans une bibliothèque du site).
   * Il est lu à l'exécution : le remplacer change la carte sans redéployer la web part.
   */
  urlModeleCarte: string;
  /** Taille maximale du JSON transmis (colonne texte multiligne). */
  tailleMaxPayload: number;
  /** Limites de saisie du contenu de la carte. */
  limites: { titre: number; ctaLibelle: number };
}
