import { describe, expect, it } from 'vitest';
import {
  buildFicheRecruteur,
  cleDeCorrespondance,
  detecterDansTexte,
  normaliserTerme,
  normaliserTermes,
} from '../engine';
import { loadReferentiels } from '../data/loadReferentiels';

const ref = loadReferentiels();
const id = (nom: string): string => {
  const c = ref.competences.find((x) => x.nom === nom);
  if (!c) throw new Error(`Compétence absente du référentiel : ${nom}`);
  return c.id;
};

describe('Normalisation d’une formulation (données réelles)', () => {
  it('nom canonique exact', () => {
    expect(normaliserTerme('Python', ref)).toEqual({
      statut: 'reconnu',
      original: 'Python',
      competenceId: id('Python'),
      via: 'nom-canonique',
      formeReferentiel: 'Python',
    });
  });

  it('insensible à la casse, aux accents, aux espaces superflus ; formulation d’origine conservée', () => {
    const t = normaliserTerme('  evaluation   DE modeles ml ', ref)!;
    expect(t).toMatchObject({ statut: 'reconnu', competenceId: id('Évaluation de modèles ML'), via: 'nom-canonique' });
    expect(t.original).toBe('  evaluation   DE modeles ml ');
  });

  it('apostrophes, tirets et espaces autour de « / » unifiés', () => {
    expect(normaliserTerme("Management d'équipe", ref)).toMatchObject({ competenceId: id('Management d’équipe') });
    expect(normaliserTerme('ETL/ELT', ref)).toMatchObject({ competenceId: id('ETL / ELT') });
    expect(normaliserTerme('C#/.NET', ref)).toMatchObject({ competenceId: id('C# / .NET') });
    expect(normaliserTerme('Systèmes multi agents', ref)).toMatchObject({ competenceId: id('Systèmes multi-agents') });
  });

  it('synonymes du référentiel vers la compétence canonique', () => {
    expect(normaliserTerme('K8s', ref)).toMatchObject({
      statut: 'reconnu',
      competenceId: id('Kubernetes'),
      via: 'synonyme',
      formeReferentiel: 'K8s',
    });
    expect(normaliserTerme('amazon web services', ref)).toMatchObject({ competenceId: id('AWS'), via: 'synonyme' });
    expect(normaliserTerme('vision par ordinateur', ref)).toMatchObject({ competenceId: id('Computer Vision') });
  });

  it('identifiant de compétence', () => {
    expect(normaliserTerme('c102', ref)).toMatchObject({ statut: 'reconnu', competenceId: 'C102', via: 'identifiant' });
    expect(normaliserTerme('C999', ref)).toEqual({ statut: 'non-reconnu', original: 'C999' });
  });

  it('forme ambiguë : candidats exposés, jamais résolue automatiquement', () => {
    expect(normaliserTerme('Spark SQL', ref)).toEqual({
      statut: 'ambigu',
      original: 'Spark SQL',
      candidats: [
        { competenceId: id('Apache Spark / PySpark'), via: 'synonyme', formeReferentiel: 'Spark SQL' },
        { competenceId: id('SQL'), via: 'synonyme', formeReferentiel: 'Spark SQL' },
      ],
    });
    expect(normaliserTerme('data transformation', ref)).toMatchObject({ statut: 'ambigu' });
  });

  it('« Monitoring » : nom canonique d’une compétence et synonyme d’une autre → ambigu, pas de choix silencieux', () => {
    const t = normaliserTerme('Monitoring', ref)!;
    expect(t.statut).toBe('ambigu');
    if (t.statut !== 'ambigu') return;
    expect(t.candidats).toEqual([
      { competenceId: id('Monitoring'), via: 'nom-canonique', formeReferentiel: 'Monitoring' },
      { competenceId: id('Observabilité'), via: 'synonyme', formeReferentiel: 'monitoring' },
    ]);
  });

  it('forme susceptible de changer le sens (« CV », « TypeScript »…) : à confirmer, jamais appliquée', () => {
    expect(normaliserTerme('CV', ref)).toEqual({
      statut: 'a-confirmer',
      original: 'CV',
      candidats: [{ competenceId: id('Computer Vision'), via: 'synonyme', formeReferentiel: 'CV' }],
      raison: ref.config.formesAConfirmer['CV'],
    });
    expect(normaliserTerme('typescript', ref)).toMatchObject({
      statut: 'a-confirmer',
      candidats: [{ competenceId: id('Node.js / JavaScript') }],
    });
    // Les autres formes de la même compétence restent reconnues normalement.
    expect(normaliserTerme('computer vision', ref)).toMatchObject({ statut: 'reconnu', competenceId: id('Computer Vision') });
    expect(normaliserTerme('JavaScript', ref)).toMatchObject({ statut: 'reconnu' });
  });

  it('terme inconnu : signalé, jamais rapproché d’une compétence voisine', () => {
    for (const terme of ['Pythonn', 'Kubernetess', 'Talend', 'Python avancé', 'Machine', 'Learning', 'data']) {
      expect(normaliserTerme(terme, ref), terme).toEqual({ statut: 'non-reconnu', original: terme });
    }
  });

  it('saisie vide ignorée', () => {
    expect(normaliserTerme('   ', ref)).toBeNull();
  });
});

