export type NotesParEcue = {
  CC1: number | null
  CC2: number | null
  CC3: number | null
  ET: number | null
  rattrapage: number | null
}

const RATTRAPAGE_MAX = 12

/** Moyenne des CC renseignés (ignore les CC non saisis). Retourne null si aucun CC. */
export function moyenneCC(n: NotesParEcue): number | null {
  const valeurs = [n.CC1, n.CC2, n.CC3].filter((v): v is number => v !== null)
  if (valeurs.length === 0) return null
  return valeurs.reduce((a, b) => a + b, 0) / valeurs.length
}

/**
 * Note finale d'une ECUE = 40% moyenne CC + 60% (ET ou Rattrapage plafonné à 12).
 * Retourne null si aucune donnée exploitable (ni CC ni ET ni rattrapage).
 */
export function noteFinaleEcue(n: NotesParEcue): number | null {
  const cc = moyenneCC(n)
  const examen = n.rattrapage !== null ? Math.min(n.rattrapage, RATTRAPAGE_MAX) : n.ET

  if (cc === null && examen === null) return null
  if (cc === null) return examen
  if (examen === null) return cc

  return cc * 0.4 + examen * 0.6
}

/** Moyenne pondérée par coefficient des notes finales d'ECUE d'une UE. */
export function moyenneUE(ecues: { noteFinale: number | null; coefficient: number }[]): number | null {
  const valides = ecues.filter((e): e is { noteFinale: number; coefficient: number } => e.noteFinale !== null)
  if (valides.length === 0) return null
  const totalCoef = valides.reduce((a, e) => a + e.coefficient, 0)
  if (totalCoef === 0) return null
  return valides.reduce((a, e) => a + e.noteFinale * e.coefficient, 0) / totalCoef
}

export const SEUIL_VALIDATION = 10

export function estValide(moyenne: number | null): boolean | null {
  if (moyenne === null) return null
  return moyenne >= SEUIL_VALIDATION
}

/** Moyenne pondérée générique (ex: UE -> semestre par crédits, semestre -> année par crédits). Poids null/0 traité comme 1. */
export function moyennePonderee(items: { moyenne: number | null; poids: number | null }[]): number | null {
  const valides = items.filter((i): i is { moyenne: number; poids: number | null } => i.moyenne !== null)
  if (valides.length === 0) return null
  const totalPoids = valides.reduce((a, i) => a + (i.poids || 1), 0)
  if (totalPoids === 0) return null
  return valides.reduce((a, i) => a + i.moyenne * (i.poids || 1), 0) / totalPoids
}
