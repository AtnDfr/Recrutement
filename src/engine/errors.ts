/** Erreur levée quand une entrée référence une donnée absente des référentiels. */
export class ReferentielError extends Error {
  override name = 'ReferentielError';
}
