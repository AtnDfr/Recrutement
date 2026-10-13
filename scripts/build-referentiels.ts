/**
 * Convertit les classeurs sources (data/raw/*.xlsx) en JSON typés (src/data/generated/).
 *
 *   npm run build:data   → écrit les JSON
 *   npm run check:data   → échoue si les JSON commités ne correspondent plus aux classeurs
 *
 * Aucune donnée n'est inventée : les cellules vides restent vides, la sentinelle
 * « Aucun vivier secondaire observé » devient null.
 */
import ExcelJS from 'exceljs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Competence,
  CompetenceType,
  Confiance,
  Metier,
  SignatureStatut,
  Sourcing,
  Synonyme,
} from '../src/types/referentiels';
import { slugify } from '../src/engine/text';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, 'data', 'raw');
const OUT = join(ROOT, 'src', 'data', 'generated');

/** Dans tous les onglets, les lignes 1-3 sont un titre et une note ; l'en-tête est en ligne 4. */
const HEADER_ROW = 4;
const SENTINELLE_SANS_VIVIER = 'Aucun vivier secondaire observé';

type Row = Record<string, string>;

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((r) => r.text).join('').trim();
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    if ('text' in value) return String(value.text).trim();
    if (value instanceof Date) return value.toISOString();
  }
  return String(value).trim();
}

async function readSheet(file: string, sheetName: string): Promise<Row[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(RAW, file));
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Onglet « ${sheetName} » introuvable dans ${file}`);
  const headers: string[] = [];
  ws.getRow(HEADER_ROW).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = cellText(cell.value);
  });
  const rows: Row[] = [];
  for (let r = HEADER_ROW + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const out: Row = {};
    let filled = false;
    headers.forEach((h, col) => {
      if (!h) return;
      const v = cellText(row.getCell(col).value);
      out[h] = v;
      if (v) filled = true;
    });
    if (filled) rows.push(out);
  }
  return rows;
}

function col(row: Row, name: string): string {
  const v = row[name];
  if (v === undefined) throw new Error(`Colonne « ${name} » absente`);
  return v;
}

const splitList = (s: string): string[] =>
  s
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);

function toInt(s: string, ctx: string): number {
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`Entier attendu pour ${ctx}, reçu « ${s} »`);
  return n;
}

function toNumber(s: string, ctx: string): number {
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Nombre attendu pour ${ctx}, reçu « ${s} »`);
  return n;
}

function oneOf<T extends string>(s: string, allowed: readonly T[], ctx: string): T {
  if (!(allowed as readonly string[]).includes(s)) throw new Error(`Valeur inattendue pour ${ctx} : « ${s} »`);
  return s as T;
}

const TYPES: readonly CompetenceType[] = ['Capacité', 'Technologie', 'Méthode', 'Livrable', 'Écosystème'];
const STATUTS: readonly SignatureStatut[] = ['Core', 'Récurrente', 'Spécialisante'];
const CONFIANCES: readonly Confiance[] = ['Forte', 'Moyenne', 'Prudente'];

async function buildCompetences(): Promise<Competence[]> {
  const rows = await readSheet('Ref_Competences.xlsx', '1_Competences');
  return rows.map((r) => ({
    id: col(r, 'ID'),
    nom: col(r, 'Compétence canonique'),
    bloc: col(r, 'Bloc'),
    type: oneOf(col(r, 'Type'), TYPES, `Type de ${col(r, 'ID')}`),
    synonymes: splitList(col(r, 'Synonymes / formulations')),
    etudes: splitList(col(r, 'Études sources')),
    statutReferentiel: col(r, 'Statut'),
  }));
}

async function buildSynonymes(): Promise<Synonyme[]> {
  const rows = await readSheet('Ref_Competences.xlsx', '2_Synonymes');
  const byForme = new Map<string, Synonyme>();
  for (const r of rows) {
    const forme = col(r, 'Synonyme / formulation');
    const key = forme.toLocaleLowerCase('fr');
    const id = col(r, 'ID');
    const existing = byForme.get(key);
    if (existing) {
      if (!existing.competenceIds.includes(id)) existing.competenceIds.push(id);
    } else {
      byForme.set(key, { forme, competenceIds: [id] });
    }
  }
  return [...byForme.values()];
}

