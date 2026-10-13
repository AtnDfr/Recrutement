/**
 * Normalisation des formulations vers les compétences canoniques du référentiel.
 *
 * Règles :
 * - seules les formes présentes dans les référentiels sont utilisées : nom canonique, synonymes
 *   (onglet 1_Competences et dictionnaire 2_Synonymes) et identifiant (« C102 ») ;
 * - la correspondance est exacte après une mise en forme purement typographique (casse, accents,
 *   ligatures, apostrophes, tirets, espaces) : ni correspondance approchée, ni racinisation,
 *   ni correspondance partielle pour une formulation saisie ;
 * - une saisie est découpée sur « , », « ; » et les retours à la ligne, jamais sur « / », « + »,
 *   « & » ou « et » ; chaque fragment est normalisé indépendamment ;
 * - priorité : nom canonique > synonyme. Une formulation saisie qui est le nom canonique d'une
 *   compétence et le synonyme d'une autre est rattachée au nom canonique (concurrents tracés) ;
 * - une forme listée dans `config.formesComposees` vise toutes ses compétences (« Spark SQL ») ;
 * - les autres formes rattachées à plusieurs compétences sont ambiguës, jamais résolues ;
 * - une forme listée dans `config.formesAConfirmer` (rattachement susceptible de changer le sens
 *   métier) est signalée « à confirmer » et n'est jamais appliquée automatiquement ;
 * - une formulation inconnue est signalée telle quelle ;
 * - aucune compétence canonique n'est jamais créée ; la formulation d'origine est toujours conservée.
 */
import type {
  CompetenceId,
  Correspondance,
  DetectionTexte,
  Referentiels,
  ResultatNormalisation,
  TermeAConfirmer,
  TermeAmbigu,
  TermeCompose,
  TermeNonReconnu,
  TermeNormalise,
} from '../types';

/** Longueur (forme normalisée) en dessous de laquelle une détection dans un texte est jugée fragile. */
const LONGUEUR_FORME_COURTE = 4;

interface TexteIndexe {
  texte: string;
  /** Pour chaque caractère de `texte`, sa position dans la chaîne d'origine. */
  origine: number[];
}

/**
 * Mise en forme typographique qui conserve la correspondance avec la chaîne d'origine :
 * minuscules, sans accents, œ/æ développés, apostrophes et tirets unifiés, espaces réduits
 * et supprimés autour de « / ».
 */