describe('Normalisation d’une liste de formulations', () => {
  it('trace complète, dédoublonnage, seules les compétences non ambiguës sont retenues', () => {
    const r = normaliserTermes(['Python', 'python ', 'C102', 'K8s', 'Spark SQL', 'CV', 'Talend', ''], ref);
    expect(r.termes.map((t) => [t.original, t.statut])).toEqual([
      ['Python', 'reconnu'],
      ['python ', 'reconnu'],
      ['C102', 'reconnu'],
      ['K8s', 'reconnu'],
      ['Spark SQL', 'ambigu'],
      ['CV', 'a-confirmer'],
      ['Talend', 'non-reconnu'],
    ]);
    expect(r.competenceIds).toEqual([id('Python'), id('Kubernetes')]);
    expect(r.ambigus.map((t) => t.original)).toEqual(['Spark SQL']);
    expect(r.aConfirmer.map((t) => t.original)).toEqual(['CV']);
    expect(r.nonReconnus.map((t) => t.original)).toEqual(['Talend']);
  });

  it('ne crée jamais de compétence : tout identifiant produit existe dans le référentiel', () => {
    const avant = ref.competences.length;
    const r = normaliserTermes(['Nouvelle compétence inventée', 'Python', 'GenAI Ops'], ref);
    expect(ref.competences).toHaveLength(avant);
    const ids = new Set(ref.competences.map((c) => c.id));
    for (const c of r.competenceIds) expect(ids.has(c)).toBe(true);
  });

  it('exhaustif : chaque nom canonique et chaque synonyme se rattache à sa propre compétence', () => {
    for (const c of ref.competences) {
      for (const forme of [c.nom, ...c.synonymes]) {
        const t = normaliserTerme(forme, ref)!;
        const ids =
          t.statut === 'reconnu' ? [t.competenceId] : t.statut === 'non-reconnu' ? [] : t.candidats.map((x) => x.competenceId);
        expect(ids, `${forme} → ${c.id}`).toContain(c.id);
      }
    }
    const aConfirmer = new Set(Object.keys(ref.config.formesAConfirmer).map(cleDeCorrespondance));
    for (const s of ref.synonymes) {
      const t = normaliserTerme(s.forme, ref)!;
      const attendu = aConfirmer.has(cleDeCorrespondance(s.forme))
        ? 'a-confirmer'
        : s.competenceIds.length > 1
          ? 'ambigu'
          : 'reconnu';
      expect(t.statut, s.forme).toBe(attendu);
    }
  });

  it('les seules formes ambiguës sont celles identifiées dans les données', () => {
    const formes = [...ref.competences.flatMap((c) => [c.nom, ...c.synonymes]), ...ref.synonymes.map((s) => s.forme)];
    const ambigues = new Set(
      formes.filter((f) => normaliserTerme(f, ref)!.statut === 'ambigu').map((f) => cleDeCorrespondance(f)),
    );
    expect([...ambigues].sort()).toEqual(['data transformation', 'monitoring', 'spark sql']);
  });
});

