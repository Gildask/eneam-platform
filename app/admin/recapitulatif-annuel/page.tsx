import { Fragment } from 'react'
import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { calculerResultatsNiveau, estValide, type SemestreDef, type UeDef, type EcueDef } from '@/lib/noteCalc'
import { fetchAllNotes } from '@/lib/fetchAllNotes'
import PrintButton from '../recapitulatif-semestre/PrintButton'

export const dynamic = 'force-dynamic'

function noteColor(v: number | null) {
  if (v === null) return 'text-gray-300'
  return v >= 10 ? 'text-green-700' : 'text-red-600'
}

type Niveau = { id: string; nom: string; code: string }
type SemestreRow = { id: string; code: string; nom: string; ordre: number }
type UeRow = { id: string; code: string; nom: string; credits: number | null; semestre_id: string | null }
type Etudiant = { id: string; matricule: string; nom: string; prenom: string }

export default async function RecapitulatifAnnuelPage({
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

  type Ligne = { etudiant: Etudiant; moyennesUe: Map<string, number | null>; moyennesSemestre: (number | null)[]; moyenneAnnuelle: number | null }

  let lignes: Ligne[] = []
  let semestres: SemestreRow[] = []
  let ues: UeRow[] = []

  if (niveau_id) {
    const [{ data: semestresRaw }, { data: uesRaw }, { data: ecuesRaw }, { data: etudiantsRaw }, notesRaw] = await Promise.all([
      supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', niveau_id).order('ordre'),
      supabase.from('ues').select('id, code, nom, credits, semestre_id').eq('niveau_id', niveau_id),
      supabase.from('ecues').select('id, coefficient, ue_id').eq('niveau_id', niveau_id),
      supabase.from('etudiants').select('id, matricule, nom, prenom').eq('niveau_id', niveau_id).order('nom'),
      fetchAllNotes(supabase, annee?.id ?? ''),
    ])

    semestres = (semestresRaw ?? []) as SemestreRow[]
    ues = ((uesRaw ?? []) as UeRow[]).sort((a, b) => a.code.localeCompare(b.code))
    const ecues = (ecuesRaw ?? []) as EcueDef[]
    const etudiants = (etudiantsRaw ?? []) as Etudiant[]

    const etudiantIds = new Set(etudiants.map(e => e.id))
    const notesParEtudiant = new Map<string, Map<string, number | null>>()
    notesRaw?.forEach(n => {
      if (!etudiantIds.has(n.etudiant_id)) return
      if (!notesParEtudiant.has(n.etudiant_id)) notesParEtudiant.set(n.etudiant_id, new Map())
      notesParEtudiant.get(n.etudiant_id)!.set(`${n.ecue_id}-${n.type}`, n.valeur)
    })

    const semestreDefs: SemestreDef[] = semestres
    const ueDefs: UeDef[] = ues

    lignes = etudiants.map(etudiant => {
      const notesIndex = notesParEtudiant.get(etudiant.id) ?? new Map()
      const { moyennesUe, moyennesSemestre, moyenneAnnuelle } = calculerResultatsNiveau(semestreDefs, ueDefs, ecues, notesIndex)
      return { etudiant, moyennesUe, moyennesSemestre, moyenneAnnuelle }
    }).sort((a, b) => a.etudiant.nom.localeCompare(b.etudiant.nom) || a.etudiant.prenom.localeCompare(b.etudiant.prenom))
  }

  const niveauActuel = niveaux.find(n => n.id === niveau_id)

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          table { font-size: 7px; }
          th, td { padding: 1px 3px !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="print:hidden">
        <h1 className="text-xl font-bold text-gray-900">Récapitulatif annuel</h1>
        <p className="text-sm text-gray-500 mt-0.5">{annee ? `Année académique ${annee.libelle}` : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 print:hidden">
        <form method="get" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Année d&apos;étude *</label>
            <select name="niveau_id" defaultValue={niveau_id ?? ''} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Sélectionner --</option>
              {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Afficher
          </button>
        </form>
      </div>

      {niveau_id && semestres.length > 0 && (
        <>
          <PrintButton />

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between print:hidden">
              <h2 className="font-semibold text-gray-700 text-sm">{niveauActuel?.nom}</h2>
              <span className="text-xs text-gray-400">{lignes.length} étudiant(s)</span>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky left-0 z-10 bg-blue-100 border border-blue-200 px-2 py-1.5 text-left min-w-[160px] print:static">
                      Étudiant
                    </th>
                    {semestres.map(sem => {
                      const uesSem = ues.filter(u => u.semestre_id === sem.id)
                      return (
                        <th key={sem.id} colSpan={uesSem.length + 1}
                          className="bg-blue-100 border border-blue-200 px-2 py-1.5 whitespace-nowrap">
                          {sem.code} — {sem.nom}
                        </th>
                      )
                    })}
                    <th rowSpan={2} className="bg-blue-200 border border-blue-300 px-2 py-1.5 whitespace-nowrap">
                      Moyenne annuelle
                    </th>
                  </tr>
                  <tr>
                    {semestres.map(sem => {
                      const uesSem = ues.filter(u => u.semestre_id === sem.id)
                      return (
                        <Fragment key={sem.id}>
                          {uesSem.map(ue => (
                            <th key={ue.id} className="bg-amber-100 border border-amber-200 px-1.5 py-1 whitespace-nowrap font-normal" title={ue.nom}>
                              {ue.code}
                            </th>
                          ))}
                          <th className="bg-amber-200 border border-amber-300 px-1.5 py-1 font-semibold whitespace-nowrap">
                            Moy. {sem.code}
                          </th>
                        </Fragment>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((ligne, idx) => (
                    <tr key={ligne.etudiant.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="sticky left-0 z-10 bg-inherit border border-gray-200 px-2 py-1.5 whitespace-nowrap print:static">
                        <span className="text-gray-400">{ligne.etudiant.matricule}</span>{' '}
                        <strong>{ligne.etudiant.nom}</strong> {ligne.etudiant.prenom}
                      </td>
                      {semestres.map((sem, i) => {
                        const uesSem = ues.filter(u => u.semestre_id === sem.id)
                        return (
                          <Fragment key={sem.id}>
                            {uesSem.map(ue => {
                              const v = ligne.moyennesUe.get(ue.id) ?? null
                              return (
                                <td key={ue.id} className="border border-gray-100 px-1.5 py-1.5 text-center whitespace-nowrap">
                                  <span className={noteColor(v)}>{v !== null ? v.toFixed(2) : '—'}</span>
                                </td>
                              )
                            })}
                            <td className="border border-gray-100 px-1.5 py-1.5 text-center font-semibold whitespace-nowrap">
                              <span className={noteColor(ligne.moyennesSemestre[i] ?? null)}>
                                {ligne.moyennesSemestre[i] !== null ? ligne.moyennesSemestre[i]!.toFixed(2) : '—'}
                              </span>
                            </td>
                          </Fragment>
                        )
                      })}
                      <td className="border border-gray-200 px-2 py-1.5 text-center font-bold whitespace-nowrap bg-blue-50/50">
                        <span className={noteColor(ligne.moyenneAnnuelle)}>
                          {ligne.moyenneAnnuelle !== null ? ligne.moyenneAnnuelle.toFixed(2) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {niveau_id && semestres.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucun semestre configuré pour ce niveau.
        </div>
      )}
    </div>
  )
}
