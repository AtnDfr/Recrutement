import { appliquerFormat, messageVide, versHtmlTeams } from '../core/message';

describe('message Teams', () => {
  it('échappe tout HTML saisi', () => {
    expect(versHtmlTeams('<script>alert("x")</script> & co')).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>'
    );
  });

  it('convertit paragraphes, sauts de ligne, gras, italique et liens', () => {
    const html = versHtmlTeams('Bonjour **équipe**,\nvoici *un* point.\n\nLien : [formulaire](https://exemple.com/a?b=1)');
    expect(html).toBe(
      '<p>Bonjour <strong>équipe</strong>,<br>voici <em>un</em> point.</p>' +
      '<p>Lien : <a href="https://exemple.com/a?b=1">formulaire</a></p>'
    );
  });

  it('refuse les liens qui ne sont pas http(s) ou mailto', () => {
    expect(versHtmlTeams('[x](javascript:alert(1))')).toBe('<p>[x](javascript:alert(1))</p>');
  });

  it('convertit les listes à puces et numérotées', () => {
    expect(versHtmlTeams('Intro\n- un\n- deux\n1. a\n2. b')).toBe(
      '<p>Intro</p><ul><li>un</li><li>deux</li></ul><ol><li>a</li><li>b</li></ol>'
    );
  });

  it('considère vide un message composé d\'espaces', () => {
    expect(messageVide('  \n\t ')).toBe(true);
    expect(messageVide(' a ')).toBe(false);
  });

  it('applique un format à la sélection', () => {
    expect(appliquerFormat('un mot ici', 3, 6, 'gras')).toEqual({ texte: 'un **mot** ici', debut: 5, fin: 8 });
    expect(appliquerFormat('a\nb', 0, 3, 'puces').texte).toBe('- a\n- b');
    expect(appliquerFormat('', 0, 0, 'lien').texte).toBe('[texte du lien](https://)');
  });
});
