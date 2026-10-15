import { calculerCiblage } from '../core/destinataires';
import { compterParGrade, emailsDesCdm, filtrerCollaborateurs, gradesNonConfigures, optionsCdm } from '../core/filtres';
import { Criteres } from '../core/types';
import { collab, configTest } from './fixtures';

const config = configTest();
const population = [
  collab('1', 'Analyst', 'un@x.com', { typeEntretien: 'CS (maker)', statut: 'Actif', cdm: 'manager@x.com' }),
  collab('2', 'Consultant', 'deux@x.com', { statut: 'Back-up', cdm: 'manager@x.com' }),
  collab('3', 'Consultant', 'trois@x.com', { typeEntretien: 'CS (non maker)', statut: 'Actif', cdm: 'autre@x.com' }),
  collab('4', 'Manager', null, { typeEntretien: 'M&S (maker)' }),
  collab('5', 'Account Director', 'cinq@x.com'),
  collab('6', 'consultant ', 'DEUX@x.com'),
  collab('7', 'Manager', 'Manager@X.com', { typeEntretien: 'M&S (strat)', statut: 'Stand-by', cdm: 'autre@x.com' }),
  collab('8', 'Consultant', 'huit@x.com', { typeEntretien: 'Interv 1 (maker)', statut: 'Actif', cdm: 'sans.ligne@x.com' })
];

function criteres(partiel: Partial<Criteres> = {}): Criteres {
  return { grades: ['Analyst', 'Consultant', 'Manager'], complementaires: [], estCdm: false, cdms: [], ...partiel };
}

const ids = (c: Partial<Criteres>): string[] => filtrerCollaborateurs(population, criteres(c), config).map(x => x.id);

describe('grades', () => {
  it('aucun grade coché : personne n\'est ciblé', () => {
    expect(ids({ grades: [] })).toEqual([]);
  });

  it('OU entre les grades cochés, comparaison insensible à la casse et aux espaces', () => {
    expect(ids({ grades: ['Analyst', 'Consultant'] })).toEqual(['1', '2', '3', '6', '8']);
  });

  it('compte par grade et signale les grades non configurés', () => {
    expect(compterParGrade(population, config.grades)).toEqual({ Analyst: 1, Consultant: 4, Manager: 2 });
    expect(gradesNonConfigures(population, config.grades)).toEqual(['Account Director']);
  });
});

describe('Maker / Non-maker (Type Entretien)', () => {
  it('Maker = Type Entretien contient « (maker) » : « (non maker) » n\'est pas Maker', () => {
    expect(ids({ complementaires: ['maker'] })).toEqual(['1', '4', '8']);
  });

  it('Non-maker = Type Entretien contient « (non maker) »', () => {
    expect(ids({ complementaires: ['nonMaker'] })).toEqual(['3']);
  });

  it('Non-maker n\'est pas « tout sauf Maker » : sans Type Entretien ou « (strat) », ni l\'un ni l\'autre', () => {
    const profilConnu = ids({ complementaires: ['maker', 'nonMaker'] });
    expect(profilConnu).toEqual(['1', '3', '4', '8']);
    for (const id of ['2', '6', '7']) expect(profilConnu).not.toContain(id);
  });
});

describe('Acteur recrutement actif', () => {
  it('statut = Actif uniquement (Back-up, Stand-by exclus)', () => {
    expect(ids({ complementaires: ['acteurRecrutementActif'] })).toEqual(['1', '3', '8']);
  });

  it('se combine en ET avec le profil', () => {
    expect(ids({ complementaires: ['acteurRecrutementActif', 'maker'] })).toEqual(['1', '8']);
  });
});

describe('CDM', () => {
  it('liste les emails cités comme CDM, sans doublon et en minuscules', () => {
    expect(emailsDesCdm(population, config)).toEqual(['manager@x.com', 'autre@x.com', 'sans.ligne@x.com']);
  });

  it('Est CDM : l\'email du collaborateur figure dans la colonne CDM d\'au moins une ligne', () => {
    expect(ids({ estCdm: true })).toEqual(['7']);
  });

  it('Collaborateurs de : garde ceux dont le CDM fait partie des CDM choisis', () => {
    expect(ids({ cdms: ['manager@x.com'] })).toEqual(['1', '2']);
    expect(ids({ cdms: ['manager@x.com', 'AUTRE@x.com'] })).toEqual(['1', '2', '3', '7']);
  });

  it('propose les CDM présents avec leur nombre de collaborateurs', () => {
    expect(optionsCdm(population, config).map(o => [o.email, o.nbCollaborateurs])).toEqual([
      ['autre@x.com', 2], ['manager@x.com', 2], ['sans.ligne@x.com', 1]
    ]);
  });
});

describe('critères sans règle', () => {
  it('un critère sans règle connue est ignoré, jamais interprété', () => {
    expect(ids({ complementaires: ['inconnu'] })).toEqual(ids({}));
  });
});

describe('destinataires', () => {
  it('écarte les personnes sans email et dédoublonne les emails', () => {
    const r = calculerCiblage(population, criteres(), [], config);
    expect(r.destinataires.map(c => c.id)).toEqual(['1', '2', '3', '7', '8']);
    expect(r.sansEmail.map(c => c.id)).toEqual(['4']);
    expect(r.doublons).toBe(1);
  });

  it('retire manuellement une personne, et le retrait survit à un changement de filtre', () => {
    const r1 = calculerCiblage(population, criteres(), ['trois@x.com'], config);
    expect(r1.retires.map(c => c.id)).toEqual(['3']);
    const r2 = calculerCiblage(population, criteres({ grades: ['Consultant'] }), ['trois@x.com'], config);
    expect(r2.destinataires.map(c => c.id)).toEqual(['2', '8']);
    expect(r2.retires.map(c => c.id)).toEqual(['3']);
  });
});
