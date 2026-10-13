import { describe, expect, it } from 'vitest';
import {
  buildFicheRecruteur,
  cleDeCorrespondance,
  detecterDansTexte,
  normaliserTerme,
  normaliserTermes,
} from '../engine';
import { loadReferentiels } from '../data/loadReferentiels';
import type { DemandeInput } from '../types';

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
      saisie: 'Python',
      competenceId: id('Python'),
      via: 'nom-canonique',
      formeReferentiel: 'Python',
      concurrents: [],
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
    expect(normaliserTerme('C999', ref)).toMatchObject({ statut: 'non-reconnu', original: 'C999' });
  });

  it('nom canonique > synonyme : « Monitoring » saisi est rattaché à C059, le concurrent est tracé', () => {
    expect(normaliserTerme('Monitoring', ref)).toEqual({
      statut: 'reconnu',
      original: 'Monitoring',
      saisie: 'Monitoring',
      competenceId: id('Monitoring'),
      via: 'nom-canonique',
      formeReferentiel: 'Monitoring',
      concurrents: [{ competenceId: id('Observabilité'), via: 'synonyme', formeReferentiel: 'monitoring' }],
    });
  });

  it('forme composée : « Spark SQL » vise Spark et SQL', () => {
    expect(normaliserTerme('Spark SQL', ref)).toEqual({
      statut: 'compose',
      original: 'Spark SQL',
      saisie: 'Spark SQL',
      composantes: [
        { competenceId: id('Apache Spark / PySpark'), via: 'synonyme', formeReferentiel: 'Spark SQL' },
        { competenceId: id('SQL'), via: 'synonyme', formeReferentiel: 'Spark SQL' },
      ],
    });
  });

  it('homonyme sans nom canonique ni composition : ambigu, jamais résolu', () => {
    const t = normaliserTerme('data transformation', ref)!;
    expect(t.statut).toBe('ambigu');
    if (t.statut !== 'ambigu') return;
    expect(t.candidats.map((c) => c.competenceId)).toEqual([id('Transformation de données'), id('Transformation Data & IA')]);
  });

  it('forme susceptible de changer le sens (« CV », « TypeScript »…) : à confirmer, jamais appliquée', () => {
    expect(normaliserTerme('CV', ref)).toEqual({
      statut: 'a-confirmer',
      original: 'CV',
      saisie: 'CV',
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
      expect(normaliserTerme(terme, ref), terme).toEqual({ statut: 'non-reconnu', original: terme, saisie: terme });
    }
  });

  it('saisie vide ignorée', () => {
    expect(normaliserTerme('   ', ref)).toBeNull();
  });
});

