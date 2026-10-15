import { preparerEnvoi } from '../core/campagne';
import { Action, EtatCampagne, etatInitial, reducer } from '../core/etat';
import { collab, configTest, modeleTest } from './fixtures';

const config = configTest();
const destinataires = [collab('1', 'Analyst', 'un@x.com'), collab('2', 'Consultant', ' deux@x.com ')];

function jouer(actions: Action[], depart: EtatCampagne = etatInitial): EtatCampagne {
  return actions.reduce(reducer, depart);
}

const remplir: Action[] = [
  { type: 'BASCULER_GRADE', grade: 'Analyst' },
  { type: 'MODIFIER_CONTENU', contenu: { titre: 'On recrute', message: 'Bonjour' } }
];
const jusquaVerification: Action[] = [...remplir, { type: 'OUVRIR_VERIFICATION', nbDestinataires: 2, config }];
const jusquaConfirmation: Action[] = [...jusquaVerification, { type: 'OUVRIR_CONFIRMATION', nbDestinataires: 2, config }];

const preparer = (etat: EtatCampagne, dest = destinataires, modele: unknown = modeleTest): ReturnType<typeof preparerEnvoi> =>
  preparerEnvoi(etat, dest, modele, config, []);

describe('payload transmis au flow', () => {
  it('contient le contenu métier ET la carte exacte de l\'aperçu', () => {
    const p = preparer(jouer(jusquaConfirmation));
    expect(p.ok && p.payload).toEqual({
      destinataires: ['un@x.com', 'deux@x.com'],
      titre: 'On recrute',
      message: 'Bonjour',
      ctaLibelle: null,
      ctaUrl: null,
      imageUrl: null,
      modele: 'carte-test@3',
      carte: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [{ type: 'TextBlock', text: 'On recrute', weight: 'Bolder' }, { type: 'TextBlock', text: 'Bonjour', wrap: true }],
        actions: []
      }
    });
  });
});

describe('garde-fous du parcours', () => {
  it('l\'état initial ne permet aucun envoi', () => {
    expect(preparer(etatInitial).ok).toBe(false);
  });

  it('changer un filtre ne déclenche rien', () => {
    const etat = jouer([{ type: 'BASCULER_GRADE', grade: 'Analyst' }, { type: 'BASCULER_CRITERE', id: 'maker' }, { type: 'BASCULER_EST_CDM' }]);
    expect(etat.envoi.statut).toBe('inactif');
    expect(preparer(etat).ok).toBe(false);
  });

  it('la vérification ne s\'ouvre que si la campagne est complète', () => {
    expect(jouer([{ type: 'OUVRIR_VERIFICATION', nbDestinataires: 2, config }]).etape).toBe('edition');
    expect(jouer([...remplir, { type: 'OUVRIR_VERIFICATION', nbDestinataires: 0, config }]).etape).toBe('edition');
    expect(jouer(jusquaVerification).etape).toBe('verification');
  });

  it('la confirmation ne s\'ouvre qu\'après la vérification', () => {
    const etat = jouer([...remplir, { type: 'OUVRIR_CONFIRMATION', nbDestinataires: 2, config }]);
    expect(etat.confirmationOuverte).toBe(false);
    expect(jouer([{ type: 'ENVOI_DEMARRE' }], etat).envoi.statut).toBe('inactif');
  });

  it('vérification sans confirmation explicite : envoi refusé', () => {
    expect(preparer(jouer(jusquaVerification))).toEqual({ ok: false, raison: 'L\'envoi doit être confirmé explicitement.' });
  });

  it('toute modification pendant la vérification renvoie à l\'édition', () => {
    const etat = jouer([...jusquaConfirmation, { type: 'RETIRER', email: 'un@x.com' }]);
    expect(etat.etape).toBe('edition');
    expect(etat.confirmationOuverte).toBe(false);
  });

  it('refuse l\'envoi tant que l\'image n\'est pas lisible', () => {
    const avecImage: Action[] = [...remplir, { type: 'MODIFIER_CONTENU', contenu: { avecImage: true, imageUrl: 'https://x.fr/b.gif' } }];
    expect(jouer([...avecImage, { type: 'OUVRIR_VERIFICATION', nbDestinataires: 2, config, imageLisible: false }]).etape).toBe('edition');
    const etat = jouer([
      ...avecImage,
      { type: 'OUVRIR_VERIFICATION', nbDestinataires: 2, config, imageLisible: true },
      { type: 'OUVRIR_CONFIRMATION', nbDestinataires: 2, config, imageLisible: true }
    ]);
    expect(preparerEnvoi(etat, destinataires, modeleTest, config, [], null).ok).toBe(false);
    const ok = preparerEnvoi(etat, destinataires, modeleTest, config, [], true);
    expect(ok.ok && ok.payload.imageUrl).toBe('https://x.fr/b.gif');
  });

  it('refuse 0 destinataire, un modèle de carte invalide ou une campagne trop volumineuse', () => {
    const etat = jouer(jusquaConfirmation);
    expect(preparer(etat, []).ok).toBe(false);
    expect(preparer(etat, destinataires, { type: 'Autre' }).ok).toBe(false);
    expect(preparerEnvoi(etat, destinataires, modeleTest, configTest({ tailleMaxPayload: 20 }), []).ok).toBe(false);
  });

  it('pendant et après l\'envoi, la campagne est verrouillée (pas de double envoi)', () => {
    const enCours = jouer([...jusquaConfirmation, { type: 'ENVOI_DEMARRE' }]);
    expect(enCours.envoi.statut).toBe('enCours');
    expect(jouer([{ type: 'MODIFIER_CONTENU', contenu: { titre: 'autre' } }], enCours).contenu.titre).toBe('On recrute');
    expect(preparer(enCours).ok).toBe(false);

    const succes = jouer([{ type: 'ENVOI_REUSSI', reference: '12' }], enCours);
    expect(succes.envoi).toEqual({ statut: 'succes', reference: '12' });
    expect(jouer([{ type: 'ENVOI_DEMARRE' }], succes)).toBe(succes);
    expect(jouer([{ type: 'NOUVELLE_CAMPAGNE' }], succes)).toEqual(etatInitial);
  });

  it('après un échec, on peut réessayer depuis la vérification', () => {
    const echec = jouer([...jusquaConfirmation, { type: 'ENVOI_DEMARRE' }, { type: 'ENVOI_ECHOUE', message: 'HTTP 500' }]);
    expect(echec.envoi).toEqual({ statut: 'erreur', message: 'HTTP 500' });
    expect(echec.etape).toBe('verification');
    const nouvelEssai = jouer([{ type: 'OUVRIR_CONFIRMATION', nbDestinataires: 2, config }, { type: 'ENVOI_DEMARRE' }], echec);
    expect(nouvelEssai.envoi.statut).toBe('enCours');
  });
});
