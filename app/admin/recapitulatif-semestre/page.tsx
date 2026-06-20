import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { calculerResultatsNiveau, estValide, type SemestreDef, type UeDef, type EcueDef } from '@/lib/noteCalc'

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
type UeRow = { id: string; code: string; nom: string; credits: number | null; semestre_id: string | null }
type Etudiant = { id: string; matricule: string; nom: string; prenom: string }

export default async function RecapitulatifSemestrePage({
  searchParams,
}: {
  searchParams: Promise<{ niveau_id?: string; semestre_id?: string }>
}) {
  noStore()
  const { niveau_id, semestre_id } = await searchParams
  const supabase = await createClient()

  const { data: niveauxRaw } = await supabase.from('niveaux').select('id, nom, code').order('code')
  const niveaux = (niveauxRaw ?? []) as Niveau[]

  const { data: annee } = await supabase.from('annees_academiques').select('id, libelle').eq('active', true).single()

  let semestresNiveau: SemestreRow[] = []
  if (niveau_id) {
    const { data } = await supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', niveau_id).order('ordre')
    semestresNiveau = (data ?? []) as SemestreRow[]
  }

  type Ligne = {
    etudiant: Etudiant
    moyennesUe: Map<string, number | null>
    moyenneSemestre: number | null
    creditsObtenus: number
    creditsTotal: number
  }

  let lignes: Ligne[] = []
  let uesSemestre: UeRow[] = []

  if (niveau_id && semestre_id) {
    const [{ data: semestresRaw }, { data: uesRaw }, { data: ecuesRaw }, { data: etudiantsRaw }] = await Promise.all([
      supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', niveau_id).order('ordre'),
      supabase.from('ues').select('id, code, nom, credits, semestre_id').eq('niveau_id', niveau_id),
      supabase.from('ecues').select('id, coefficient, ue_id').eq('niveau_id', niveau_id),
      supabase.from('etudiants').select('id, matricule, nom, prenom').eq('niveau_id', niveau_id).order('nom'),
    ])

    const semestres = (semestresRaw ?? []) as SemestreDef[]
    const ues = (uesRaw ?? []) as UeRow[]
    const ecues = (ecuesRaw ?? []) as EcueDef[]
    const etudiants = (etudiantsRaw ?? []) as Etudiant[]
    uesSemestre = ues.filter(u => u.semestre_id === semestre_id)

    const { data: notesRaw } = await supabase
      .from('notes')
      .select('etudiant_id, ecue_id, type, valeur')
      .eq('annee_academique_id', annee?.id ?? '')

    const notesParEtudiant = new Map<string, Map<string, number | null>>()
    const etudiantIds = new Set(etudiants.map(e => e.id))
    notesRaw?.forEach(n => {
      if (!etudiantIds.has(n.etudiant_id)) return
      if (!notesParEtudiant.has(n.etudiant_id)) notesParEtudiant.set(n.etudiant_id, new Map())
      notesParEtudiant.get(n.etudiant_id)!.set(`${n.ecue_id}-${n.type}`, n.valeur)
    })

    const ueDefs: UeDef[] = ues as UeDef[]

    lignes = etudiants.map(etudiant => {
      const notesIndex = notesParEtudiant.get(etudiant.id) ?? new Map()
      const { moyennesUe } = calculerResultatsNiveau(semestres, ueDefs, ecues, notesIndex)

      const moyenneSemestre = (() => {
        const valides = uesSemestre
          .map(u => ({ moyenne: moyennesUe.get(u.id) ?? null, poids: u.credits }))
          .filter((x): x is { moyenne: number; poids: number | null } => x.moyenne !== null)
        if (valides.length === 0) return null
        const totalPoids = valides.reduce((a, x) => a + (x.poids || 1), 0)
        if (totalPoids === 0) return null
        return valides.reduce((a, x) => a + x.moyenne * (x.poids || 1), 0) / totalPoids
      })()

      const creditsTotal = uesSemestre.reduce((a, u) => a + (u.credits ?? 1), 0)
      const creditsObtenus = uesSemestre.reduce((a, u) => {
        const v = estValide(moyennesUe.get(u.id) ?? null)
        return v ? a + (u.credits ?? 1) : a
      }, 0)

      return { etudiant, moyennesUe, moyenneSemestre, creditsObtenus, creditsTotal }
    }).sort((a, b) => (b.moyenneSemestre ?? -1) - (a.moyenneSemestre ?? -1))
  }

  const niveauActuel = niveaux.find(n => n.id === niveau_id)
  const semestreActuel = semestresNiveau.find(s => s.id === semestre_id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Récapitulatif du semestre</h1>
        <p className="text-sm text-gray-500 mt-0.5">{annee ? `Année académique ${annee.libelle}` : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <form method="get" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Année d&apos;étude (niveau) *</label>
            <select name="niveau_id" defaultValue={niveau_id ?? ''} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Sélectionner --</option>
              {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Semestre *</label>
            <select name="semestre_id" defaultValue={semestre_id ?? ''} required disabled={!niveau_id}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              <option value="">{niveau_id ? '-- Sélectionner --' : "Choisissez d'abord une année d'étude !"}</option>
              {semestresNiveau.map(s => <option key={s.id} value={s.id}>{s.code} — {s.nom}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Afficher
          </button>
        </form>
      </div>

      {niveau_id && semestre_id && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">
              {niveauActuel?.nom} — {semestreActuel?.code} {semestreActuel?.nom}
            </h2>
            <span className="text-xs text-gray-400">{lignes.length} étudiant(s)</span>
          </div>

          {lignes.length === 0 || uesSemestre.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Aucun étudiant ou aucune UE configurée pour ce semestre.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-center px-3 py-3 font-medium text-gray-400 text-xs">Rang</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Matricule</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Nom et prénom</th>
                    {uesSemestre.map(ue => (
                      <th key={ue.id} className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap" title={ue.nom}>
                        {ue.code}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">Crédits</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">Moy. semestre</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lignes.map((ligne, idx) => (
                    <tr key={ligne.etudiant.id} className="hover:bg-gray-50">
                      <td className="text-center px-3 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{ligne.etudiant.matricule}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{ligne.etudiant.nom} {ligne.etudiant.prenom}</td>
                      {uesSemestre.map(ue => {
                        const v = ligne.moyennesUe.get(ue.id) ?? null
                        return (
                          <td key={ue.id} className="text-center px-3 py-2.5">
                            <span className={noteColor(v)}>{v !== null ? v.toFixed(2) : '—'}</span>
                          </td>
                        )
                      })}
                      <td className="text-center px-3 py-2.5 text-gray-600 text-xs">
                        {ligne.creditsObtenus} / {ligne.creditsTotal}
                      </td>
                      <td className="text-center px-3 py-2.5">
                        <span className={`font-bold ${noteColor(ligne.moyenneSemestre)}`}>
                          {ligne.moyenneSemestre !== null ? ligne.moyenneSemestre.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="text-center px-3 py-2.5"><StatutBadge valide={estValide(ligne.moyenneSemestre)} /></td>
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