async function buildMetiers(): Promise<Metier[]> {
  const signatures = await readSheet('Ref_Profils.xlsx', '2_Profil_Competence');
  const corpus = await readSheet('Ref_Profils.xlsx', '1_Corpus_145_JD');
  const metiers = new Map<string, Metier>();
  const get = (nom: string): Metier => {
    let m = metiers.get(nom);
    if (!m) {
      m = { id: slugify(nom), nom, signature: [], fichesMarche: [] };
      metiers.set(nom, m);
    }
    return m;
  };
  for (const r of signatures) {
    const profil = col(r, 'Profil');
    get(profil).signature.push({
      competenceId: col(r, 'ID'),
      statut: oneOf(col(r, 'Statut'), STATUTS, `Statut ${profil}/${col(r, 'ID')}`),
      occurrences: toInt(col(r, 'Occurrences'), `Occurrences ${profil}`),
      base: toInt(col(r, 'Base'), `Base ${profil}`),
    });
  }
  for (const r of corpus) {
    const profil = col(r, 'Profil');
    if (!metiers.has(profil)) throw new Error(`Profil du corpus sans signature : « ${profil} »`);
    get(profil).fichesMarche.push({ entreprise: col(r, 'Entreprise'), intitule: col(r, 'Intitulé') });
  }
  return [...metiers.values()];
}

async function buildSourcing(metiers: Metier[]): Promise<Sourcing[]> {
  const rows = await readSheet('Ref_Sourcing.xlsx', '1_Strategie_sourcing');
  const idByNom = new Map(metiers.map((m) => [m.nom, m.id]));
  return rows.map((r) => {
    const profil = col(r, 'Profil');
    const metierId = idByNom.get(profil);
    if (!metierId) throw new Error(`Profil de sourcing inconnu : « ${profil} »`);
    const secondaire = col(r, 'Vivier secondaire');
    return {
      metierId,
      nbEmployeurs: toInt(col(r, 'Nb employeurs'), `Nb employeurs ${profil}`),
      vivierCoeur: {
        libelle: col(r, 'Vivier cœur'),
        nb: toInt(col(r, 'Nb cœur'), `Nb cœur ${profil}`),
        part: toNumber(col(r, 'Part cœur'), `Part cœur ${profil}`),
      },
      vivierSecondaire:
        secondaire === SENTINELLE_SANS_VIVIER || secondaire === ''
          ? null
          : {
              libelle: secondaire,
              nb: toInt(col(r, 'Nb secondaire'), `Nb secondaire ${profil}`),
              part: toNumber(col(r, 'Part secondaire'), `Part secondaire ${profil}`),
            },
      entreprisesCoeur: splitList(col(r, 'Entreprises cœur observées')),
      entreprisesSecondaires: splitList(col(r, 'Entreprises secondaires observées')),
      approche: col(r, 'Approche recommandée'),
      pointsAVerifier: splitList(col(r, 'Points de validation Wavestone')),
      confiance: oneOf(col(r, 'Confiance'), CONFIANCES, `Confiance ${profil}`),
    };
  });
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const competences = await buildCompetences();
  const synonymes = await buildSynonymes();
  const metiers = await buildMetiers();
  const sourcing = await buildSourcing(metiers);

  const outputs: Record<string, unknown> = {
    'competences.json': competences,
    'synonymes.json': synonymes,
    'metiers.json': metiers,
    'sourcing.json': sourcing,
  };

  await mkdir(OUT, { recursive: true });
  const stale: string[] = [];
  for (const [file, data] of Object.entries(outputs)) {
    const content = JSON.stringify(data, null, 2) + '\n';
    const path = join(OUT, file);
    if (check) {
      const current = await readFile(path, 'utf8').catch(() => '');
      if (current !== content) stale.push(file);
    } else {
      await writeFile(path, content);
    }
  }
  if (check && stale.length) {
    console.error(`JSON périmés par rapport aux classeurs : ${stale.join(', ')}. Lancer npm run build:data.`);
    process.exit(1);
  }
  console.log(
    `${check ? 'OK' : 'Écrit'} : ${competences.length} compétences, ${synonymes.length} synonymes, ` +
      `${metiers.length} métiers, ${sourcing.length} fiches sourcing.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
