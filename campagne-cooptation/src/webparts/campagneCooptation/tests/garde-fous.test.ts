import { construirePayload, preparerEnvoi } from '../core/campagne';
import { Action, EtatCampagne, etatInitial, reducer } from '../core/etat';
import { collab, configTest } from './fixtures';

const config = configTest();
const destinataires = [collab('1', 'Analyst', 'un@x.com'), collab('2', 'Consultant', ' deux@x.com ')];

function jouer(actions: Action[], depart: EtatCampagne = etatInitial): EtatCampagne {
  return actions.reduce(reducer, depart);
}

/** Parcours complet jusqu'à la confirmation ouverte. */
const jusquaConfirmation: Action[] = [
  { type: 'BASCULER_GRADE', grade: 'Analyst' },
  { type: 'ALLER_ETAPE', etape: 'rediger', nbDestinataires: 2 },
  { type: 'SAISIR_MESSAGE', message: 'Bonjour' },
  { type: 'ALLER_ETAPE', etape: 'verifier', nbDestinataires: 2 },
  { type: 'OUVRIR_CONFIRMATION', nbDestinataires: 2 }
];

describe('payload transmis au flow', () => {
  it('respecte le contrat { destinataires, message }', () => {
    expect(construirePayload(destinataires, 'Bonjour **à tous**')).toEqual({
      destinataires: ['un@x.com', 'deux@x.com'],
      message: '<p>Bonjour <strong>à tous</strong></p>'
    });
  });
});

describe('garde-fous du parcours', () => {
  it('l\'état initial ne permet aucun envoi', () => {
    expect(preparerEnvoi(etatInitial, destinataires, config).ok).toBe(false);
  });

  it('changer un filtre ne déclenche rien et ne change pas l\'état d\'envoi', () => {
    const etat = jouer([{ type: 'BASCULER_GRADE', grade: 'Analyst' }, { type: 'BASCULER_CRITERE', id: 'avecType' }]);
    expect(etat.envoi.statut).toBe('inactif');
    expect(preparerEnvoi(etat, destinataires, config).ok).toBe(false);
  });

  it('impossible de rédiger sans destinataire, ni de vérifier sans message', () => {
    expect(jouer([{ type: 'ALLER_ETAPE', etape: 'rediger', nbDestinataires: 0 }]).etape).toBe('cibler');
    const sansMessage = jouer([
      { type: 'ALLER_ETAPE', etape: 'rediger', nbDestinataires: 3 },
      { type: 'SAISIR_MESSAGE', message: '   ' },
      { type: 'ALLER_ETAPE', etape: 'verifier', nbDestinataires: 3 }
    ]);
    expect(sansMessage.etape).toBe('rediger');
  });

  it('la confirmation ne s\'ouvre qu\'à l\'étape de vérification (prévisualisation obligatoire)', () => {
    const etat = jouer([
      { type: 'ALLER_ETAPE', etape: 'rediger', nbDestinataires: 2 },
      { type: 'SAISIR_MESSAGE', message: 'Bonjour' },
      { type: 'OUVRIR_CONFIRMATION', nbDestinataires: 2 }
    ]);
    expect(etat.confirmationOuverte).toBe(false);
    expect(jouer([{ type: 'ENVOI_DEMARRE' }], etat).envoi.statut).toBe('inactif');
  });

  it('vérification sans confirmation explicite : envoi refusé', () => {
    const etat = jouer(jusquaConfirmation.slice(0, 4));
    expect(etat.etape).toBe('verifier');
    expect(preparerEnvoi(etat, destinataires, config)).toEqual({ ok: false, raison: 'L\'envoi doit être confirmé explicitement.' });
  });

  it('après confirmation explicite, l\'envoi est préparé avec les critères', () => {
    const etat = jouer(jusquaConfirmation);
    const preparation = preparerEnvoi(etat, destinataires, config);
    expect(preparation.ok).toBe(true);
    if (preparation.ok) {
      expect(preparation.payload.destinataires).toHaveLength(2);
      expect(preparation.criteres[0]).toBe('Grades : Analyst');
    }
  });

  it('refuse 0 destinataire ou un message vide même confirmation ouverte', () => {
    const etat = jouer(jusquaConfirmation);
    expect(preparerEnvoi(etat, [], config).ok).toBe(false);
    expect(preparerEnvoi({ ...etat, message: ' ' }, destinataires, config).ok).toBe(false);
  });

  it('refuse une campagne trop volumineuse', () => {
    const etat = jouer(jusquaConfirmation);
    expect(preparerEnvoi(etat, destinataires, configTest({ tailleMaxPayload: 20 })).ok).toBe(false);
  });

  it('toute modification referme la confirmation', () => {
    const etat = jouer([...jusquaConfirmation, { type: 'RETIRER', email: 'un@x.com' }]);
    expect(etat.confirmationOuverte).toBe(false);
  });

  it('pendant et après l\'envoi, la campagne est verrouillée (pas de double envoi)', () => {
    const enCours = jouer([...jusquaConfirmation, { type: 'ENVOI_DEMARRE' }]);
    expect(enCours.envoi.statut).toBe('enCours');
    expect(jouer([{ type: 'SAISIR_MESSAGE', message: 'autre' }], enCours).message).toBe('Bonjour');
    expect(preparerEnvoi(enCours, destinataires, config).ok).toBe(false);

    const succes = jouer([{ type: 'ENVOI_REUSSI', reference: '12' }], enCours);
    expect(succes.envoi).toEqual({ statut: 'succes', reference: '12' });
    expect(jouer([{ type: 'ENVOI_DEMARRE' }], succes)).toBe(succes);
    expect(jouer([{ type: 'NOUVELLE_CAMPAGNE' }], succes)).toEqual(etatInitial);
  });

  it('après un échec, on peut corriger et réessayer', () => {
    const echec = jouer([...jusquaConfirmation, { type: 'ENVOI_DEMARRE' }, { type: 'ENVOI_ECHOUE', message: 'HTTP 500' }]);
    expect(echec.envoi).toEqual({ statut: 'erreur', message: 'HTTP 500' });
    expect(echec.confirmationOuverte).toBe(false);
    const nouvelEssai = jouer([{ type: 'OUVRIR_CONFIRMATION', nbDestinataires: 2 }, { type: 'ENVOI_DEMARRE' }], echec);
    expect(nouvelEssai.envoi.statut).toBe('enCours');
  });
});
