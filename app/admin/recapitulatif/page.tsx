import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { noteFinaleEcueDetail, moyenneUE, moyennePonderee, estValide } from '@/lib/noteCalc'

export const dynamic = 'force-dynamic'

function noteColor(v: number | null) {
  if (v === null) return 'text-gray-300'
  if (v >= 12) return 'text-green-600 font-semibold'
  if (v >= 10) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

function StatutBadge({ valide }: { valide: boolean | null }) {
  if (valide === null) return <span className="text-xs text-gray-300">—</span>
  return valide
    ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Admis(e)</span>
    : <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Ajourné(e)</span>
}

type Niveau = { id: string; nom: string; code: string }
type SemestreRow = { id: string; code: string; nom: string; ordre: number }
type UeRow = { id: string; credits: number | null; semestre_id: string | null }
type EcueRow = { id: string; coefficient: number; ue_id: string | null }
type Etudiant = { id: string; matricule: string; nom: string; prenom: string }

export default async function AdminRecapitulatifPage({
  searchParams,
}: {
  searchParams: Promise<{ niveau_id?: string }>
}) {
  noStore()
  const { niveau_id } = await searchParams
  const supabase = await createClient()

  const { data: niveauxRaw } = await supabase.from('niveaux').select('id, nom, code').order('code')
  const niveaux = (niveauxRaw ?? []) as Niveau[]

  const { data: annee } = await supabase.from('annees_academiques').select('id, libelle').eq('active', true).single()

  let lignes: {
    etudiant: Etudiant
    moyennesSemestre: (number | null)[]
    moyenneAnnuelle: number | null
  }[] = []
  let semestres: SemestreRow[] = []

  if (niveau_id) {
    const [{ data: semestresRaw }, { data: uesRaw }, { data: ecuesRaw }, { data: etudiantsRaw }, { data: notesRaw }] = await Promise.all([
      supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', niveau_id).order('ordre'),
      supabase.from('ues').select('id, credits, semestre_id').eq('niveau_id', niveau_id),
      supabase.from('ecues').select('id, coefficient, ue_id').eq('niveau_id', niveau_id),
      supabase.from('etudiants').select('id, matricule, nom, prenom').eq('niveau_id', niveau_id).order('nom'),
      supabase.from('notes').select('etudiant_id, ecue_id, type, valeur').eq('annee_academique_id', annee?.id ?? '').range(0, 19999),
    ])

    semestres = (semestresRaw ?? []) as SemestreRow[]
    const ues = (uesRaw ?? []) as UeRow[]
    const ecues = (ecuesRaw ?? []) as EcueRow[]
    const etudiants = (etudiantsRaw ?? []) as Etudiant[]
    const notes = notesRaw ?? []

    const etudiantIds = new Set(etudiants.map(e => e.id))
    const notesParEtudiant = new Map<string, Map<string, number | null>>()
    notes.forEach(n => {
      if (!etudiantIds.has(n.etudiant_id)) return
      if (!notesParEtudiant.has(n.etudiant_id)) notesParEtudiant.set(n.etudiant_id, new Map())
      notesParEtudiant.get(n.etudiant_id)!.set(`${n.ecue_id}-${n.type}`, n.valeur)
    })

    lignes = etudiants.map(etudiant => {
      const notesIndex = notesParEtudiant.get(etudiant.id) ?? new Map()

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

      const moyenneAnnuelle = moyennePonderee(
        semestres.map((sem, i) => ({
          moyenne: moyennesSemestre[i] ?? null,
          poids: ues.filter(u => u.semestre_id === sem.id).reduce((a, u) => a + (u.credits ?? 1), 0),
        }))
      )

      return { etudiant, moyennesSemestre, moyenneAnnuelle }
    }).sort((a, b) => (b.moyenneAnnuelle ?? -1) - (a.moyenneAnnuelle ?? -1))
  }

  const niveauActuel = niveaux.find(n => n.id === niveau_id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Récapitulatif — Procès-verbal de délibération</h1>
        <p className="text-sm text-gray-500 mt-0.5">{annee ? `Année académique ${annee.libelle}` : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <form method="get" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Niveau *</label>
            <select name="niveau_id" defaultValue={niveau_id ?? ''} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Sélectionner un niveau --</option>
              {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Afficher le PV
          </button>
        </form>
      </div>

      {niveau_id && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">{niveauActuel?.nom}</h2>
            <span className="text-xs text-gray-400">{lignes.length} étudiant(s)</span>
          </div>

          {lignes.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Aucun étudiant ou aucun semestre configuré pour ce niveau.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-center px-3 py-3 font-medium text-gray-400 text-xs">Rang</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Matricule</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Nom et prénom</th>
                    {semestres.map(sem => (
                      <th key={sem.id} className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">{sem.code}</th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">Moy. annuelle</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lignes.map((ligne, idx) => (
                    <tr key={ligne.etudiant.id} className="hover:bg-gray-50">
                      <td className="text-center px-3 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{ligne.etudiant.matricule}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{ligne.etudiant.nom} {ligne.etudiant.prenom}</td>
                      {ligne.moyennesSemestre.map((m, i) => (
                        <td key={i} className="text-center px-3 py-2.5">
                          <span className={noteColor(m)}>{m !== null ? m.toFixed(2) : '—'}</span>
                        </td>
                      ))}
                      <td className="text-center px-3 py-2.5">
                        <span className={`font-bold ${noteColor(ligne.moyenneAnnuelle)}`}>
                          {ligne.moyenneAnnuelle !== null ? ligne.moyenneAnnuelle.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="text-center px-3 py-2.5"><StatutBadge valide={estValide(ligne.moyenneAnnuelle)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
