import { domVersMarkdown, lienValide } from '../core/editeur';
import { markdownVersHtml, messageVide } from '../core/message';

/** Construit un fragment DOM (jsdom) à partir de HTML, comme le produit un contentEditable. */
function dom(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('éditeur → markdown Teams', () => {
  it('convertit gras, italique et liens https', () => {
    expect(domVersMarkdown(dom('Bonjour <b>équipe</b>, voici <i>un</i> <a href="https://exemple.com/a?b=1">lien</a>.')))
      .toBe('Bonjour **équipe**, voici _un_ [lien](https://exemple.com/a?b=1).');
  });

  it('sépare les lignes en paragraphes (structure produite par Chrome)', () => {
    expect(domVersMarkdown(dom('Bonjour,<div><br></div><div>Deuxième ligne</div><div>Troisième</div>')))
      .toBe('Bonjour,\n\nDeuxième ligne\n\nTroisième');
  });

  it('convertit les listes à puces et numérotées', () => {
    expect(domVersMarkdown(dom('Intro<ul><li>un</li><li><b>deux</b></li></ul><ol><li>a</li><li>b</li></ol>')))
      .toBe('Intro\n\n- un\n- **deux**\n\n1. a\n2. b');
  });

  it('place les espaces hors des marques de gras', () => {
    expect(domVersMarkdown(dom('un<b> mot </b>ici'))).toBe('un **mot** ici');
  });

  it('ne garde pas un lien qui n\'est pas en https', () => {
    expect(domVersMarkdown(dom('<a href="javascript:alert(1)">piège</a> et <a href="http://x.fr">http</a>'))).toBe('piège et http');
  });

  it('ignore les éléments vides et les espaces insécables', () => {
    expect(domVersMarkdown(dom('<div><br></div><div>&nbsp;texte&nbsp;</div><b></b>'))).toBe('texte');
  });

  it('conserve les emojis saisis dans l\'éditeur', () => {
    expect(domVersMarkdown(dom('On recrute 🚀 <b>vite</b> 🙌'))).toBe('On recrute 🚀 **vite** 🙌');
  });

  it('valide les liens', () => {
    expect(lienValide('https://forms.office.com/r/abc')).toBe(true);
    expect(lienValide('http://exemple.com')).toBe(false);
    expect(lienValide('https://')).toBe(false);
  });
});

describe('aperçu du markdown (moteur de carte)', () => {
  it('échappe tout HTML saisi', () => {
    expect(markdownVersHtml('<script>alert("x")</script> & co')).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>'
    );
  });

  it('rend gras, italique, liens et listes comme Teams', () => {
    expect(markdownVersHtml('Bonjour **équipe** _vite_ [ici](https://x.fr)\n\n- un\n1. a')).toBe(
      '<p>Bonjour <strong>équipe</strong> <em>vite</em> <a href="https://x.fr">ici</a></p><ul><li>un</li></ul><ol><li>a</li></ol>'
    );
  });

  it('ne transforme pas un tiret bas au milieu d\'un mot', () => {
    expect(markdownVersHtml('nom_de_fichier')).toBe('<p>nom_de_fichier</p>');
  });

  it('considère vide un message composé d\'espaces', () => {
    expect(messageVide('  \n\t ')).toBe(true);
    expect(messageVide(' a ')).toBe(false);
  });
});
