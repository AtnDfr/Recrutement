/**
 * Markdown du message : le sous-ensemble que Teams affiche dans un TextBlock d'Adaptive Card.
 *   **gras**   _italique_   [texte](https://lien)
 *   - élément de liste à puces
 *   1. élément de liste numérotée
 *   ligne vide = nouveau paragraphe ; retour à la ligne = saut de ligne
 *
 * markdownVersHtml sert UNIQUEMENT à l'aperçu (moteur Adaptive Card du navigateur).
 * Le texte est échappé AVANT toute transformation : aucun HTML saisi n'est interprété.
 */

export function messageVide(source: string): boolean {
  return source.trim() === '';
}

export function markdownVersHtml(source: string): string {
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
    .replace(/\[([^\]]+)\]\(((?:https:\/\/|mailto:)[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?!\w)/g, '$1<em>$2</em>');
}

export function echapper(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
