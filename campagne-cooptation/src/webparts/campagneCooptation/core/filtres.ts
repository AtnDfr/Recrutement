import { ConfigCampagne, CritereComplementaire, RegleCritere } from '../config/types';
import { Collaborateur, Criteres } from './types';

/** Un critère sans règle connue ne peut pas être utilisé. */
export function critereActif(critere: CritereComplementaire): boolean {
  return critere.regle !== null;
}

/**
 * Ciblage :
 * - grades : OU entre les grades cochés ; aucun grade coché = personne (jamais « tout le monde ») ;
 * - critères complémentaires : ET entre eux, en plus du grade ;
 * - un critère coché mais sans règle (ou inconnu) est ignoré.
 */
export function filtrerCollaborateurs(
  collaborateurs: readonly Collaborateur[],
  criteres: Criteres,
  config: ConfigCampagne
): Collaborateur[] {
  if (criteres.grades.length === 0) return [];
  const grades = criteres.grades.map(normaliser);
  const regles = config.criteresComplementaires
    .filter(c => criteres.complementaires.indexOf(c.id) !== -1 && c.regle !== null)
    .map(c => c.regle as RegleCritere);

  return collaborateurs.filter(collaborateur =>
    collaborateur.grade !== null &&
    grades.indexOf(normaliser(collaborateur.grade)) !== -1 &&
    regles.every(regle => respecteRegle(collaborateur, regle))
  );
}

export function respecteRegle(collaborateur: Collaborateur, regle: RegleCritere): boolean {
  const valeur = collaborateur.champs[regle.colonne];
  if (valeur === null || valeur === undefined) return false;
  const v = normaliser(valeur);
  const attendues = (regle.valeurs ?? []).map(normaliser);
  switch (regle.operateur) {
    case 'nonVide':
      return v !== '';
    case 'egal':
      return attendues.indexOf(v) !== -1;
    case 'contient':
      return attendues.some(a => v.indexOf(a) !== -1);
  }
}

/** Nombre de collaborateurs par grade configuré (aide au ciblage). */
export function compterParGrade(collaborateurs: readonly Collaborateur[], grades: readonly string[]): Record<string, number> {
  const compte: Record<string, number> = {};
  for (const grade of grades) compte[grade] = 0;
  for (const c of collaborateurs) {
    if (c.grade === null) continue;
    const grade = grades.find(g => normaliser(g) === normaliser(c.grade as string));
    if (grade !== undefined) compte[grade] += 1;
  }
  return compte;
}

/** Valeurs de Grade présentes dans la liste mais absentes de la configuration (signalées, non ciblables). */
export function gradesNonConfigures(collaborateurs: readonly Collaborateur[], grades: readonly string[]): string[] {
  const connus = grades.map(normaliser);
  const autres: string[] = [];
  for (const c of collaborateurs) {
    if (c.grade !== null && connus.indexOf(normaliser(c.grade)) === -1 && autres.indexOf(c.grade) === -1) {
      autres.push(c.grade);
    }
  }
  return autres.sort();
}

export function normaliser(valeur: string): string {
  return valeur.trim().toLowerCase();
}
