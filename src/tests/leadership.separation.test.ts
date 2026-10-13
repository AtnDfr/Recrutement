/**
 * Séparation grade / métier pour « Leadership technique » (rattachée à l'axe Leadership du grade).
 * Le grade porte la dimension de séniorité / leadership ; le métier continue de porter les
 * compétences techniques et fonctionnelles. Le rattachement au grade ne doit ni supprimer
 * ni neutraliser la dimension technique du besoin.
 */
import { describe, expect, it } from 'vitest';
import { buildFicheRecruteur, computeCoverage } from '../engine';
import { loadReferentiels } from '../data/loadReferentiels';
import type { GradeId } from '../types';

const ref = loadReferentiels();
const id = (nom: string): string => {
  const c = ref.competences.find((x) => x.nom === nom);
  if (!c) throw new Error(`Compétence absente du référentiel : ${nom}`);
  return c.id;
};
const LEADERSHIP = id('Leadership technique');
const DATA_ENGINEERING = ['Conception de pipelines de données', 'ETL / ELT', 'Python', 'SQL'].map(id);
const GRADES: GradeId[] = ['analyste', 'consultant', 'consultant-senior', 'manager', 'senior-manager'];
const fiche = (grade: GradeId, competenceIds: string[]) =>
  buildFicheRecruteur({ demandeur: 'Test', date: '2026-10-13', grade, competenceIds }, ref);

describe('Leadership technique : rattachement au grade sans neutraliser la dimension technique', () => {
  it('Leadership technique est bien rattachée à l’axe Leadership', () => {
    expect(ref.config.competencesTransverses[LEADERSHIP]).toBe('leadership');
  });

  it('seule, elle ne crée aucun métier : la séniorité relève du grade', () => {
    const r = computeCoverage([LEADERSHIP], ref);
    expect(r.metiers).toEqual([]);
    expect(r.residuels).toEqual([
      expect.objectContaining({ competenceId: LEADERSHIP, motif: 'transverse-vers-grade' }),
    ]);
  });

  it('les compétences techniques identifient le métier, avec ou sans leadership demandé', () => {
    const sans = computeCoverage(DATA_ENGINEERING, ref);
    const avec = computeCoverage([...DATA_ENGINEERING, LEADERSHIP], ref);
    expect(sans.metiers.map((m) => m.metierId)).toEqual(['senior-data-engineer']);
    expect(avec.metiers).toHaveLength(1);
    // Aucune compétence technique n'est perdue quand le leadership est ajouté.
    const couvertes = avec.metiers.flatMap((m) => m.nouvelles.map((i) => i.competenceId));
    for (const c of DATA_ENGINEERING) expect(couvertes).toContain(c);
    expect(avec.residuels).toEqual([]);
  });

  it('demandée avec un besoin technique, elle contribue à identifier le métier qui la porte', () => {
    const r = computeCoverage([...DATA_ENGINEERING, LEADERSHIP], ref);
    expect(r.metiers.map((m) => m.metierId)).toEqual(['lead-principal-data-engineer']);
    expect(r.ambigu).toBe(false);
    const lead = r.metiers[0]!;
    expect(lead.nouvelles).toContainEqual({ competenceId: LEADERSHIP, statut: 'Core' });
    // Mais la justification du métier reste technique : le leadership ne la constitue jamais.
    expect(lead.apportCoreUnique).not.toContain(LEADERSHIP);
    expect(lead.apportCoreUnique.length).toBeGreaterThan(0);
  });

  it('elle lève une ambiguïté entre deux métiers techniques équivalents', () => {
    const technique = ['Databricks', 'Apache Spark / PySpark'].map(id);
    const sans = computeCoverage(technique, ref);
    const avec = computeCoverage([...technique, LEADERSHIP], ref);
    expect(sans.ambigu).toBe(true);
    expect([sans.metiers[0]!.metierId, ...sans.metiers[0]!.alternatives].sort()).toEqual([
      'databricks-tech-lead-expert-engineer',
      'senior-databricks-data-engineer',
    ]);
    expect(avec.metiers.map((m) => m.metierId)).toEqual(['databricks-tech-lead-expert-engineer']);
    expect(avec.ambigu).toBe(false);
  });

  it('si aucun métier retenu ne la porte, le besoin technique est couvert et le leadership renvoyé au grade', () => {
    const kubernetes = id('Kubernetes');
    const r = computeCoverage([kubernetes, LEADERSHIP], ref);
    expect(r.metiers).toHaveLength(1);
    expect(r.metiers[0]!.nouvelles.map((i) => i.competenceId)).toEqual([kubernetes]);
    expect(r.residuels).toEqual([expect.objectContaining({ competenceId: LEADERSHIP, motif: 'transverse-vers-grade' })]);
  });

  it('le grade ne change ni les métiers ni la couverture technique quand le leadership est demandé', () => {
    const fiches = GRADES.map((g) => fiche(g, [...DATA_ENGINEERING, LEADERSHIP]));
    for (const f of fiches) expect(f.resultat).toEqual(fiches[0]!.resultat);
  });

  it('le grade porte toujours le niveau de leadership attendu, même quand le métier porte aussi la compétence', () => {
    const niveaux = GRADES.map((g) => {
      const t = fiche(g, [...DATA_ENGINEERING, LEADERSHIP]).transverses;
      expect(t).toEqual([
        {
          competenceId: LEADERSHIP,
          axe: 'leadership',
          niveauAttendu: expect.any(Number),
          metiersPorteurs: ['lead-principal-data-engineer'],
          renvoyeeAuGrade: false,
        },
      ]);
      return t[0]!.niveauAttendu;
    });
    expect(niveaux).toEqual([1, 1, 3, 4, 5]);
  });

  it('le métier ne porte pas le niveau de séniorité : seules les compétences de sa signature y figurent', () => {
    const f = fiche('manager', [...DATA_ENGINEERING, LEADERSHIP]);
    const metier = f.resultat.metiers[0]!;
    expect(Object.keys(metier).sort()).toEqual(
      ['alternatives', 'apportCoreUnique', 'metierId', 'nouvelles', 'partagees', 'rang'].sort(),
    );
    expect(f.attentesTransverses.find((a) => a.axe === 'leadership')!.niveau).toBe(4);
  });
});
