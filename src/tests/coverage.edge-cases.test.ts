import { describe, expect, it } from 'vitest';
import { computeCoverage, ReferentielError } from '../engine';
import { combinations } from '../engine/combinations';
import { miniReferentiel } from './fixtures/mini-referentiel';

const ref = miniReferentiel();

describe('Cas limites du moteur', () => {
  it('sélection vide : aucun métier, aucun résiduel', () => {
    expect(computeCoverage([], ref)).toEqual({ metiers: [], residuels: [], tauxCouverture: 0, ambigu: false });
  });

  it('compétence inconnue : erreur explicite', () => {
    expect(() => computeCoverage(['X01', 'INCONNUE'], ref)).toThrow(ReferentielError);
    expect(() => computeCoverage(['X01', 'INCONNUE'], ref)).toThrow(/INCONNUE/);
  });

  it('doublons et ordre de saisie sans effet', () => {
    const a = computeCoverage(['X09', 'X05', 'X03', 'X02', 'X01'], ref);
    const b = computeCoverage(['X01', 'X01', 'X02', 'X03', 'X05', 'X09', 'X05'], ref);
    expect(a).toEqual(b);
  });

  it('uniquement des compétences hors signatures', () => {
    const r = computeCoverage(['X99'], ref);
    expect(r.metiers).toEqual([]);
    expect(r.residuels).toEqual([{ competenceId: 'X99', motif: 'hors-signatures', metiersCandidats: [] }]);
  });

  it('uniquement des compétences transverses : tout est renvoyé au grade', () => {
    const r = computeCoverage(['X90', 'X91'], ref);
    expect(r.metiers).toEqual([]);
    expect(r.residuels.map((x) => x.motif)).toEqual(['transverse-vers-grade', 'transverse-vers-grade']);
  });

  it('plafond à 1 : un seul métier, le reste en plafond-atteint', () => {
    const r = computeCoverage(['X01', 'X02', 'X03', 'X05'], miniReferentiel({ plafondMetiers: 1 }));
    expect(r.metiers.map((m) => m.metierId)).toEqual(['m-a']);
    expect(r.residuels).toEqual([{ competenceId: 'X05', motif: 'plafond-atteint', metiersCandidats: ['m-b'] }]);
  });

  it('plafond à 0 : aucun métier', () => {
    const r = computeCoverage(['X01', 'X99'], miniReferentiel({ plafondMetiers: 0 }));
    expect(r.metiers).toEqual([]);
    expect(r.residuels.map((x) => [x.competenceId, x.motif])).toEqual([
      ['X01', 'plafond-atteint'],
      ['X99', 'hors-signatures'],
    ]);
  });

  it('égalité : résultat déterministe, ambiguïté signalée et alternatives exposées', () => {
    // M-A et M-C couvrent X01/X02 en Core avec le même score.
    const r = computeCoverage(['X01', 'X02'], ref);
    expect(r.metiers.map((m) => m.metierId)).toEqual(['m-a']);
    expect(r.ambigu).toBe(true);
    expect(r.metiers[0]!.alternatives).toEqual(['m-c']);
  });

  it('sans égalité : pas d’ambiguïté ni d’alternative', () => {
    const r = computeCoverage(['X01', 'X02', 'X03'], ref);
    expect(r.ambigu).toBe(false);
    expect(r.metiers[0]!.alternatives).toEqual([]);
  });

  it('une transverse couverte départage deux métiers ex aequo', () => {
    // M-A porte X90 (Récurrente), M-C non : M-A l'emporte et l'égalité est levée.
    const r = computeCoverage(['X01', 'X02', 'X90'], ref);
    expect(r.metiers.map((m) => m.metierId)).toEqual(['m-a']);
    expect(r.ambigu).toBe(false);
    expect(r.metiers[0]!.nouvelles.map((i) => i.competenceId)).toContain('X90');
  });
});

describe('combinations', () => {
  it('énumère les combinaisons dans l’ordre', () => {
    expect([...combinations(['a', 'b', 'c'], 2)]).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
    expect([...combinations(['a'], 0)]).toEqual([[]]);
    expect([...combinations(['a'], 2)]).toEqual([]);
  });
});
