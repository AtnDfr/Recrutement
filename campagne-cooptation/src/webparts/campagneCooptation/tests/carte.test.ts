import { controlerCampagne, donneesCarte } from '../core/contenu';
import { appliquerModele } from '../core/modeleCarte';
import { configTest, contenuTest, modeleTest } from './fixtures';

const config = configTest();

// Lecture du vrai fichier modèle (Jest s'exécute sous Node ; les types Node ne sont pas chargés par SPFx).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const node = { fs: require('fs'), path: require('path'), cwd: require('process').cwd() } as {
  fs: { readFileSync(fichier: string, encodage: string): string };
  path: { join(...parties: string[]): string };
  cwd: string;
};

describe('modèle de carte unique', () => {
  it('injecte les variables et retire le bouton quand il est désactivé', () => {
    const r = appliquerModele(modeleTest, donneesCarte(contenuTest()));
    expect(r).toEqual({
      ok: true,
      modele: 'carte-test@3',
      carte: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
          { type: 'TextBlock', text: 'On recrute', weight: 'Bolder' },
          { type: 'TextBlock', text: 'Bonjour **à tous**', wrap: true }
        ],
        actions: []
      }
    });
  });

  it('garde le bouton quand il est renseigné', () => {
    const r = appliquerModele(modeleTest, donneesCarte(contenuTest({ avecBouton: true, ctaLibelle: 'Je coopte', ctaUrl: 'https://forms.office.com/r/x' })));
    expect(r.ok && r.carte.actions).toEqual([{ type: 'Action.OpenUrl', title: 'Je coopte', url: 'https://forms.office.com/r/x' }]);
  });

  it('les valeurs saisies restent des données : guillemets et retours à la ligne ne cassent pas le JSON', () => {
    const r = appliquerModele(modeleTest, donneesCarte(contenuTest({ titre: 'Un "titre"\n}', message: '${titre} reste du texte' })));
    expect(r.ok).toBe(true);
    const json = JSON.stringify(r.ok ? r.carte : null);
    expect(JSON.parse(json).body[0].text).toBe('Un "titre"\n}');
  });

  it('refuse une variable inconnue, un $when mal formé ou une version non supportée par Teams', () => {
    expect(appliquerModele({ ...modeleTest, body: [{ type: 'TextBlock', text: '${prenom}' }] }, donneesCarte(contenuTest())).ok).toBe(false);
    expect(appliquerModele({ ...modeleTest, actions: [{ $when: '${ctaUrl != \'\'}', type: 'Action.OpenUrl' }] }, donneesCarte(contenuTest())).ok).toBe(false);
    expect(appliquerModele({ ...modeleTest, version: '1.6' }, donneesCarte(contenuTest())).ok).toBe(false);
    expect(appliquerModele('pas un objet', donneesCarte(contenuTest())).ok).toBe(false);
  });

  it('le modèle livré (modeles/carte-cooptation.json) produit une carte valide, avec et sans bouton', () => {
    const fichier = node.path.join(node.cwd, 'modeles', 'carte-cooptation.json');
    const modele = JSON.parse(node.fs.readFileSync(fichier, 'utf8'));
    const sans = appliquerModele(modele, donneesCarte(contenuTest()));
    const avec = appliquerModele(modele, donneesCarte(contenuTest({ avecBouton: true, ctaLibelle: 'Go', ctaUrl: 'https://x.fr' })));
    expect(sans.ok && sans.carte.actions).toEqual([]);
    expect(avec.ok && (avec.carte.actions as unknown[]).length).toBe(1);
    expect(sans.ok && sans.modele).toMatch(/^carte-cooptation@\d+$/);
  });
});

describe('contrôles du contenu', () => {
  const ko = (c: ReturnType<typeof controlerCampagne>): string[] => c.filter(x => !x.ok).map(x => x.cle);

  it('exige destinataires, titre et message', () => {
    expect(ko(controlerCampagne(contenuTest({ titre: ' ', message: '' }), 0, config))).toEqual(['destinataires', 'titre', 'message']);
    expect(ko(controlerCampagne(contenuTest(), 3, config))).toEqual([]);
  });

  it('bouton : tout ou rien, lien en https', () => {
    expect(ko(controlerCampagne(contenuTest({ avecBouton: true, ctaLibelle: '', ctaUrl: 'https://x.fr' }), 3, config))).toEqual(['bouton']);
    expect(ko(controlerCampagne(contenuTest({ avecBouton: true, ctaLibelle: 'Go', ctaUrl: 'http://x.fr' }), 3, config))).toEqual(['bouton']);
    expect(ko(controlerCampagne(contenuTest({ avecBouton: true, ctaLibelle: 'Go', ctaUrl: 'https://x.fr' }), 3, config))).toEqual([]);
  });

  it('limite la longueur du titre', () => {
    expect(ko(controlerCampagne(contenuTest({ titre: 'x'.repeat(121) }), 3, config))).toEqual(['titre']);
  });
});
