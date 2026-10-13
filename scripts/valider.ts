/**
 * Harnais de validation métier (sans interface).
 *
 *   npm run valider
 *       joue validation/cas.json et écrit validation/rapport.md
 *
 *   npm run valider -- --grade manager --selection "Databricks; Leadership technique" \
 *                      --termes "Kubernetes, MLOps" --texte "phrase libre"
 *       joue un cas ponctuel et l'affiche dans le terminal
 *
 * « selection » : compétences cochées par le SM (nom canonique ou identifiant exact, séparés par « ; »).
 * « termes » : formulations libres, normalisées (découpage sur « , », « ; », retours à la ligne).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFicheRecruteur } from '../src/engine';
import { loadReferentiels } from '../src/data/loadReferentiels';
import type {
  CompetenceId,
  DemandeInput,
  DetectionTexte,
  FicheRecruteur,
  GradeId,
  MetierId,
  MotifResiduel,
  OrigineCompetence,
} from '../src/types';

interface Cas {
  id: string;
  titre: string;
  grade: GradeId;
  selection?: string[];
  termes?: string[];
  texte?: string;
  hypothese?: string;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = loadReferentiels();

const nomCompetence = (id: CompetenceId) => ref.competences.find((c) => c.id === id)?.nom ?? id;
const nomMetier = (id: MetierId) => ref.metiers.find((m) => m.id === id)?.nom ?? id;
const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Sélection explicite : nom canonique ou identifiant exact, sinon erreur (pas de normalisation ici). */
function resoudreSelection(noms: readonly string[]): CompetenceId[] {
  return noms.map((n) => {
    const c = ref.competences.find((x) => x.nom === n.trim() || x.id === n.trim().toUpperCase());
    if (!c) throw new Error(`Sélection : « ${n} » n'est ni un nom canonique ni un identifiant du référentiel`);
    return c.id;
  });
}

const ORIGINE: Record<OrigineCompetence, string> = {
  selection: 'sélection SM',
  'terme-identifiant': 'saisie (identifiant)',
  'terme-nom-canonique': 'saisie (nom canonique)',
  'terme-synonyme': 'saisie (synonyme)',
  'terme-compose': 'saisie (forme composée)',
  texte: 'détection texte',
  transcription: 'détection vocal',
};

const MOTIF: Record<MotifResiduel, string> = {
  'hors-signatures': 'dans aucune signature métier',
  'transverse-vers-grade': 'transverse, portée par le grade',
  'non-core-uniquement': 'jamais en Core dans les métiers candidats',
  'plafond-atteint': 'plafond de métiers atteint',
  'arbitrage-couverture': 'écartée par arbitrage de couverture',
};

function signalementsDetection(d: DetectionTexte, source: string): string | null {
  if (d.sure) return null;
  const cands = d.candidats.map((c) => nomCompetence(c.competenceId)).join(' / ');
  if (d.aConfirmer) return `« ${d.extrait} » (${source}) → ${cands} : à confirmer — ${d.aConfirmer}`;
  if (d.ambigu) return `« ${d.extrait} » (${source}) → ambigu : ${cands}`;
  if (d.formeCourte) return `« ${d.extrait} » (${source}) → ${cands} : forme courte dont la casse diffère du référentiel, non injectée`;
  return `« ${d.extrait} » (${source}) → ${cands} : non injectée`;
}