describe('Détection dans un texte libre (suggestions)', () => {
  const texte = 'Besoin d’un profil Spark SQL sur Data Lake, à l’aise en Python et en K8s ; un peu de run.';

  it('repère les formes entières, la plus longue d’abord, avec l’extrait original et sa position', () => {
    const d = detecterDansTexte(texte, ref);
    expect(d.map((x) => x.extrait)).toEqual(['Spark SQL', 'Data Lake', 'Python', 'K8s', 'run']);
    for (const x of d) expect(texte.slice(x.debut, x.fin)).toBe(x.extrait);
  });

  it('signale les formes ambiguës et les formes courtes', () => {
    const d = detecterDansTexte(texte, ref);
    const spark = d.find((x) => x.extrait === 'Spark SQL')!;
    expect(spark.ambigu).toBe(true);
    expect(spark.candidats.map((c) => c.competenceId)).toEqual([id('Apache Spark / PySpark'), id('SQL')]);
    // « Data Lake » est consommée en entier : « lake » n'est pas détecté séparément.
    expect(d.filter((x) => x.extrait.toLowerCase().includes('lake'))).toHaveLength(1);
    expect(d.find((x) => x.extrait === 'run')!.formeCourte).toBe(true);
    expect(d.find((x) => x.extrait === 'run')!.aConfirmer).toBe(ref.config.formesAConfirmer['run']);
    expect(d.find((x) => x.extrait === 'Python')!.aConfirmer).toBeNull();
    expect(d.find((x) => x.extrait === 'Python')!.formeCourte).toBe(false);
  });

  it('ne détecte pas une forme à l’intérieur d’un mot', () => {
    expect(detecterDansTexte('Code pythonique et SQLite, runtime', ref)).toEqual([]);
  });

  it('positions justes malgré accents et ligatures', () => {
    const t = 'Œuvre : évaluation de modèles ML.';
    const d = detecterDansTexte(t, ref);
    expect(d.map((x) => x.extrait)).toEqual(['évaluation de modèles ML']);
  });
});

describe('Normalisation dans la fiche recruteur', () => {
  it('termes reconnus transmis au moteur, ambigus et inconnus seulement tracés', () => {
    const fiche = buildFicheRecruteur(
      {
        demandeur: 'Test',
        date: '2026-10-13',
        grade: 'consultant',
        competenceIds: [id('SQL')],
        termes: ['pipelines de données', 'etl', 'python', 'Spark SQL', 'Talend'],
      },
      ref,
    );
    expect(fiche.normalisation!.termes.map((t) => t.statut)).toEqual([
      'reconnu',
      'reconnu',
      'reconnu',
      'ambigu',
      'non-reconnu',
    ]);
    const attendus = [id('SQL'), ...fiche.normalisation!.competenceIds];
    expect(fiche.competencesAnalysees).toEqual([...new Set(attendus)]);
    expect(fiche.competencesAnalysees).not.toContain(id('Apache Spark / PySpark'));
    expect(fiche.demande.termes).toEqual(['pipelines de données', 'etl', 'python', 'Spark SQL', 'Talend']);
  });

  it('le texte libre et la transcription ne produisent que des suggestions', () => {
    const fiche = buildFicheRecruteur(
      {
        demandeur: 'Test',
        date: '2026-10-13',
        grade: 'manager',
        competenceIds: [],
        texte: 'Profil Kubernetes',
        transcription: 'il faut du Python',
      },
      ref,
    );
    expect(fiche.competencesAnalysees).toEqual([]);
    expect(fiche.resultat.metiers).toEqual([]);
    expect(fiche.detectionsTexte.texte.map((d) => d.extrait)).toEqual(['Kubernetes']);
    expect(fiche.detectionsTexte.transcription.map((d) => d.extrait)).toEqual(['Python']);
    expect(fiche.normalisation).toBeNull();
  });
});