describe('Normalisation de saisies (découpage et trace)', () => {
  it('découpe sur « , », « ; » et retours à la ligne ; chaque fragment est normalisé indépendamment', () => {
    const r = normaliserTermes(['Python, SQL; Kubernetes\nDatabricks\r\nMLflow'], ref);
    expect(r.termes.map((t) => [t.original, t.statut])).toEqual([
      ['Python', 'reconnu'],
      ['SQL', 'reconnu'],
      ['Kubernetes', 'reconnu'],
      ['Databricks', 'reconnu'],
      ['MLflow', 'reconnu'],
    ]);
    for (const t of r.termes) expect(t.saisie).toBe('Python, SQL; Kubernetes\nDatabricks\r\nMLflow');
  });

  it('ne découpe jamais sur « / », « + », « & » ou « et »', () => {
    const r = normaliserTermes(['ETL / ELT', 'Stratégie Data & IA', 'Python + SQL', 'Python et SQL'], ref);
    expect(r.termes.map((t) => [t.original, t.statut])).toEqual([
      ['ETL / ELT', 'reconnu'],
      ['Stratégie Data & IA', 'reconnu'],
      ['Python + SQL', 'non-reconnu'],
      ['Python et SQL', 'non-reconnu'],
    ]);
  });

  it('trace complète, dédoublonnage ; seules les compétences sûres sont retenues', () => {
    const r = normaliserTermes(['Python', 'python ', 'C102', 'K8s', 'Spark SQL', 'data transformation', 'CV', 'Talend', ''], ref);
    expect(r.termes.map((t) => [t.original, t.statut])).toEqual([
      ['Python', 'reconnu'],
      ['python', 'reconnu'],
      ['C102', 'reconnu'],
      ['K8s', 'reconnu'],
      ['Spark SQL', 'compose'],
      ['data transformation', 'ambigu'],
      ['CV', 'a-confirmer'],
      ['Talend', 'non-reconnu'],
    ]);
    expect(r.competenceIds).toEqual([id('Python'), id('Kubernetes'), id('Apache Spark / PySpark'), id('SQL')]);
    expect(r.composes.map((t) => t.original)).toEqual(['Spark SQL']);
    expect(r.ambigus.map((t) => t.original)).toEqual(['data transformation']);
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

  it('exhaustif : chaque nom canonique et chaque synonyme se rattache (aussi) à sa propre compétence', () => {
    for (const c of ref.competences) {
      for (const forme of [c.nom, ...c.synonymes]) {
        const t = normaliserTerme(forme, ref)!;
        const ids =
          t.statut === 'reconnu'
            ? [t.competenceId, ...t.concurrents.map((x) => x.competenceId)]
            : t.statut === 'compose'
              ? t.composantes.map((x) => x.competenceId)
              : t.statut === 'non-reconnu'
                ? []
                : t.candidats.map((x) => x.competenceId);
        expect(ids, `${forme} → ${c.id}`).toContain(c.id);
      }
    }
  });

  it('seule « data transformation » reste ambiguë pour une formulation saisie', () => {
    const formes = [...ref.competences.flatMap((c) => [c.nom, ...c.synonymes]), ...ref.synonymes.map((s) => s.forme)];
    const ambigues = new Set(
      formes.filter((f) => normaliserTerme(f, ref)!.statut === 'ambigu').map((f) => cleDeCorrespondance(f)),
    );
    expect([...ambigues]).toEqual(['data transformation']);
  });
});

describe('Détection dans un texte libre', () => {
  const texte = 'Besoin d’un profil Spark SQL sur Data Lake, à l’aise en Python et en K8s ; un peu de run et de monitoring.';

  it('repère les formes entières, la plus longue d’abord, avec l’extrait original et sa position', () => {
    const d = detecterDansTexte(texte, ref);
    expect(d.map((x) => x.extrait)).toEqual(['Spark SQL', 'Data Lake', 'Python', 'K8s', 'run', 'monitoring']);
    for (const x of d) expect(texte.slice(x.debut, x.fin)).toBe(x.extrait);
  });

  it('qualifie chaque détection : sûre, composée, ambiguë, à confirmer', () => {
    const d = Object.fromEntries(detecterDansTexte(texte, ref).map((x) => [x.extrait, x]));
    expect(d['Spark SQL']).toMatchObject({ compose: true, ambigu: false, sure: true });
    expect(d['Spark SQL']!.competenceIds).toEqual([id('Apache Spark / PySpark'), id('SQL')]);
    expect(d['Data Lake']).toMatchObject({ sure: true, competenceIds: [id('Data Lake')] });
    expect(d['K8s']).toMatchObject({ formeCourte: true, sure: true, competenceIds: [id('Kubernetes')] });
    expect(d['run']).toMatchObject({ aConfirmer: ref.config.formesAConfirmer['run'], sure: false, competenceIds: [] });
    // En texte libre, le nom canonique ne départage pas : « monitoring » reste ambigu.
    expect(d['monitoring']).toMatchObject({ ambigu: true, sure: false, competenceIds: [] });
  });

  it('forme courte : sûre seulement si la casse est celle du référentiel', () => {
    const [majuscule] = detecterDansTexte('Expert SQL', ref);
    const [minuscule] = detecterDansTexte('expert sql', ref);
    expect(majuscule).toMatchObject({ formeCourte: true, sure: true });
    expect(minuscule).toMatchObject({ formeCourte: true, sure: false, competenceIds: [] });
    // « Tom » (prénom) ne vaut pas « TOM » (Target Operating Model).
    expect(detecterDansTexte('Voir avec Tom', ref)[0]).toMatchObject({ sure: false });
  });

  it('ne détecte pas une forme à l’intérieur d’un mot', () => {
    expect(detecterDansTexte('Code pythonique et SQLite, runtime', ref)).toEqual([]);
  });

  it('positions justes malgré accents et ligatures', () => {
    const t = 'Œuvre : évaluation de modèles ML.';
    expect(detecterDansTexte(t, ref).map((x) => x.extrait)).toEqual(['évaluation de modèles ML']);
  });
});

describe('Priorité des sources dans la fiche recruteur', () => {
  const base: DemandeInput = { demandeur: 'Test', date: '2026-10-13', grade: 'consultant', competenceIds: [] };

  it('sélection explicite > nom canonique > synonyme > détection sûre', () => {
    const fiche = buildFicheRecruteur(
      {
        ...base,
        competenceIds: [id('SQL')],
        termes: ['sql', 'Python', 'K8s, pipelines de données'],
        texte: 'Profil Python et Kubernetes, avec du MLflow.',
      },
      ref,
    );
    expect(fiche.competencesAnalysees).toEqual([
      { competenceId: id('SQL'), origine: 'selection', formulation: null },
      { competenceId: id('Python'), origine: 'terme-nom-canonique', formulation: 'Python' },
      { competenceId: id('Kubernetes'), origine: 'terme-synonyme', formulation: 'K8s' },
      { competenceId: id('Conception de pipelines de données'), origine: 'terme-synonyme', formulation: 'pipelines de données' },
      { competenceId: id('MLflow'), origine: 'texte', formulation: 'MLflow' },
    ]);
  });

  it('les détections sûres du texte et de la transcription sont injectées automatiquement', () => {
    const fiche = buildFicheRecruteur(
      { ...base, texte: 'Profil Kubernetes', transcription: 'il faut du Python' },
      ref,
    );
    expect(fiche.competencesAnalysees).toEqual([
      { competenceId: id('Kubernetes'), origine: 'texte', formulation: 'Kubernetes' },
      { competenceId: id('Python'), origine: 'transcription', formulation: 'Python' },
    ]);
    expect(fiche.resultat.metiers.length).toBeGreaterThan(0);
  });

  it('ambigu, à confirmer et non reconnu ne sont jamais injectés, ni depuis les termes ni depuis le texte', () => {
    const fiche = buildFicheRecruteur(
      {
        ...base,
        termes: ['data transformation', 'CV', 'Talend'],
        texte: 'Envoyer votre CV ; data transformation, monitoring et un peu de run, sql en minuscules.',
      },
      ref,
    );
    expect(fiche.competencesAnalysees).toEqual([]);
    expect(fiche.resultat.metiers).toEqual([]);
    expect(fiche.detectionsTexte.texte.every((d) => !d.sure)).toBe(true);
    expect(fiche.normalisation!.termes.map((t) => t.statut)).toEqual(['ambigu', 'a-confirmer', 'non-reconnu']);
  });

  it('une forme composée saisie injecte ses deux compétences', () => {
    const fiche = buildFicheRecruteur({ ...base, termes: ['Spark SQL'] }, ref);
    expect(fiche.competencesAnalysees.map((c) => [c.competenceId, c.origine])).toEqual([
      [id('Apache Spark / PySpark'), 'terme-compose'],
      [id('SQL'), 'terme-compose'],
    ]);
  });
});
