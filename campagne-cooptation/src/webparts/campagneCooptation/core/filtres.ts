import { ConfigCampagne, CritereComplementaire, RegleCritere } from '../config/types';
import { Collaborateur, Criteres } from './types';

/** Un critère sans règle connue ne peut pas être utilisé. */
export function critereActif(critere: CritereComplementaire): boolean {
  return critere.regle !== null;
}

/**
 * Ciblage :
 * - grades : OU entre les grades cochés ; aucun grade coché = personne (jamais « tout le monde ») ;
 * - critères complémentaires : OU à l'intérieur d'un groupe (Maker / Non-maker), ET entre groupes ;
 * - « Est CDM » : l'email du collaborateur figure dans la colonne CDM d'au moins une ligne ;
 * - « Collaborateurs de… » : le CDM du collaborateur fait partie des CDM choisis (par email) ;
 * - tout est combiné en ET avec le grade. Un critère sans règle (ou inconnu) est ignoré.
 */
export function filtrerCollaborateurs(
  collaborateurs: readonly Collaborateur[],
  criteres: Criteres,
  config: ConfigCampagne
): Collaborateur[] {
  if (criteres.grades.length === 0) return [];
  const grades = criteres.grades.map(normaliser);
  const groupes = groupesActifs(criteres, config);
  const emailsCdm = criteres.estCdm ? emailsDesCdm(collaborateurs, config) : [];
  const cdmsChoisis = criteres.cdms.map(normaliser);

  return collaborateurs.filter(c =>
    c.grade !== null &&
    grades.indexOf(normaliser(c.grade)) !== -1 &&
    groupes.every(regles => regles.some(regle => respecteRegle(c, regle))) &&
    (!criteres.estCdm || (c.email !== null && emailsCdm.indexOf(normaliser(c.email)) !== -1)) &&
    (cdmsChoisis.length === 0 || cdmsDe(c, config).some(email => cdmsChoisis.indexOf(email) !== -1))
  );
}

/** Règles cochées, regroupées : chaque élément est un groupe dont il suffit de respecter une règle. */
function groupesActifs(criteres: Criteres, config: ConfigCampagne): RegleCritere[][] {
  const parGroupe: Record<string, RegleCritere[]> = {};
  const groupes: RegleCritere[][] = [];
  for (const critere of config.criteresComplementaires) {
    if (critere.regle === null || criteres.complementaires.indexOf(critere.id) === -1) continue;
    const cle = critere.groupe ?? `__${critere.id}`;
    if (parGroupe[cle] === undefined) {
      parGroupe[cle] = [];
      groupes.push(parGroupe[cle]);
    }
    parGroupe[cle].push(critere.regle);
  }
  return groupes;
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

/** Emails (normalisés) des CDM d'un collaborateur. */
function cdmsDe(collaborateur: Collaborateur, config: ConfigCampagne): string[] {
  return (collaborateur.personnes[config.colonneCdm] ?? [])
    .filter(p => p.email !== null)
    .map(p => normaliser(p.email as string));
}

/** Emails (normalisés, sans doublon) de toutes les personnes citées comme CDM dans la liste. */
export function emailsDesCdm(collaborateurs: readonly Collaborateur[], config: ConfigCampagne): string[] {
  const emails: string[] = [];
  for (const c of collaborateurs) {
    for (const email of cdmsDe(c, config)) if (emails.indexOf(email) === -1) emails.push(email);
  }
  return emails;
}

export interface OptionCdm {
  email: string;
  nom: string;
  nbCollaborateurs: number;
}

/** CDM présents dans la liste, pour le sélecteur « Collaborateurs de… ». Triés par nom. */
export function optionsCdm(collaborateurs: readonly Collaborateur[], config: ConfigCampagne): OptionCdm[] {
  const options: OptionCdm[] = [];
  for (const c of collaborateurs) {
    for (const p of c.personnes[config.colonneCdm] ?? []) {
      if (p.email === null) continue;
      const email = normaliser(p.email);
      const existante = options.find(o => o.email === email);
      if (existante) existante.nbCollaborateurs += 1;
      else options.push({ email, nom: p.nom, nbCollaborateurs: 1 });
    }
  }
  return options.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
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

export function normaliser(valeur: string): string {
  return valeur.trim().toLowerCase();
}
