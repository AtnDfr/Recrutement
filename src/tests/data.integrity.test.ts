import { describe, expect, it } from 'vitest';
import { loadReferentiels } from '../data/loadReferentiels';
import { validateReferentiels } from '../data/validate';
import { miniReferentiel } from './fixtures/mini-referentiel';

const ref = loadReferentiels();

describe('Intégrité des référentiels réels', () => {
  it('se chargent sans anomalie', () => {
    expect(validateReferentiels(ref)).toEqual([]);
  });

  it('volumétrie attendue des classeurs sources', () => {
    expect(ref.competences).toHaveLength(140);
    expect(ref.metiers).toHaveLength(29);
    expect(ref.sourcing).toHaveLength(29);
    expect(ref.metiers.reduce((n, m) => n + m.signature.length, 0)).toBe(199);
    expect(ref.grades.grades.map((g) => g.id)).toEqual([
      'analyste',
      'consultant',
      'consultant-senior',
      'manager',
      'senior-manager',
    ]);
  });

  it('chaque métier : 6 compétences Core, 5 fiches de 5 entreprises distinctes, une fiche sourcing', () => {
    for (const m of ref.metiers) {
      expect(m.signature.filter((e) => e.statut === 'Core'), m.nom).toHaveLength(6);
      expect(new Set(m.fichesMarche.map((f) => f.entreprise)).size, m.nom).toBe(5);
      expect(ref.sourcing.some((s) => s.metierId === m.id), m.nom).toBe(true);
    }
  });

  it('statuts de signature conformes aux règles (Core ≥ 3/5, Récurrente 2/5, Spécialisante 1/5)', () => {
    for (const m of ref.metiers) {
      for (const e of m.signature) {
        const attendu = e.occurrences >= 3 ? 'Core' : e.occurrences === 2 ? 'Récurrente' : 'Spécialisante';
        expect(e.statut, `${m.nom}/${e.competenceId}`).toBe(attendu);
      }
    }
  });

  it('synonymes ambigus identifiés dans la source', () => {
    const ambigus = ref.synonymes.filter((s) => s.competenceIds.length > 1).map((s) => s.forme.toLowerCase());
    expect(ambigus.sort()).toEqual(['data transformation', 'monitoring', 'spark sql']);
  });

  it('compétences transverses : connues du référentiel et rattachées à un axe', () => {
    const ids = new Set(ref.competences.map((c) => c.id));
    for (const id of Object.keys(ref.config.competencesTransverses)) expect(ids.has(id), id).toBe(true);
  });
});

describe('validateReferentiels', () => {
  it('détecte jointures cassées, niveaux hors échelle et configuration invalide', () => {
    const mini = miniReferentiel({
      plafondMetiers: -1,
      competencesTransverses: { ZZZ: 'management' },
      formesAConfirmer: { 'forme inexistante': 'test' },
    });
    mini.metiers[0]!.signature.push({ competenceId: 'ABSENTE', statut: 'Core', occurrences: 3, base: 5 });
    mini.sourcing.push({ ...mini.sourcing[0]!, metierId: 'fantome' });
    mini.grades.grades[0]!.niveaux.leadership = 9;
    const errors = validateReferentiels(mini);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/ABSENTE/),
        expect.stringMatching(/fantome/),
        expect.stringMatching(/leadership/),
        expect.stringMatching(/plafondMetiers/),
        expect.stringMatching(/ZZZ/),
        expect.stringMatching(/forme inexistante/),
      ]),
    );
  });

  it('le référentiel fictif est cohérent', () => {
    expect(validateReferentiels(miniReferentiel())).toEqual([]);
  });
});
