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
const STATUTS = ['Non embarqué', 'Non embarqué', 'Non embarqué', 'Actif', 'Stand-by', 'En formation', 'Back-up'];
const TYPES = [null, null, null, 'CS (maker)', 'CS (non maker)', 'M&S (strat)', 'Interv 1 (strat)'];

export function elementsDemo(config: ConfigCampagne): ElementSharePoint[] {
  const elements: ElementSharePoint[] = [];
  let id = 1;
  for (const [grade, nombre] of REPARTITION) {
    for (let i = 0; i < nombre; i++, id++) {
      const prenom = PRENOMS[(id * 7) % PRENOMS.length];
      const nom = NOMS[(id * 11) % NOMS.length];
      const sansEmail = id === 17;
      const element: ElementSharePoint = {
        Id: id,
        [config.listeActeurs.colonnePersonne]: {
          Title: `${nom} ${prenom}`,
          EMail: sansEmail ? '' : `${prenom}.${nom}${id}@exemple.com`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        },
        [config.listeActeurs.colonneGrade]: grade
      };
      for (const colonne of config.colonnes) {
        const valeur =
          colonne.cle === 'cdm' ? `${NOMS[(id * 3) % NOMS.length]} ${PRENOMS[(id * 5) % PRENOMS.length]}` :
          colonne.cle === 'statut' ? STATUTS[id % STATUTS.length] :
          colonne.cle === 'typeEntretien' ? TYPES[id % TYPES.length] :
          null;
        element[colonne.nomInterne] = colonne.type === 'personne' && valeur !== null ? { Title: valeur } : valeur;
      }
      elements.push(element);
    }
  }
  return elements;
}
