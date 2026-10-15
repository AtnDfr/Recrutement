import { calculerCiblage } from '../core/destinataires';
import { compterParGrade, filtrerCollaborateurs, gradesNonConfigures } from '../core/filtres';
import { collab, configTest } from './fixtures';

const config = configTest();
const population = [
  collab('1', 'Analyst', 'un@x.com', 'CS (a)'),
  collab('2', 'Consultant', 'deux@x.com', null),
  collab('3', 'Consultant', 'trois@x.com', 'M&S (b)'),
  collab('4', 'Manager', null, 'CS (a)'),
  collab('5', 'Account Director', 'cinq@x.com'),
  collab('6', 'consultant ', 'DEUX@x.com', null)
];

describe('filtres', () => {
  it('aucun grade coché : personne n\'est ciblé', () => {
    expect(filtrerCollaborateurs(population, { grades: [], complementaires: [] }, config)).toEqual([]);
  });

  it('grades : OU entre les grades cochés, comparaison insensible à la casse et aux espaces', () => {
    const ids = filtrerCollaborateurs(population, { grades: ['Analyst', 'Consultant'], complementaires: [] }, config).map(c => c.id);
    expect(ids).toEqual(['1', '2', '3', '6']);
  });

  it('critères complémentaires : ET avec le grade et entre eux', () => {
    const avecType = filtrerCollaborateurs(population, { grades: ['Analyst', 'Consultant'], complementaires: ['avecType'] }, config);
    expect(avecType.map(c => c.id)).toEqual(['1', '3']);
    const deux = filtrerCollaborateurs(population, { grades: ['Analyst', 'Consultant'], complementaires: ['avecType', 'typeA'] }, config);
    expect(deux.map(c => c.id)).toEqual(['1']);
  });

  it('un critère sans règle connue est ignoré, jamais interprété', () => {
    const avec = filtrerCollaborateurs(population, { grades: ['Consultant'], complementaires: ['inconnu'] }, config);
    const sans = filtrerCollaborateurs(population, { grades: ['Consultant'], complementaires: [] }, config);
    expect(avec).toEqual(sans);
  });

  it('compte par grade et signale les grades non configurés', () => {
    expect(compterParGrade(population, config.grades)).toEqual({ Analyst: 1, Consultant: 3, Manager: 1 });
    expect(gradesNonConfigures(population, config.grades)).toEqual(['Account Director']);
  });
});

describe('destinataires', () => {
  const criteres = { grades: ['Analyst', 'Consultant', 'Manager'], complementaires: [] };

  it('écarte les personnes sans email et dédoublonne les emails', () => {
    const r = calculerCiblage(population, criteres, [], config);
    expect(r.destinataires.map(c => c.id)).toEqual(['1', '2', '3']);
    expect(r.sansEmail.map(c => c.id)).toEqual(['4']);
    expect(r.doublons).toBe(1);
  });

  it('retire manuellement une personne, et le retrait survit à un changement de filtre', () => {
    const r1 = calculerCiblage(population, criteres, ['trois@x.com'], config);
    expect(r1.destinataires.map(c => c.id)).toEqual(['1', '2']);
    expect(r1.retires.map(c => c.id)).toEqual(['3']);

    const r2 = calculerCiblage(population, { grades: ['Consultant'], complementaires: [] }, ['trois@x.com'], config);
    expect(r2.destinataires.map(c => c.id)).toEqual(['2']);
    expect(r2.retires.map(c => c.id)).toEqual(['3']);
  });
});
