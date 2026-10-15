/**
 * Conversion du contenu de l'éditeur (DOM d'une zone contentEditable) vers le markdown Teams.
 * Seuls gras, italique, listes, liens https et paragraphes sont conservés ; tout le reste devient du texte.
 *
 * Pur : ne dépend que d'une interface minimale de nœud DOM, testable sans navigateur.
 */

export interface NoeudDom {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<NoeudDom>;
  getAttribute?(nom: string): string | null;
}

const TEXTE = 3;
const ELEMENT = 1;
const BLOCS = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE'];
const LISTES = ['UL', 'OL'];

interface Marques {
  gras: boolean;
  italique: boolean;
}

export function domVersMarkdown(racine: NoeudDom): string {
  const blocs: string[] = [];
  let enCours = '';
  const vider = (): void => {
    pousserParagraphe(blocs, enCours);
    enCours = '';
  };

  for (const enfant of enfants(racine)) {
    const nom = enfant.nodeName.toUpperCase();
    if (enfant.nodeType === ELEMENT && LISTES.indexOf(nom) !== -1) {
      vider();
      const items = listeVersMarkdown(enfant, nom === 'OL');
      if (items !== '') blocs.push(items);
    } else if (enfant.nodeType === ELEMENT && BLOCS.indexOf(nom) !== -1) {
      vider();
      // Un bloc peut lui-même contenir une liste (cas fréquent des éditeurs).
      const interne = domVersMarkdown(enfant);
      if (interne !== '') blocs.push(interne);
    } else {
      enCours += enLigne(enfant, { gras: false, italique: false });
    }
  }
  vider();
  return blocs.join('\n\n');
}

function listeVersMarkdown(liste: NoeudDom, numerotee: boolean): string {
  const lignes: string[] = [];
  for (const item of enfants(liste)) {
    if (item.nodeName.toUpperCase() !== 'LI') continue;
    const texte = nettoyer(enLigne(item, { gras: false, italique: false })).replace(/\n+/g, ' ');
    if (texte !== '') lignes.push(`${numerotee ? `${lignes.length + 1}.` : '-'} ${texte}`);
  }
  return lignes.join('\n');
}

function enLigne(noeud: NoeudDom, marques: Marques): string {
  if (noeud.nodeType === TEXTE) return (noeud.textContent ?? '').replace(/ /g, ' ');
  if (noeud.nodeType !== ELEMENT) return '';
  const nom = noeud.nodeName.toUpperCase();
  if (nom === 'BR') return '\n';

  if ((nom === 'B' || nom === 'STRONG') && !marques.gras) {
    return entourer(contenu(noeud, { ...marques, gras: true }), '**');
  }
  if ((nom === 'I' || nom === 'EM') && !marques.italique) {
    return entourer(contenu(noeud, { ...marques, italique: true }), '_');
  }
  if (nom === 'A') {
    const texte = contenu(noeud, marques);
    const lien = (noeud.getAttribute?.('href') ?? '').trim();
    return lienValide(lien) && texte.trim() !== '' ? `[${texte.trim()}](${lien})` : texte;
  }
  if (LISTES.indexOf(nom) !== -1) return `\n${listeVersMarkdown(noeud, nom === 'OL')}\n`;
  if (BLOCS.indexOf(nom) !== -1 || nom === 'LI') return `\n${contenu(noeud, marques)}`;
  return contenu(noeud, marques);
}

function contenu(noeud: NoeudDom, marques: Marques): string {
  return enfants(noeud).map(e => enLigne(e, marques)).join('');
}

/** Place les espaces hors des marques : « **mot** » et jamais « ** mot ** », qui ne s'afficherait pas en gras. */
function entourer(texte: string, marque: string): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(texte);
  if (m === null || m[2] === '') return texte;
  return `${m[1]}${marque}${m[2]}${marque}${m[3]}`;
}

function pousserParagraphe(blocs: string[], texte: string): void {
  const propre = nettoyer(texte);
  if (propre !== '') blocs.push(propre);
}

function nettoyer(texte: string): string {
  return texte
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function lienValide(url: string): boolean {
  return /^https:\/\/[^\s/$.?#][^\s]*$/i.test(url.trim());
}

function enfants(noeud: NoeudDom): NoeudDom[] {
  return Array.prototype.slice.call(noeud.childNodes) as NoeudDom[];
}