function indexer(s: string): TexteIndexe {
  const chars: string[] = [];
  const origine: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let piece = s[i]!.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
    piece = piece.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’‘`´]/g, "'");
    piece = piece.replace(/[-‐‑‒–—_]/g, ' ').replace(/\s/g, ' ');
    for (const c of piece) {
      chars.push(c);
      origine.push(i);
    }
  }
  // Réduction des espaces : pas d'espace en tête, en double, ni autour de « / ».
  const texte: string[] = [];
  const orig: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    if (c === ' ') {
      const prev = texte[texte.length - 1];
      let j = i + 1;
      while (chars[j] === ' ') j++;
      const next = chars[j];
      if (prev === undefined || prev === ' ' || prev === '/' || next === undefined || next === '/') continue;
    }
    texte.push(c);
    orig.push(origine[i]!);
  }
  return { texte: texte.join(''), origine: orig };
}

/** Clé de correspondance d'une formulation. */
export function cleDeCorrespondance(s: string): string {
  return indexer(s.trim()).texte;
}

interface Dictionnaire {
  /** clé → correspondances (une par compétence). */
  formes: Map<string, Correspondance[]>;
  /** clé → graphies exactes des formes du référentiel (pour la casse des formes courtes). */
  graphies: Map<string, Set<string>>;
  /** Clés triées par longueur décroissante, pour la détection dans un texte. */
  clesParLongueur: string[];
  ids: Set<CompetenceId>;
  /** clé → raison, pour les formes à confirmer. */
  aConfirmer: Map<string, string>;
  /** clé → compétences visées, pour les formes composées. */
  composees: Map<string, CompetenceId[]>;
}

const cache = new WeakMap<Referentiels, Dictionnaire>();

function dictionnaire(ref: Referentiels): Dictionnaire {
  const cached = cache.get(ref);
  if (cached) return cached;

  const formes = new Map<string, Correspondance[]>();
  const graphies = new Map<string, Set<string>>();
  const ajouter = (forme: string, competenceId: CompetenceId, via: Correspondance['via']): void => {
    const cle = cleDeCorrespondance(forme);
    if (!cle) return;
    graphies.set(cle, (graphies.get(cle) ?? new Set()).add(forme.trim()));
    const liste = formes.get(cle) ?? [];
    const existante = liste.find((c) => c.competenceId === competenceId);
    // Pour une même compétence, le nom canonique prime sur un synonyme.
    if (!existante) liste.push({ competenceId, via, formeReferentiel: forme });
    else if (via === 'nom-canonique' && existante.via !== 'nom-canonique') {
      existante.via = via;
      existante.formeReferentiel = forme;
    }
    formes.set(cle, liste);
  };

  for (const c of ref.competences) ajouter(c.nom, c.id, 'nom-canonique');
  for (const c of ref.competences) for (const s of c.synonymes) ajouter(s, c.id, 'synonyme');
  for (const s of ref.synonymes) for (const id of s.competenceIds) ajouter(s.forme, id, 'synonyme');
  for (const liste of formes.values()) liste.sort((a, b) => a.competenceId.localeCompare(b.competenceId));

  const dico: Dictionnaire = {
    formes,
    graphies,
    clesParLongueur: [...formes.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b)),
    ids: new Set(ref.competences.map((c) => c.id)),
    aConfirmer: new Map(Object.entries(ref.config.formesAConfirmer).map(([f, r]) => [cleDeCorrespondance(f), r])),
    composees: new Map(Object.entries(ref.config.formesComposees).map(([f, ids]) => [cleDeCorrespondance(f), ids])),
  };
  cache.set(ref, dico);
  return dico;
}

const copie = (liste: readonly Correspondance[]): Correspondance[] => liste.map((c) => ({ ...c }));

/**
 * Normalise une formulation unique (sans découpage). Renvoie null pour une saisie vide.
 * `saisie` : saisie complète dont provient le fragment, pour la traçabilité.
 */
export function normaliserTerme(original: string, ref: Referentiels, saisie: string = original): TermeNormalise | null {
  const dico = dictionnaire(ref);
  const brut = original.trim();
  if (!brut) return null;

  const id = brut.toUpperCase();
  if (/^C\d{3}$/.test(id) && dico.ids.has(id)) {
    return { statut: 'reconnu', original, saisie, competenceId: id, via: 'identifiant', formeReferentiel: id, concurrents: [] };
  }

  const cle = cleDeCorrespondance(brut);
  const candidats = dico.formes.get(cle);
  if (!candidats) return { statut: 'non-reconnu', original, saisie };

  const raison = dico.aConfirmer.get(cle);
  if (raison) return { statut: 'a-confirmer', original, saisie, candidats: copie(candidats), raison };

  const composantes = dico.composees.get(cle);
  if (composantes) {
    return { statut: 'compose', original, saisie, composantes: copie(candidats.filter((c) => composantes.includes(c.competenceId))) };
  }

  if (candidats.length === 1) return { statut: 'reconnu', original, saisie, ...candidats[0]!, concurrents: [] };

  // Nom canonique > synonyme : si la forme est le nom canonique d'une seule compétence, elle l'emporte.
  const canoniques = candidats.filter((c) => c.via === 'nom-canonique');
  if (canoniques.length === 1) {
    const [retenu] = canoniques;
    return {
      statut: 'reconnu',
      original,
      saisie,
      ...retenu!,
      concurrents: copie(candidats.filter((c) => c !== retenu)),
    };
  }
  return { statut: 'ambigu', original, saisie, candidats: copie(candidats) };
}

/** Séparateurs de saisie. « / », « + », « & » et « et » n'en sont pas : ils font partie de compétences. */
const SEPARATEURS = /[,;\r\n]+/;

/**
 * Normalise des saisies libres : chaque saisie est découpée sur « , », « ; » et les retours à la
 * ligne, puis chaque fragment est normalisé indépendamment. Seules les compétences sûres
 * (reconnues ou composées) sont destinées au moteur.
 */
export function normaliserTermes(saisies: readonly string[], ref: Referentiels): ResultatNormalisation {
  const termes = saisies
    .flatMap((saisie) => saisie.split(SEPARATEURS).map((fragment) => normaliserTerme(fragment.trim(), ref, saisie)))
    .filter((t): t is TermeNormalise => t !== null);
  const competenceIds: CompetenceId[] = [];
  const ajouter = (id: CompetenceId) => {
    if (!competenceIds.includes(id)) competenceIds.push(id);
  };
  for (const t of termes) {
    if (t.statut === 'reconnu') ajouter(t.competenceId);
    if (t.statut === 'compose') t.composantes.forEach((c) => ajouter(c.competenceId));
  }
  return {
    termes,
    competenceIds,
    composes: termes.filter((t): t is TermeCompose => t.statut === 'compose'),
    ambigus: termes.filter((t): t is TermeAmbigu => t.statut === 'ambigu'),
    aConfirmer: termes.filter((t): t is TermeAConfirmer => t.statut === 'a-confirmer'),
    nonReconnus: termes.filter((t): t is TermeNonReconnu => t.statut === 'non-reconnu'),
  };
}

const LETTRE_OU_CHIFFRE = /[\p{L}\p{N}]/u;

/**
 * Repère dans un texte libre les formes du référentiel (mots entiers, la plus longue d'abord,
 * sans chevauchement) et qualifie chaque détection. Seules les détections `sure` sont
 * destinées au moteur. Ici, nom canonique et synonyme ne se départagent pas : une forme
 * partagée reste ambiguë.
 */
export function detecterDansTexte(texte: string, ref: Referentiels): DetectionTexte[] {
  const dico = dictionnaire(ref);
  const { texte: norm, origine } = indexer(texte);
  const occupe = new Array<boolean>(norm.length).fill(false);
  const detections: DetectionTexte[] = [];

  for (const cle of dico.clesParLongueur) {
    let from = 0;
    while (true) {
      const pos = norm.indexOf(cle, from);
      if (pos === -1) break;
      from = pos + 1;
      const end = pos + cle.length;
      const avant = norm[pos - 1];
      const apres = norm[end];
      if ((avant && LETTRE_OU_CHIFFRE.test(avant)) || (apres && LETTRE_OU_CHIFFRE.test(apres))) continue;
      if (occupe.slice(pos, end).some(Boolean)) continue;
      occupe.fill(true, pos, end);

      const debut = origine[pos]!;
      const fin = origine[end - 1]! + 1;
      const extrait = texte.slice(debut, fin);
      const candidats = copie(dico.formes.get(cle)!);
      const composantes = dico.composees.get(cle);
      const compose = composantes !== undefined;
      const ambigu = candidats.length > 1 && !compose;
      const aConfirmer = dico.aConfirmer.get(cle) ?? null;
      const formeCourte = cle.length <= LONGUEUR_FORME_COURTE;
      const casseExacte = dico.graphies.get(cle)!.has(extrait);
      const sure = !ambigu && aConfirmer === null && (!formeCourte || casseExacte);
      detections.push({
        extrait,
        debut,
        fin,
        candidats,
        ambigu,
        compose,
        aConfirmer,
        formeCourte,
        sure,
        competenceIds: sure ? (composantes ?? candidats.map((c) => c.competenceId)) : [],
      });
    }
  }
  return detections.sort((a, b) => a.debut - b.debut);
}