function rendreFiche(fiche: FicheRecruteur, cas: Pick<Cas, 'titre' | 'hypothese'>): string {
  const l: string[] = [];
  const { demande, resultat } = fiche;
  l.push(`## ${cas.titre}`, '');
  if (demande.texte) l.push(`> ${demande.texte}`, '');
  l.push(`**Grade :** ${fiche.gradeLibelle}`);
  if (cas.hypothese) l.push(`**Hypothèse de sélection :** ${cas.hypothese}`);
  l.push('');

  l.push('### Compétences analysées');
  if (!fiche.competencesAnalysees.length) l.push('_Aucune compétence sûre : rien n’est transmis au moteur._');
  for (const c of fiche.competencesAnalysees) {
    const f = c.formulation ? ` — « ${c.formulation} »` : '';
    l.push(`- ${nomCompetence(c.competenceId)} (${c.competenceId}) · ${ORIGINE[c.origine]}${f}`);
  }
  l.push('');

  const signalements: string[] = [];
  for (const t of fiche.normalisation?.termes ?? []) {
    if (t.statut === 'non-reconnu') signalements.push(`« ${t.original} » (saisie) → non reconnu dans le référentiel`);
    if (t.statut === 'ambigu') {
      signalements.push(`« ${t.original} » (saisie) → ambigu : ${t.candidats.map((c) => nomCompetence(c.competenceId)).join(' / ')}`);
    }
    if (t.statut === 'a-confirmer') signalements.push(`« ${t.original} » (saisie) → à confirmer — ${t.raison}`);
    if (t.statut === 'reconnu' && t.concurrents.length) {
      signalements.push(
        `« ${t.original} » (saisie) → ${nomCompetence(t.competenceId)} (nom canonique), plutôt que ` +
          t.concurrents.map((c) => nomCompetence(c.competenceId)).join(' / '),
      );
    }
  }
  for (const d of fiche.detectionsTexte.texte) {
    const s = signalementsDetection(d, 'texte');
    if (s) signalements.push(s);
  }
  for (const d of fiche.detectionsTexte.transcription) {
    const s = signalementsDetection(d, 'vocal');
    if (s) signalements.push(s);
  }
  if (resultat.ambigu) signalements.push('Choix de métier ambigu : des combinaisons équivalentes existent (voir alternatives).');
  l.push('### Ambiguïtés et signalements');
  l.push(...(signalements.length ? signalements.map((s) => `- ${s}`) : ['_Aucun._']), '');

  l.push(`### Métiers proposés (couverture ${pct(resultat.tauxCouverture)})`);
  if (!resultat.metiers.length) l.push('_Aucun métier._');
  for (const m of resultat.metiers) {
    l.push(`${m.rang}. **${nomMetier(m.metierId)}**`);
    l.push(`   - Justifié par : ${m.apportCoreUnique.map(nomCompetence).join(', ')}`);
    l.push(`   - Couvre : ${m.nouvelles.map((i) => `${nomCompetence(i.competenceId)} (${i.statut})`).join(', ')}`);
    if (m.partagees.length) {
      l.push(`   - Partage aussi : ${m.partagees.map((i) => `${nomCompetence(i.competenceId)} (${i.statut})`).join(', ')}`);
    }
    if (m.alternatives.length) l.push(`   - Alternatives équivalentes : ${m.alternatives.map(nomMetier).join(', ')}`);
  }
  l.push('');

  l.push('### Compétences transverses et grade');
  for (const t of fiche.transverses) {
    const axe = fiche.attentesTransverses.find((a) => a.axe === t.axe)!;
    const porteurs = t.metiersPorteurs.length ? `aussi dans ${t.metiersPorteurs.map(nomMetier).join(', ')}` : 'portée par le grade seul';
    l.push(`- ${nomCompetence(t.competenceId)} → ${axe.libelle}, niveau attendu ${t.niveauAttendu}/${fiche.echelle.max} (${porteurs})`);
  }
  l.push(
    `- Attentes ${fiche.gradeLibelle} : ` +
      fiche.attentesTransverses.map((a) => `${a.libelle} ${a.niveau}/${fiche.echelle.max}`).join(' · '),
    '',
  );

  l.push('### Compétences résiduelles');
  if (!resultat.residuels.length) l.push('_Aucune._');
  for (const r of resultat.residuels) {
    const cands = r.metiersCandidats.length ? ` — candidats : ${r.metiersCandidats.map(nomMetier).join(', ')}` : '';
    l.push(`- ${nomCompetence(r.competenceId)} : ${MOTIF[r.motif]}${cands}`);
    for (const a of r.arbitrages ?? []) l.push(`   - ${a.raison}`);
  }
  l.push('');

  l.push('### Sourcing proposé');
  for (const m of resultat.metiers) {
    const s = fiche.sourcingParMetier[m.metierId];
    l.push(`**${nomMetier(m.metierId)}**`);
    if (!s) {
      l.push('- _Pas de stratégie de sourcing dans le référentiel._');
    } else {
      const sec = s.vivierSecondaire ? `${s.vivierSecondaire.libelle} (${pct(s.vivierSecondaire.part)})` : 'aucun observé';
      l.push(`- Vivier cœur : ${s.vivierCoeur.libelle} (${pct(s.vivierCoeur.part)}) · secondaire : ${sec}`);
      l.push(`- Approche : ${s.approche} · confiance : ${s.confiance} (${s.nbEmployeurs} employeurs observés)`);
      l.push(`- Entreprises cœur : ${s.entreprisesCoeur.join(', ') || '—'}`);
      if (s.entreprisesSecondaires.length) l.push(`- Entreprises adjacentes : ${s.entreprisesSecondaires.join(', ')}`);
      l.push(`- Points à vérifier : ${s.pointsAVerifier.join(' ; ')}`);
    }
    const intitules = fiche.intitulesMarche[m.metierId] ?? [];
    l.push(`- Intitulés marché : ${intitules.map((i) => `${i.intitule} (${i.entreprises.join(', ')})`).join(' · ')}`);
  }
  if (!resultat.metiers.length) l.push('_Aucun métier, donc pas de sourcing._');
  l.push('');

  l.push('### Validation recruteur');
  l.push('- [ ] Oui, c’est le(s) profil(s) que j’aurais cherché(s) après échange avec le SM');
  l.push('- [ ] Non — profil attendu : …');
  l.push('- Commentaire : …', '');
  return l.join('\n');
}

