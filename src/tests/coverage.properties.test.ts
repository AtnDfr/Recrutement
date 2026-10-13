import { describe, expect, it } from 'vitest';
import { buildFicheRecruteur, computeCoverage } from '../engine';
import { combinations } from '../engine/combinations';
import { buildIndex } from '../engine/indexes';
import { couvertes, isValidCombination } from '../engine/scoring';
import { prepareSelection } from '../engine/selection';
import { loadReferentiels } from '../data/loadReferentiels';
import type { GradeId } from '../types';

const ref = loadReferentiels();
const index = buildIndex(ref);

/** Générateur pseudo-aléatoire à graine fixe (mulberry32) : tests reproductibles. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tirages biaisés vers les compétences présentes dans des signatures, pour des cas réalistes.
const enSignature = [...index.metiersParCompetence.keys()].sort();
const toutes = ref.competences.map((c) => c.id);
const rand = rng(42);
const SELECTIONS = Array.from({ length: 150 }, () => {
  const n = 1 + Math.floor(rand() * 8);
  const pool = rand() < 0.8 ? enSignature : toutes;
  return Array.from({ length: n }, () => pool[Math.floor(rand() * pool.length)]!);
});

describe('Propriétés du moteur sur sélections aléatoires (données réelles)', () => {
  it.each(SELECTIONS.map((s, i) => [i, s] as const))('sélection #%i', (_, competenceIds) => {
    const r = computeCoverage(competenceIds, ref);
    const selection = prepareSelection(competenceIds, index);
    const retenus = r.metiers.map((m) => m.metierId);

    // Plafond respecté.
    expect(retenus.length).toBeLessThanOrEqual(ref.config.plafondMetiers);

    // Chaque métier retenu a un apport Core unique sur une compétence déclenchante.
    for (const m of r.metiers) {
      expect(m.apportCoreUnique.length).toBeGreaterThan(0);
      for (const c of m.apportCoreUnique) expect(selection.declenchantes).toContain(c);
    }
    expect(isValidCombination(retenus, selection, index)).toBe(true);

    // Retirer un métier fait perdre de la couverture.
    const couverture = couvertes(selection.toutes, retenus, index).length;
    for (const m of retenus) {
      expect(couvertes(selection.toutes, retenus.filter((x) => x !== m), index).length).toBeLessThan(couverture);
    }

    // Partition : nouvelles ∪ résiduels = demande, sans recouvrement.
    const nouvelles = r.metiers.flatMap((m) => m.nouvelles.map((i) => i.competenceId));
    const residuelles = r.residuels.map((x) => x.competenceId);
    expect([...nouvelles, ...residuelles].sort()).toEqual(selection.toutes);
    expect(new Set(nouvelles).size).toBe(nouvelles.length);

    // Une compétence partagée a toujours été couverte par un métier de rang inférieur.
    const vues = new Set<string>();
    for (const m of r.metiers) {
      for (const p of m.partagees) expect(vues.has(p.competenceId)).toBe(true);
      for (const n of m.nouvelles) vues.add(n.competenceId);
    }

    // Minimalité : aucune combinaison valide plus petite ne couvre autant de compétences déclenchantes.
    const declCouvertes = couvertes(selection.declenchantes, retenus, index).length;
    const candidats = index.metierIds;
    for (let k = 0; k < retenus.length; k++) {
      for (const combi of combinations(candidats, k)) {
        if (!isValidCombination(combi, selection, index)) continue;
        expect(couvertes(selection.declenchantes, combi, index).length).toBeLessThan(declCouvertes);
      }
    }

    // Indépendance à l'ordre de saisie.
    expect(computeCoverage([...competenceIds].reverse(), ref)).toEqual(r);
  });

  it('le grade n’a aucun effet sur les métiers, quelle que soit la sélection', () => {
    const grades: GradeId[] = ['analyste', 'consultant', 'consultant-senior', 'manager', 'senior-manager'];
    for (const competenceIds of SELECTIONS.slice(0, 40)) {
      const fiches = grades.map((grade) =>
        buildFicheRecruteur({ demandeur: 'Test', date: '2026-10-13', grade, competenceIds }, ref),
      );
      for (const f of fiches) expect(f.resultat).toEqual(fiches[0]!.resultat);
    }
  });
});
