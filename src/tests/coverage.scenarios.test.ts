import { describe, expect, it } from 'vitest';
import { computeCoverage } from '../engine';
import { loadReferentiels } from '../data/loadReferentiels';
import type { ResultatCouverture } from '../types';

const ref = loadReferentiels();
const id = (nom: string): string => {
  const c = ref.competences.find((x) => x.nom === nom);
  if (!c) throw new Error(`Compétence absente du référentiel : ${nom}`);
  return c.id;
};
const resume = (r: ResultatCouverture) =>
  r.metiers.map((m) => ({
    metier: m.metierId,
    nouvelles: m.nouvelles.map((i) => ref.competences.find((c) => c.id === i.competenceId)!.nom),
    partagees: m.partagees.map((i) => ref.competences.find((c) => c.id === i.competenceId)!.nom),
  }));

describe('Scénarios sur les référentiels réels', () => {
  it('besoin data engineering pur : un seul métier', () => {
    const r = computeCoverage(['Conception de pipelines de données', 'ETL / ELT', 'Python', 'SQL'].map(id), ref);
    expect(r.metiers.map((m) => m.metierId)).toEqual(['senior-data-engineer']);
    expect(r.residuels).toEqual([]);
  });

  it('besoin data science + data engineering : deux métiers, Python partagé', () => {
    const r = computeCoverage(
      ['Python', 'SQL', 'Conception de pipelines de données', 'Machine Learning', 'Expérimentation'].map(id),
      ref,
    );
    expect(resume(r)).toEqual([
      {
        metier: 'applied-scientist-ai-scientist',
        nouvelles: ['Expérimentation', 'Machine Learning', 'Python'],
        partagees: [],
      },
      { metier: 'senior-data-engineer', nouvelles: ['Conception de pipelines de données', 'SQL'], partagees: ['Python'] },
    ]);
    expect(r.residuels).toEqual([]);
    expect(r.metiers[0]!.alternatives).toEqual(['senior-data-scientist']);
  });

  it('GenAI + Databricks + Relation client : deux métiers, la relation client renvoyée au grade', () => {
    const r = computeCoverage(
      ['Python', 'Databricks', 'Prompt engineering', 'Protocoles MCP / A2A', 'Relation client'].map(id),
      ref,
    );
    expect(r.metiers.map((m) => m.metierId)).toEqual(['genai-llm-engineer', 'databricks-platform-architect']);
    expect(r.residuels.map((x) => [x.competenceId, x.motif])).toEqual([[id('Relation client'), 'transverse-vers-grade']]);
    expect(r.tauxCouverture).toBeCloseTo(0.8);
  });

  it('uniquement des compétences transverses : aucun métier', () => {
    const r = computeCoverage(['Relation client', 'Business development'].map(id), ref);
    expect(r.metiers).toEqual([]);
    expect(r.residuels.every((x) => x.motif === 'transverse-vers-grade')).toBe(true);
  });

  it('besoin très large : plafond de 3 métiers, le reste signalé', () => {
    const r = computeCoverage(
      ['Stratégie Data & IA', 'Vision produit', 'Architecture cloud', 'Kubernetes', 'Statistiques'].map(id),
      ref,
    );
    expect(r.metiers).toHaveLength(3);
    expect(r.metiers[0]!.metierId).toBe('data-ai-product-strategy-consultant');
    expect(r.residuels).toHaveLength(1);
    expect(r.residuels[0]!.motif).toBe('plafond-atteint');
    expect(r.residuels[0]!.metiersCandidats.length).toBeGreaterThan(0);
  });

  it('compétence générique seule : un métier, ambiguïté signalée', () => {
    const r = computeCoverage([id('Python')], ref);
    expect(r.metiers).toHaveLength(1);
    expect(r.ambigu).toBe(true);
    expect(r.metiers[0]!.alternatives.length).toBeGreaterThan(0);
  });
});
