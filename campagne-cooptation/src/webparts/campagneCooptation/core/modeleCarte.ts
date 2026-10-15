/**
 * Modèle unique de carte Teams (Adaptive Card) : source de vérité pour l'aperçu ET pour l'envoi.
 *
 * Le modèle est un fichier JSON Adaptive Card qui utilise un sous-ensemble strict du langage de
 * templating officiel (il reste donc testable dans adaptivecards.microsoft.com/designer) :
 *   - "${variable}" dans n'importe quelle chaîne ;
 *   - "$when": "${variable}" sur un élément : l'élément n'est gardé que si la variable est renseignée.
 * La propriété racine "x-modele" (ex. "carte-cooptation@1") identifie le modèle et sa version ;
 * elle est retirée de la carte produite.
 *
 * L'application applique le modèle, affiche le résultat, et transmet CE résultat au flow.
 */

export type DonneesCarte = Record<string, string | null>;

export type ResultatModele =
  | { ok: true; carte: Record<string, unknown>; modele: string }
  | { ok: false; erreur: string };

const VARIABLE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const QUAND = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;
const VERSION_MAX = 1.5;

export function appliquerModele(modele: unknown, donnees: DonneesCarte): ResultatModele {
  try {
    if (!estObjet(modele)) throw new Error('le modèle n\'est pas un objet JSON');
    const nom = typeof modele['x-modele'] === 'string' ? modele['x-modele'] : 'sans-nom';
    const carte = transformer(modele, donnees) as Record<string, unknown>;
    delete carte['x-modele'];
    verifierCarte(carte);
    return { ok: true, carte, modele: nom };
  } catch (e) {
    return { ok: false, erreur: `Modèle de carte invalide : ${e instanceof Error ? e.message : String(e)}.` };
  }
}

function transformer(valeur: unknown, donnees: DonneesCarte): unknown {
  if (typeof valeur === 'string') {
    return valeur.replace(VARIABLE, (_, nom: string) => {
      if (!(nom in donnees)) throw new Error(`variable inconnue \${${nom}}`);
      return donnees[nom] ?? '';
    });
  }
  if (Array.isArray(valeur)) {
    return valeur.filter(v => garder(v, donnees)).map(v => transformer(v, donnees));
  }
  if (estObjet(valeur)) {
    const sortie: Record<string, unknown> = {};
    for (const cle of Object.keys(valeur)) {
      if (cle === '$when') continue;
      const enfant = valeur[cle];
      if (estObjet(enfant) && !garder(enfant, donnees)) continue;
      sortie[cle] = transformer(enfant, donnees);
    }
    return sortie;
  }
  return valeur;
}

function garder(valeur: unknown, donnees: DonneesCarte): boolean {
  if (!estObjet(valeur) || !('$when' in valeur)) return true;
  const quand = valeur.$when;
  const m = typeof quand === 'string' ? QUAND.exec(quand.trim()) : null;
  if (m === null) throw new Error(`"$when" accepte uniquement la forme "\${variable}" (reçu : ${JSON.stringify(quand)})`);
  if (!(m[1] in donnees)) throw new Error(`variable inconnue \${${m[1]}}`);
  const v = donnees[m[1]];
  return v !== null && v !== undefined && v.trim() !== '';
}

function verifierCarte(carte: Record<string, unknown>): void {
  if (carte.type !== 'AdaptiveCard') throw new Error('"type" doit valoir "AdaptiveCard"');
  const version = parseFloat(String(carte.version));
  if (!(version > 0 && version <= VERSION_MAX)) throw new Error(`"version" doit être comprise entre 1.0 et ${VERSION_MAX} (Teams)`);
  if (!Array.isArray(carte.body)) throw new Error('"body" doit être une liste');
}

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
