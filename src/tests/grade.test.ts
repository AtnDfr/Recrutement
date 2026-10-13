import { describe, expect, it } from 'vitest';
import { buildFicheRecruteur, computeCoverage, getAttentesTransverses, ReferentielError } from '../engine';
import { loadReferentiels } from '../data/loadReferentiels';
import type { DemandeInput, GradeId } from '../types';
import { miniReferentiel } from './fixtures/mini-referentiel';

const ref = loadReferentiels();
const GRADES: GradeId[] = ['analyste', 'consultant', 'consultant-senior', 'manager', 'senior-manager'];

// Python, SQL, Conception de pipelines, Machine Learning, Expérimentation, Relation client (transverse)
const COMPETENCES = ['C102', 'C103', 'C021', 'C035', 'C034', 'C055'];

const demande = (grade: GradeId): DemandeInput => ({
  demandeur: 'Test',
  date: '2026-10-13',
  grade,
  competenceIds: COMPETENCES,
});

describe('7. le grade n’influence pas la sélection des métiers', () => {
  it('le moteur de couverture ne prend pas le grade en paramètre', () => {
    expect(computeCoverage.length).toBe(2);
  });

  it('même sélection, cinq grades : résultat de couverture strictement identique', () => {
    const resultats = GRADES.map((g) => buildFicheRecruteur(demande(g), ref).resultat);
    for (const r of resultats) expect(r).toEqual(resultats[0]);
    expect(resultats[0]!.metiers.length).toBeGreaterThan(0);
  });

  it('identique aussi sur le référentiel fictif, y compris pour les transverses', () => {
    const mini = miniReferentiel();
    const base = { demandeur: 'Test', date: '2026-10-13', competenceIds: ['X01', 'X02', 'X03', 'X91'] };
    const a = buildFicheRecruteur({ ...base, grade: 'analyste' }, mini);
    const m = buildFicheRecruteur({ ...base, grade: 'manager' }, mini);
    expect(a.resultat).toEqual(m.resultat);
  });
});

describe('8. le grade enrichit les résultats après matching', () => {
  it('restitue les niveaux attendus du référentiel des grades, dans l’ordre des axes', () => {
    expect(getAttentesTransverses('manager', ref)).toEqual([
      { axe: 'gestion-projet', libelle: 'Gestion de projet', niveau: 5 },
      { axe: 'leadership', libelle: 'Leadership', niveau: 4 },
      { axe: 'management', libelle: 'Management', niveau: 4 },
      { axe: 'relation-client', libelle: 'Relation client', niveau: 5 },
      { axe: 'developpement-commercial', libelle: 'Développement commercial', niveau: 4 },
    ]);
    expect(getAttentesTransverses('analyste', ref).map((a) => a.niveau)).toEqual([1, 1, 1, 2, 1]);
    expect(getAttentesTransverses('consultant', ref).map((a) => a.niveau)).toEqual([2, 1, 2, 3, 2]);
    expect(getAttentesTransverses('consultant-senior', ref).map((a) => a.niveau)).toEqual([4, 3, 3, 4, 3]);
    expect(getAttentesTransverses('senior-manager', ref).map((a) => a.niveau)).toEqual([5, 5, 5, 5, 5]);
  });

  it('la fiche recruteur porte le grade, l’échelle et ses attentes', () => {
    const fiche = buildFicheRecruteur(demande('consultant-senior'), ref);
    expect(fiche.gradeLibelle).toBe('Consultant Senior');
    expect(fiche.echelle).toEqual({ min: 1, max: 5 });
    expect(fiche.attentesTransverses).toEqual(getAttentesTransverses('consultant-senior', ref));
  });

  it('une transverse non couverte est renvoyée à l’axe du grade avec le niveau attendu', () => {
    const analyste = buildFicheRecruteur(demande('analyste'), ref);
    const manager = buildFicheRecruteur(demande('manager'), ref);
    expect(analyste.resultat.residuels.find((r) => r.competenceId === 'C055')?.motif).toBe('transverse-vers-grade');
    const attendu = (niveauAttendu: number) => [
      { competenceId: 'C055', axe: 'relation-client', niveauAttendu, metiersPorteurs: [], renvoyeeAuGrade: true },
    ];
    expect(analyste.transverses).toEqual(attendu(2));
    expect(manager.transverses).toEqual(attendu(5));
  });

  it('une transverse couverte par un métier retenu reste aussi portée par le grade', () => {
    const fiche = buildFicheRecruteur(
      { demandeur: 'Test', date: '2026-10-13', grade: 'manager', competenceIds: ['X11', 'X91'] },
      miniReferentiel(),
    );
    expect(fiche.resultat.metiers.map((m) => m.metierId)).toEqual(['m-e']);
    expect(fiche.transverses).toEqual([
      { competenceId: 'X91', axe: 'management', niveauAttendu: 4, metiersPorteurs: ['m-e'], renvoyeeAuGrade: false },
    ]);
  });

  it('grade inconnu : erreur explicite', () => {
    expect(() => getAttentesTransverses('directeur' as GradeId, ref)).toThrow(ReferentielError);
  });
});
