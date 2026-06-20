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
 * Note finale d'une ECUE = 25% moyenne CC + 75% (ET ou Rattrapage, non plafonné ici).
 * Le plafond de 12 lié au rattrapage s'applique à la moyenne de l'UE, pas à cette note.
 * Retourne null si aucune donnée exploitable (ni CC ni ET ni rattrapage).
 */
export function noteFinaleEcue(n: NotesParEcue): number | null {
  const cc = moyenneCC(n)
  const examen = n.rattrapage !== null ? n.rattrapage : n.ET

  if (cc === null && examen === null) return null
  if (cc === null) return examen
  if (examen === null) return cc

  return cc * 0.25 + examen * 0.75
}

/** Comme noteFinaleEcue, mais indique aussi si la note de rattrapage a été utilisée dans le calcul. */
export function noteFinaleEcueDetail(n: NotesParEcue): { noteFinale: number | null; rattrapageUtilise: boolean } {
  return { noteFinale: noteFinaleEcue(n), rattrapageUtilise: n.rattrapage !== null }
}

/**
 * Moyenne pondérée par coefficient des notes finales d'ECUE d'une UE.
 * Si au moins une ECUE de l'UE a été retenue via une note de rattrapage,
 * la moyenne de l'UE est plafonnée à 12/20 (le rattrapage lui-même n'est pas plafonné).
 */
export function moyenneUE(ecues: { noteFinale: number | null; coefficient: number; rattrapageUtilise?: boolean }[]): number | null {
  const valides = ecues.filter((e): e is { noteFinale: number; coefficient: number; rattrapageUtilise?: boolean } => e.noteFinale !== null)
  if (valides.length === 0) return null
  const totalCoef = valides.reduce((a, e) => a + e.coefficient, 0)
  if (totalCoef === 0) return null
  const moyenne = valides.reduce((a, e) => a + e.noteFinale * e.coefficient, 0) / totalCoef
  const aRattrapage = valides.some(e => e.rattrapageUtilise)
  return aRattrapage ? Math.min(moyenne, RATTRAPAGE_MAX) : moyenne
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

/** Mention académique standard à partir d'une moyenne sur 20. */
export function mention(moyenne: number | null): string | null {
  if (moyenne === null) return null
  if (moyenne < SEUIL_VALIDATION) return null
  if (moyenne >= 16) return 'Très Bien'
  if (moyenne >= 14) return 'Bien'
  if (moyenne >= 12) return 'Assez Bien'
  return 'Passable'
}

export type SemestreDef = { id: string }
export type UeDef = { id: string; credits: number | null; semestre_id: string | null }
export type EcueDef = { id: string; coefficient: number; ue_id: string | null }

/**
 * Calcule, pour un étudiant donné (via son notesIndex "ecueId-type" -> valeur),
 * les moyennes par UE, par semestre (pondérées par crédits UE) et la moyenne annuelle
 * (pondérée par le total des crédits de chaque semestre), à partir de la structure
 * semestres/UE/ECUE d'un niveau.
 */
export function calculerResultatsNiveau(
  semestres: SemestreDef[],
  ues: UeDef[],
  ecues: EcueDef[],
  notesIndex: Map<string, number | null>
) {
  const moyennesUe = new Map<string, number | null>()
  ues.forEach(ue => {
    const ecuesUe = ecues.filter(e => e.ue_id === ue.id)
    const items = ecuesUe.map(e => {
      const { noteFinale, rattrapageUtilise } = noteFinaleEcueDetail({
        CC1: notesIndex.get(`${e.id}-CC1`) ?? null,
        CC2: notesIndex.get(`${e.id}-CC2`) ?? null,
        CC3: notesIndex.get(`${e.id}-CC3`) ?? null,
        ET: notesIndex.get(`${e.id}-ET`) ?? null,
        rattrapage: notesIndex.get(`${e.id}-rattrapage`) ?? null,
      })
      return { noteFinale, coefficient: e.coefficient, rattrapageUtilise }
    })
    moyennesUe.set(ue.id, moyenneUE(items))
  })

  const moyennesSemestre = semestres.map(sem => {
    const uesSemestre = ues.filter(u => u.semestre_id === sem.id)
    return moyennePonderee(uesSemestre.map(u => ({ moyenne: moyennesUe.get(u.id) ?? null, poids: u.credits })))
  })

  const creditsParSemestre = semestres.map(sem =>
    ues.filter(u => u.semestre_id === sem.id).reduce((a, u) => a + (u.credits ?? 1), 0)
  )

  const moyenneAnnuelle = moyennePonderee(
    semestres.map((_, i) => ({ moyenne: moyennesSemestre[i] ?? null, poids: creditsParSemestre[i] }))
  )

  const creditsTotal = creditsParSemestre.reduce((a, c) => a + c, 0)

  return { moyennesUe, moyennesSemestre, moyenneAnnuelle, creditsTotal }
}
