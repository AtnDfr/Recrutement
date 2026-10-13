/**
 * Référentiel FICTIF, réduit, construit uniquement pour les tests unitaires du moteur.
 * Aucune de ces données ne provient du marché ni des référentiels réels.
 *
 *   M-A : Core X01 X02 X03 · Récurrente X04 · Récurrente X90 (transverse)
 *   M-B : Core X05 X06 X01
 *   M-C : Core X01 X02 X07 · Récurrente X12   (recouvre M-A sur X01/X02)
 *   M-D : Core X09 X10 · Spécialisante X08
 *   M-E : Core X11 X01 X91 (transverse)
 *   M-F : Core X20 X21 · Récurrente X23 X24
 *   M-G : Core X20 X21 X22           (recouvre M-F : arbitrage de couverture)
 *   X99 : dans aucune signature.  X90, X91 : compétences transverses.
 */
import type {
  Competence,
  CompetenceType,
  EngineConfig,
  Metier,
  Referentiels,
  SignatureEntry,
  SignatureStatut,
} from '../../types';

const comp = (id: string, type: CompetenceType = 'Capacité'): Competence => ({
  id,
  nom: `Compétence fictive ${id}`,
  bloc: 'Bloc fictif',
  type,
  synonymes: [],
  etudes: [],
  statutReferentiel: 'fixture',
});

const sig = (entries: Array<[string, SignatureStatut]>): SignatureEntry[] =>
  entries.map(([competenceId, statut]) => ({
    competenceId,
    statut,
    occurrences: statut === 'Core' ? 3 : statut === 'Récurrente' ? 2 : 1,
    base: 5,
  }));

const metier = (id: string, entries: Array<[string, SignatureStatut]>): Metier => ({
  id,
  nom: `Métier fictif ${id}`,
  signature: sig(entries),
  fichesMarche: [
    { entreprise: 'Entreprise fictive 1', intitule: `Intitulé fictif ${id}` },
    { entreprise: 'Entreprise fictive 2', intitule: `intitulé  fictif ${id}` },
    { entreprise: 'Entreprise fictive 3', intitule: `Autre intitulé ${id}` },
  ],
});

export const DEFAULT_CONFIG: EngineConfig = {
  plafondMetiers: 3,
  poidsStatut: { Core: 3, Récurrente: 2, Spécialisante: 1 },
  competencesTransverses: { X90: 'relation-client', X91: 'management' },
  formesAConfirmer: {},
  formesComposees: {},
};

export function miniReferentiel(config: Partial<EngineConfig> = {}): Referentiels {
  return {
    competences: [
      ...['X01', 'X02', 'X03', 'X04', 'X05', 'X06', 'X07', 'X08', 'X09', 'X10', 'X11', 'X12', 'X20', 'X21', 'X22', 'X23', 'X24', 'X99', 'X90', 'X91'].map((id) =>
        comp(id),
      ),
    ],
    synonymes: [],
    metiers: [
      metier('m-a', [
        ['X01', 'Core'],
        ['X02', 'Core'],
        ['X03', 'Core'],
        ['X04', 'Récurrente'],
        ['X90', 'Récurrente'],
      ]),
      metier('m-b', [
        ['X05', 'Core'],
        ['X06', 'Core'],
        ['X01', 'Core'],
      ]),
      metier('m-c', [
        ['X01', 'Core'],
        ['X02', 'Core'],
        ['X07', 'Core'],
        ['X12', 'Récurrente'],
      ]),
      metier('m-d', [
        ['X09', 'Core'],
        ['X10', 'Core'],
        ['X08', 'Spécialisante'],
      ]),
      metier('m-e', [
        ['X11', 'Core'],
        ['X01', 'Core'],
        ['X91', 'Core'],
      ]),
      metier('m-f', [
        ['X20', 'Core'],
        ['X21', 'Core'],
        ['X23', 'Récurrente'],
        ['X24', 'Récurrente'],
      ]),
      metier('m-g', [
        ['X20', 'Core'],
        ['X21', 'Core'],
        ['X22', 'Core'],
      ]),
    ],
    sourcing: [
      {
        metierId: 'm-a',
        nbEmployeurs: 5,
        vivierCoeur: { libelle: 'Vivier fictif cœur', nb: 4, part: 0.8 },
        vivierSecondaire: null,
        entreprisesCoeur: ['Entreprise fictive 1'],
        entreprisesSecondaires: [],
        approche: 'Approche fictive',
        pointsAVerifier: ['Point fictif'],
        confiance: 'Forte',
      },
    ],
    grades: {
      source: 'fixture',
      echelle: { min: 1, max: 5 },
      axes: [
        { id: 'gestion-projet', libelle: 'Gestion de projet' },
        { id: 'leadership', libelle: 'Leadership' },
        { id: 'management', libelle: 'Management' },
        { id: 'relation-client', libelle: 'Relation client' },
        { id: 'developpement-commercial', libelle: 'Développement commercial' },
      ],
      grades: [
        {
          id: 'analyste',
          libelle: 'Analyste',
          ordre: 1,
          niveaux: { 'gestion-projet': 1, leadership: 1, management: 1, 'relation-client': 2, 'developpement-commercial': 1 },
        },
        {
          id: 'manager',
          libelle: 'Manager',
          ordre: 4,
          niveaux: { 'gestion-projet': 5, leadership: 4, management: 4, 'relation-client': 5, 'developpement-commercial': 4 },
        },
      ],
    },
    config: { ...DEFAULT_CONFIG, ...config },
  };
}
