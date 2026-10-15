import { ConfigCampagne } from '../config/types';
import { filtrerCollaborateurs } from './filtres';
import { Collaborateur, Criteres, ResultatCiblage } from './types';

/** Clé de retrait manuel et de dédoublonnage : l'email en minuscules. */
export function cleEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Calcule les destinataires finaux.
 * Les retraits sont mémorisés par email : ils survivent à un changement de filtre.
 */
export function calculerCiblage(
  collaborateurs: readonly Collaborateur[],
  criteres: Criteres,
  retraits: readonly string[],
  config: ConfigCampagne
): ResultatCiblage {
  const cibles = filtrerCollaborateurs(collaborateurs, criteres, config);
  const retiresCles = retraits.map(cleEmail);
  const vus: string[] = [];
  const destinataires: Collaborateur[] = [];
  const sansEmail: Collaborateur[] = [];
  const retires: Collaborateur[] = [];
  let doublons = 0;

  for (const c of cibles) {
    if (c.email === null) {
      sansEmail.push(c);
      continue;
    }
    const cle = cleEmail(c.email);
    if (vus.indexOf(cle) !== -1) {
      doublons += 1;
      continue;
    }
    vus.push(cle);
    if (retiresCles.indexOf(cle) !== -1) retires.push(c);
    else destinataires.push(c);
  }

  return { cibles, destinataires, sansEmail, retires, doublons };
}

/** Recherche d'affichage (nom, email, grade, colonnes) : ne modifie pas la sélection. */
export function rechercher(collaborateurs: readonly Collaborateur[], terme: string): Collaborateur[] {
  const t = terme.trim().toLowerCase();
  if (t === '') return collaborateurs.slice();
  return collaborateurs.filter(c =>
    [c.nom, c.email, c.grade, ...Object.keys(c.champs).map(k => c.champs[k])]
      .some(v => v !== null && v !== undefined && v.toLowerCase().indexOf(t) !== -1)
  );
}
