import type { IntituleMarche, MetierId, Referentiels, Sourcing } from '../types';
import { ReferentielError } from './errors';
import { normalize } from './text';

function getMetier(metierId: MetierId, ref: Referentiels) {
  const metier = ref.metiers.find((m) => m.id === metierId);
  if (!metier) throw new ReferentielError(`Métier inconnu : ${metierId}`);
  return metier;
}

/** Stratégie de sourcing du métier, ou null si le référentiel n'en contient pas. */
export function getSourcing(metierId: MetierId, ref: Referentiels): Sourcing | null {
  getMetier(metierId, ref);
  return ref.sourcing.find((s) => s.metierId === metierId) ?? null;
}

/** Intitulés observés sur le marché (corpus de fiches de poste), regroupés avec leurs entreprises. */
export function getIntitulesMarche(metierId: MetierId, ref: Referentiels): IntituleMarche[] {
  const groupes = new Map<string, IntituleMarche>();
  for (const fiche of getMetier(metierId, ref).fichesMarche) {
    const key = normalize(fiche.intitule);
    const groupe = groupes.get(key);
    if (groupe) {
      if (!groupe.entreprises.includes(fiche.entreprise)) groupe.entreprises.push(fiche.entreprise);
    } else {
      groupes.set(key, { intitule: fiche.intitule, entreprises: [fiche.entreprise] });
    }
  }
  return [...groupes.values()];
}
