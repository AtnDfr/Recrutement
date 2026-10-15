/**
 * DONNÉES FICTIVES — uniquement pour la démo navigable (demo/).
 * Ne sont jamais utilisées par la web part SharePoint.
 *
 * Les éléments ont la forme exacte des réponses REST SharePoint attendues par la configuration,
 * afin que la démo passe par le vrai mapping (core/mapping.ts).
 */
import { ConfigCampagne } from '../lib/webparts/campagneCooptation/config/types';
import { ElementSharePoint } from '../lib/webparts/campagneCooptation/core/mapping';

const PRENOMS = ['Camille', 'Hugo', 'Léa', 'Lucas', 'Chloé', 'Nathan', 'Inès', 'Théo', 'Manon', 'Louis', 'Sarah', 'Jules', 'Emma', 'Adam', 'Zoé', 'Malo', 'Lina', 'Noah', 'Jade', 'Arthur', 'Alice', 'Yanis', 'Rose', 'Sacha'];
const NOMS = ['MARTIN', 'BERNARD', 'DUBOIS', 'THOMAS', 'ROBERT', 'RICHARD', 'PETIT', 'DURAND', 'LEROY', 'MOREAU', 'SIMON', 'LAURENT', 'LEFEBVRE', 'MICHEL', 'GARCIA', 'DAVID', 'BERTRAND', 'ROUX', 'VINCENT', 'FOURNIER', 'MOREL', 'GIRARD', 'ANDRE', 'MERCIER'];

/** Répartition proche de la liste réelle (effectifs par grade). */
const REPARTITION: [string, number][] = [
  ['Consultant', 58], ['Senior Consultant', 34], ['Manager', 11], ['Senior Manager', 4],
  ['Analyst', 3], ['Consulting Apprentice', 2], ['Associate Partner', 2], ['Partner', 2],
  ['CS - Consulting', 1], ['Account Director', 1]
];
const GRADES_CDM = ['Manager', 'Senior Manager', 'Associate Partner', 'Partner'];
const STATUTS = ['Non embarqué', 'Non embarqué', 'Non embarqué', 'Actif', 'Stand-by', 'En formation', 'Back-up', 'Actif'];
const TYPES = [null, null, null, null, 'CS (maker)', 'CS (non maker)', 'M&S (strat)', 'Interv 1 (strat)', 'M&S (maker)', 'Interv 1 (maker)', 'Interviewer 1'];

interface PersonneDemo {
  id: number;
  grade: string;
  nom: string;
  email: string;
}

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function elementsDemo(config: ConfigCampagne): ElementSharePoint[] {
  const personnes: PersonneDemo[] = [];
  let id = 1;
  for (const [grade, nombre] of REPARTITION) {
    for (let i = 0; i < nombre; i++, id++) {
      const prenom = PRENOMS[(id * 7) % PRENOMS.length];
      const nom = NOMS[(id * 11) % NOMS.length];
      personnes.push({ id, grade, nom: `${nom} ${prenom}`, email: sansAccents(`${prenom}.${nom}${id}@exemple.com`).toLowerCase() });
    }
  }

  // Les CDM sont des managers et associés de la liste, plus deux CDM qui n'y figurent pas.
  const cdms = personnes
    .filter(p => GRADES_CDM.indexOf(p.grade) !== -1)
    .slice(0, 9)
    .map(p => ({ Title: p.nom, EMail: p.email }))
    .concat([{ Title: 'EXTERNE Paul', EMail: 'paul.externe@exemple.com' }, { Title: 'EXTERNE Anne', EMail: 'anne.externe@exemple.com' }]);

  return personnes.map(p => {
    const element: ElementSharePoint = {
      Id: p.id,
      [config.listeActeurs.colonnePersonne]: { Title: p.nom, EMail: p.id === 17 ? '' : p.email },
      [config.listeActeurs.colonneGrade]: p.grade
    };
    for (const colonne of config.colonnes) {
      if (colonne.cle === config.colonneCdm) {
        const cdm = cdms[p.id % cdms.length];
        element[colonne.nomInterne] = cdm.EMail === p.email ? cdms[(p.id + 1) % cdms.length] : cdm;
      } else if (colonne.cle === 'statut') {
        element[colonne.nomInterne] = STATUTS[p.id % STATUTS.length];
      } else if (colonne.cle === 'typeEntretien') {
        element[colonne.nomInterne] = TYPES[(p.id * 3) % TYPES.length];
      } else {
        element[colonne.nomInterne] = null;
      }
    }
    return element;
  });
}
