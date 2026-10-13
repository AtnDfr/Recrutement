import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFicheRecruteur } from '../engine';
import { loadReferentiels } from '../data/loadReferentiels';
import type { GradeId } from '../types';

const ref = loadReferentiels();
const { cas } = JSON.parse(readFileSync(join(__dirname, '..', '..', 'validation', 'cas.json'), 'utf8')) as {
  cas: Array<{ id: string; grade: GradeId; selection?: string[]; termes?: string[]; texte?: string }>;
};

describe('Cas du harnais de validation (validation/cas.json)', () => {
  it.each(cas.map((c) => [c.id, c] as const))('%s : entrées valides et fiche produite', (_, c) => {
    const competenceIds = (c.selection ?? []).map((nom) => {
      const comp = ref.competences.find((x) => x.nom === nom || x.id === nom);
      expect(comp, `sélection « ${nom} »`).toBeDefined();
      return comp!.id;
    });
    const fiche = buildFicheRecruteur(
      {
        demandeur: 'Test',
        date: '2026-10-13',
        grade: c.grade,
        competenceIds,
        ...(c.termes ? { termes: c.termes } : {}),
        ...(c.texte ? { texte: c.texte } : {}),
      },
      ref,
    );
    expect(fiche.resultat.metiers.length).toBeLessThanOrEqual(ref.config.plafondMetiers);
  });
});