function jouer(cas: Cas): FicheRecruteur {
  const demande: DemandeInput = {
    demandeur: 'Harnais de validation',
    date: new Date().toISOString().slice(0, 10),
    grade: cas.grade,
    competenceIds: resoudreSelection(cas.selection ?? []),
    ...(cas.termes ? { termes: cas.termes } : {}),
    ...(cas.texte ? { texte: cas.texte } : {}),
  };
  return buildFicheRecruteur(demande, ref);
}

function argument(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    const selection = argument('selection');
    const termes = argument('termes');
    const texte = argument('texte');
    const cas: Cas = {
      id: 'ponctuel',
      titre: 'Cas ponctuel',
      grade: (argument('grade') ?? 'consultant') as GradeId,
      ...(selection ? { selection: selection.split(';').filter((s) => s.trim()) } : {}),
      ...(termes ? { termes: [termes] } : {}),
      ...(texte ? { texte } : {}),
    };
    console.log(rendreFiche(jouer(cas), cas));
    return;
  }

  const fichier = JSON.parse(await readFile(join(ROOT, 'validation', 'cas.json'), 'utf8')) as { cas: Cas[] };
  const sections = fichier.cas.map((c) => rendreFiche(jouer(c), c));
  const entete = [
    '# Rapport de validation métier',
    '',
    `Généré par \`npm run valider\` à partir de \`validation/cas.json\` (${fichier.cas.length} cas).`,
    'Question à se poser pour chaque cas : le recruteur aurait-il effectivement cherché ces profils après une discussion avec le SM ?',
    '',
    '---',
    '',
  ].join('\n');
  await writeFile(join(ROOT, 'validation', 'rapport.md'), entete + sections.join('\n---\n\n'));
  console.log(`Rapport écrit : validation/rapport.md (${fichier.cas.length} cas).`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
