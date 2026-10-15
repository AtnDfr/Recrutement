import { ConfigCampagne, ColonneSource } from '../config/types';
import { Collaborateur } from './types';

/** Élément brut renvoyé par l'API REST SharePoint (odata=nometadata). */
export type ElementSharePoint = Record<string, unknown>;

interface PersonneSharePoint {
  Title?: unknown;
  EMail?: unknown;
}

/**
 * Paramètres de requête REST pour lire la liste source.
 * Les colonnes Person doivent être « expand » ; on n'en lit que Title et EMail.
 */
export function construireRequeteActeurs(config: ConfigCampagne, taillePage: number): string {
  const personne = config.listeActeurs.colonnePersonne;
  const select = ['Id', `${personne}/Title`, `${personne}/EMail`, config.listeActeurs.colonneGrade];
  const expand = [personne];
  for (const colonne of config.colonnes) {
    if (colonne.type === 'personne') {
      select.push(`${colonne.nomInterne}/Title`);
      expand.push(colonne.nomInterne);
    } else {
      select.push(colonne.nomInterne);
    }
  }
  return `$select=${unique(select).join(',')}&$expand=${unique(expand).join(',')}&$top=${taillePage}`;
}

/**
 * Transforme un élément de la liste en collaborateur(s).
 * Une colonne Person multiple produit un collaborateur par personne.
 */
export function versCollaborateurs(element: ElementSharePoint, config: ConfigCampagne): Collaborateur[] {
  const id = String(element.Id ?? '');
  const personnes = enTableau(element[config.listeActeurs.colonnePersonne]) as PersonneSharePoint[];
  const grade = texte(element[config.listeActeurs.colonneGrade]);
  const champs: Record<string, string | null> = {};
  for (const colonne of config.colonnes) {
    champs[colonne.cle] = lireValeur(element[colonne.nomInterne], colonne);
  }
  return personnes.map((personne, rang) => ({
    id: personnes.length > 1 ? `${id}-${rang}` : id,
    nom: texte(personne.Title) ?? '(sans nom)',
    email: texte(personne.EMail),
    grade,
    champs
  }));
}

export function lireValeur(brut: unknown, colonne: ColonneSource): string | null {
  if (brut === null || brut === undefined) return null;
  switch (colonne.type) {
    case 'personne':
      return joindre(enTableau(brut).map(p => texte((p as PersonneSharePoint).Title)));
    case 'choixMultiple':
      return joindre(enTableau(brut).map(texte));
    case 'booleen':
      return brut === true ? 'Oui' : brut === false ? 'Non' : texte(brut);
    case 'texte':
      return texte(brut);
  }
}

function enTableau(valeur: unknown): unknown[] {
  if (valeur === null || valeur === undefined) return [];
  return Array.isArray(valeur) ? valeur : [valeur];
}

function texte(valeur: unknown): string | null {
  if (typeof valeur !== 'string' && typeof valeur !== 'number') return null;
  const t = String(valeur).trim();
  return t === '' ? null : t;
}

function joindre(valeurs: (string | null)[]): string | null {
  const presentes = valeurs.filter((v): v is string => v !== null);
  return presentes.length > 0 ? presentes.join(', ') : null;
}

function unique(valeurs: string[]): string[] {
  return valeurs.filter((v, i) => valeurs.indexOf(v) === i);
}
