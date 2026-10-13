import { describe, expect, it } from 'vitest';
import { computeCoverage } from '../engine';
import type { ResultatCouverture } from '../types';
import { miniReferentiel } from './fixtures/mini-referentiel';

const ref = miniReferentiel();
const ids = (r: ResultatCouverture) => r.metiers.map((m) => m.metierId);
const nouvelles = (r: ResultatCouverture, metierId: string) =>
  r.metiers.find((m) => m.metierId === metierId)!.nouvelles.map((i) => i.competenceId);
const partagees = (r: ResultatCouverture, metierId: string) =>
  r.metiers.find((m) => m.metierId === metierId)!.partagees.map((i) => i.competenceId);
const residuel = (r: ResultatCouverture, competenceId: string) => r.residuels.find((x) => x.competenceId === competenceId);

describe('Règles de couverture progressive (référentiel fictif)', () => {
  it('1. une demande peut produire un seul métier', () => {
    const r = computeCoverage(['X01', 'X02', 'X03'], ref);
    expect(ids(r)).toEqual(['m-a']);
    expect(r.residuels).toEqual([]);
    expect(r.tauxCouverture).toBe(1);
    expect(r.metiers[0]!.rang).toBe(1);
  });

  it('2. une demande peut produire plusieurs métiers, ordonnés par apport décroissant', () => {
    const r = computeCoverage(['X01', 'X02', 'X03', 'X05', 'X09'], ref);
    expect(ids(r)).toEqual(['m-a', 'm-b', 'm-d']);
    expect(r.metiers.map((m) => m.rang)).toEqual([1, 2, 3]);
    expect(nouvelles(r, 'm-a')).toEqual(['X01', 'X02', 'X03']);
    expect(nouvelles(r, 'm-b')).toEqual(['X05']);
    expect(nouvelles(r, 'm-d')).toEqual(['X09']);
    expect(r.metiers.find((m) => m.metierId === 'm-b')!.apportCoreUnique).toEqual(['X05']);
    expect(r.residuels).toEqual([]);
  });

  it('3. une compétence couverte sort du besoin résiduel', () => {
    const r = computeCoverage(['X01', 'X02', 'X03', 'X05', 'X09'], ref);
    expect(residuel(r, 'X01')).toBeUndefined();
    // Elle n'est comptée comme « nouvelle » qu'une seule fois, par le premier métier qui la couvre.
    const fois = r.metiers.filter((m) => m.nouvelles.some((i) => i.competenceId === 'X01'));
    expect(fois.map((m) => m.metierId)).toEqual(['m-a']);
  });

  it('4. une compétence couverte peut néanmoins apparaître dans un deuxième métier retenu', () => {
    const r = computeCoverage(['X01', 'X02', 'X03', 'X05', 'X09'], ref);
    expect(nouvelles(r, 'm-a')).toContain('X01');
    expect(partagees(r, 'm-b')).toEqual(['X01']);
    expect(r.metiers.find((m) => m.metierId === 'm-b')!.partagees[0]!.statut).toBe('Core');
  });

  describe('5. un métier sans nouvelle couverture significative n’est pas ajouté', () => {
    it('une compétence déjà couverte ne justifie pas à elle seule un second métier', () => {
      // M-B, M-C et M-E ont X01 en Core, mais X01/X02 sont déjà couverts par M-A.
      const r = computeCoverage(['X01', 'X02', 'X03'], ref);
      expect(ids(r)).toEqual(['m-a']);
      expect(ids(computeCoverage(['X01', 'X02', 'X03'], miniReferentiel({ plafondMetiers: 10 })))).toEqual(['m-a']);
    });

    it('un métier justifié seulement par une compétence déjà couverte n’est pas ajouté, même s’il apporterait une Récurrente', () => {
      // M-C couvrirait X12 (Récurrente), mais son seul appui Core (X01/X02) est déjà couvert par M-A.
      const r = computeCoverage(['X01', 'X02', 'X03', 'X12'], ref);
      expect(ids(r)).toEqual(['m-a']);
      expect(residuel(r, 'X12')).toEqual({ competenceId: 'X12', motif: 'non-core-uniquement', metiersCandidats: ['m-c'] });
    });

    it('une couverture seulement Spécialisante ne suffit pas à ajouter un métier', () => {
      const r = computeCoverage(['X01', 'X02', 'X03', 'X08'], ref);
      expect(ids(r)).toEqual(['m-a']);
      expect(residuel(r, 'X08')).toEqual({ competenceId: 'X08', motif: 'non-core-uniquement', metiersCandidats: ['m-d'] });
    });

    it('une compétence transverse ne justifie jamais à elle seule un métier, même en Core', () => {
      const r = computeCoverage(['X91'], ref);
      expect(ids(r)).toEqual([]);
      expect(residuel(r, 'X91')).toEqual({ competenceId: 'X91', motif: 'transverse-vers-grade', metiersCandidats: ['m-e'] });
    });

    it('une compétence transverse est couverte en bonus quand le métier est justifié par ailleurs', () => {
      const r = computeCoverage(['X11', 'X91'], ref);
      expect(ids(r)).toEqual(['m-e']);
      expect(nouvelles(r, 'm-e')).toEqual(['X11', 'X91']);
      expect(r.residuels).toEqual([]);
    });

    it('chaque métier retenu a au moins une compétence Core qu’aucun autre métier retenu ne couvre', () => {
      const r = computeCoverage(['X01', 'X02', 'X03', 'X05', 'X07', 'X09', 'X11'], ref);
      expect(r.metiers.length).toBeGreaterThan(1);
      for (const m of r.metiers) expect(m.apportCoreUnique.length).toBeGreaterThan(0);
    });
  });

  describe('6. les compétences non couvertes restent visibles', () => {
    it('chaque compétence demandée est soit couverte, soit résiduelle avec un motif', () => {
      const demande = ['X01', 'X02', 'X03', 'X08', 'X91', 'X99'];
      const r = computeCoverage(demande, ref);
      const couvertes = r.metiers.flatMap((m) => m.nouvelles.map((i) => i.competenceId));
      const residuelles = r.residuels.map((x) => x.competenceId);
      expect([...couvertes, ...residuelles].sort()).toEqual([...demande].sort());
      expect(couvertes.filter((c) => residuelles.includes(c))).toEqual([]);
      expect(residuel(r, 'X99')!.motif).toBe('hors-signatures');
      expect(residuel(r, 'X08')!.motif).toBe('non-core-uniquement');
      expect(residuel(r, 'X91')!.motif).toBe('transverse-vers-grade');
      expect(r.tauxCouverture).toBeCloseTo(3 / 6);
    });

    it('signale les compétences laissées par le plafond, avec le métier qui les couvrirait', () => {
      const r = computeCoverage(['X03', 'X05', 'X09', 'X11'], ref);
      expect(r.metiers).toHaveLength(3);
      expect(r.residuels).toHaveLength(1);
      expect(r.residuels[0]!.motif).toBe('plafond-atteint');
      expect(r.residuels[0]!.metiersCandidats).toHaveLength(1);
    });

    it('signale une compétence Core écartée par arbitrage de couverture', () => {
      // {M-F} couvre X20 X21 X23 X24 ; M-G apporterait X22 mais rendrait M-F redondant.
      const r = computeCoverage(['X20', 'X21', 'X22', 'X23', 'X24'], ref);
      expect(ids(r)).toEqual(['m-f']);
      expect(residuel(r, 'X22')).toEqual({ competenceId: 'X22', motif: 'arbitrage-couverture', metiersCandidats: ['m-g'] });
    });
  });
});
