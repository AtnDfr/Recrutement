/**
 * Mise en forme légère du message, convertie en HTML compatible Teams.
 *
 * Syntaxe acceptée (volontairement réduite) :
 *   **gras**   *italique*   [texte](https://lien)
 *   - élément de liste à puces
 *   1. élément de liste numérotée
 *   ligne vide = nouveau paragraphe ; retour à la ligne = saut de ligne
 *
 * Le texte est échappé AVANT toute transformation : aucun HTML saisi n'est interprété.
 */

export function messageVide(source: string): boolean {
  return source.trim() === '';
}

export function versHtmlTeams(source: string): string {
  const lignes = source.replace(/\r\n?/g, '\n').split('\n');
  const blocs: string[] = [];
  let paragraphe: string[] = [];
  let liste: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const fermerParagraphe = (): void => {
    if (paragraphe.length > 0) blocs.push(`<p>${paragraphe.join('<br>')}</p>`);
    paragraphe = [];
  };
  const fermerListe = (): void => {
    if (liste !== null) blocs.push(`<${liste.type}>${liste.items.map(i => `<li>${i}</li>`).join('')}</${liste.type}>`);
    liste = null;
  };

  for (const ligne of lignes) {
    const puce = /^\s*[-*]\s+(.*)$/.exec(ligne);
    const numero = /^\s*\d+[.)]\s+(.*)$/.exec(ligne);
    const item = puce ?? numero;
    if (item !== null) {
      const type = puce !== null ? 'ul' : 'ol';
      fermerParagraphe();
      if (liste === null || liste.type !== type) {
        fermerListe();
        liste = { type, items: [] };
      }
      liste.items.push(enLigne(item[1]));
    } else if (ligne.trim() === '') {
      fermerParagraphe();
      fermerListe();
    } else {
      fermerListe();
      paragraphe.push(enLigne(ligne.trim()));
    }
  }
  fermerParagraphe();
  fermerListe();
  return blocs.join('');
}

function enLigne(texte: string): string {
  return echapper(texte)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type Format = 'gras' | 'italique' | 'puces' | 'numeros' | 'lien';

export interface Edition {
  texte: string;
  debut: number;
  fin: number;
}

/** Applique un format à la sélection d'une zone de texte. Pur : renvoie le nouveau texte et la sélection. */
export function appliquerFormat(texte: string, debut: number, fin: number, format: Format): Edition {
  const avant = texte.slice(0, debut);
  const selection = texte.slice(debut, fin);
  const apres = texte.slice(fin);

  if (format === 'gras' || format === 'italique' || format === 'lien') {
    const [ouvrant, fermant, defaut] =
      format === 'gras' ? ['**', '**', 'texte en gras'] :
      format === 'italique' ? ['*', '*', 'texte en italique'] :
      ['[', '](https://)', 'texte du lien'];
    const contenu = selection === '' ? defaut : selection;
    return {
      texte: avant + ouvrant + contenu + fermant + apres,
      debut: debut + ouvrant.length,
      fin: debut + ouvrant.length + contenu.length
    };
  }

  // Listes : préfixe chaque ligne touchée par la sélection.
  const debutLigne = texte.lastIndexOf('\n', debut - 1) + 1;
  const bloc = texte.slice(debutLigne, fin);
  const prefixees = bloc.split('\n').map((l, i) => (format === 'puces' ? '- ' : `${i + 1}. `) + l).join('\n');
  const nouveau = texte.slice(0, debutLigne) + prefixees + apres;
  return { texte: nouveau, debut: debutLigne, fin: debutLigne + prefixees.length };
}
