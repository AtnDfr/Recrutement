import { describe, expect, it } from 'vitest';
import { buildFicheRecruteur, getIntitulesMarche, getSourcing, ReferentielError } from '../engine';
import { loadReferentiels } from '../data/loadReferentiels';
import { miniReferentiel } from './fixtures/mini-referentiel';

const ref = loadReferentiels();

describe('Enrichissement sourcing', () => {
  it('restitue la stratégie de sourcing du référentiel', () => {
    const s = getSourcing('agentic-ai-engineer', ref)!;
    expect(s.vivierCoeur).toEqual({ libelle: 'Cabinet de conseil / ESN / intégrateur', nb: 4, part: 4 / 9 });
    expect(s.vivierSecondaire?.libelle).toBe('Grand groupe / client final');
    expect(s.entreprisesCoeur).toEqual(['Accenture France', 'Converteo', 'Scalian', 'Sopra Steria']);
    expect(s.entreprisesSecondaires).toEqual(['ASI', 'BNP Paribas']);
    expect(s.approche).toBe('Multi-viviers');
    expect(s.confiance).toBe('Forte');
  });

  it('« Aucun vivier secondaire observé » devient null, sans entreprises inventées', () => {
    const s = getSourcing('ai-transformation-adoption-consultant-manager', ref)!;
    expect(s.vivierSecondaire).toBeNull();
    expect(s.entreprisesSecondaires).toEqual([]);
  });

  it('chaque métier a ses intitulés marché, issus des 5 fiches du corpus', () => {
    for (const m of ref.metiers) {
      const intitules = getIntitulesMarche(m.id, ref);
      expect(intitules.length).toBeGreaterThan(0);
      expect(intitules.flatMap((i) => i.entreprises)).toHaveLength(5);
    }
  });

  it('regroupe les intitulés identiques à la casse et aux espaces près', () => {
    expect(getIntitulesMarche('m-a', miniReferentiel())).toEqual([
      { intitule: 'Intitulé fictif m-a', entreprises: ['Entreprise fictive 1', 'Entreprise fictive 2'] },
      { intitule: 'Autre intitulé m-a', entreprises: ['Entreprise fictive 3'] },
    ]);
  });

  it('métier sans fiche de sourcing : null ; métier inconnu : erreur', () => {
    expect(getSourcing('m-c', miniReferentiel())).toBeNull();
    expect(() => getSourcing('inconnu', ref)).toThrow(ReferentielError);
  });

  it('la fiche recruteur contient sourcing et intitulés pour chaque métier retenu, et seulement eux', () => {
    const fiche = buildFicheRecruteur(
      { demandeur: 'Test', date: '2026-10-13', grade: 'consultant', competenceIds: ['C102', 'C041', 'C075'] },
      ref,
    );
    const retenus = fiche.resultat.metiers.map((m) => m.metierId).sort();
    expect(Object.keys(fiche.sourcingParMetier).sort()).toEqual(retenus);
    expect(Object.keys(fiche.intitulesMarche).sort()).toEqual(retenus);
    for (const id of retenus) expect(fiche.sourcingParMetier[id]).toEqual(getSourcing(id, ref));
  });
});
