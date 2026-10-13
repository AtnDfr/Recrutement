import { AXES_TRANSVERSES, type Referentiels } from '../types';

/**
 * Contrôles structurels et de jointure entre référentiels.
 * Renvoie la liste des anomalies (vide si tout est cohérent).
 */
export function validateReferentiels(ref: Referentiels): string[] {
  const errors: string[] = [];
  const dup = (values: string[], label: string): void => {
    const seen = new Set<string>();
    for (const v of values) {
      if (seen.has(v)) errors.push(`${label} en double : ${v}`);
      seen.add(v);
    }
  };

  const competenceIds = new Set(ref.competences.map((c) => c.id));
  dup(
    ref.competences.map((c) => c.id),
    'ID de compétence',
  );
  dup(
    ref.competences.map((c) => c.nom),
    'Nom de compétence',
  );
  dup(
    ref.metiers.map((m) => m.id),
    'ID de métier',
  );

  for (const s of ref.synonymes) {
    for (const id of s.competenceIds) {
      if (!competenceIds.has(id)) errors.push(`Synonyme « ${s.forme} » → compétence inconnue ${id}`);
    }
  }

  const metierIds = new Set(ref.metiers.map((m) => m.id));
  for (const m of ref.metiers) {
    if (m.signature.length === 0) errors.push(`Métier sans signature : ${m.nom}`);
    dup(
      m.signature.map((e) => e.competenceId),
      `Compétence de signature (${m.nom})`,
    );
    for (const e of m.signature) {
      if (!competenceIds.has(e.competenceId)) errors.push(`${m.nom} → compétence inconnue ${e.competenceId}`);
      if (e.occurrences < 1 || e.occurrences > e.base) errors.push(`${m.nom}/${e.competenceId} : occurrences hors bornes`);
    }
  }

  dup(
    ref.sourcing.map((s) => s.metierId),
    'Sourcing du métier',
  );
  for (const s of ref.sourcing) {
    if (!metierIds.has(s.metierId)) errors.push(`Sourcing pour un métier inconnu : ${s.metierId}`);
  }

  const { echelle, axes, grades } = ref.grades;
  const axeIds = axes.map((a) => a.id);
  for (const axe of AXES_TRANSVERSES) {
    if (!axeIds.includes(axe)) errors.push(`Axe transverse non défini : ${axe}`);
  }
  dup(
    grades.map((g) => g.id),
    'Grade',
  );
  for (const g of grades) {
    for (const axe of AXES_TRANSVERSES) {
      const n = g.niveaux[axe];
      if (!Number.isInteger(n) || n < echelle.min || n > echelle.max) {
        errors.push(`Grade ${g.id} : niveau invalide pour ${axe} (${String(n)})`);
      }
    }
  }

  const { config } = ref;
  if (!Number.isInteger(config.plafondMetiers) || config.plafondMetiers < 0) {
    errors.push(`plafondMetiers invalide : ${config.plafondMetiers}`);
  }
  for (const [id, axe] of Object.entries(config.competencesTransverses)) {
    if (!competenceIds.has(id)) errors.push(`Compétence transverse inconnue : ${id}`);
    if (!(AXES_TRANSVERSES as readonly string[]).includes(axe)) errors.push(`Compétence ${id} : axe inconnu ${axe}`);
  }

  return errors;
}
