import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { calculerResultatsNiveau, moyennePonderee, estValide, mention, type SemestreDef, type UeDef, type EcueDef } from '@/lib/noteCalc'

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
    ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Admis(e) au diplôme</span>
    : <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Ajourné(e)</span>
}

type Niveau = { id: string; nom: string; code: string; cycle: string | null }
type Etudiant = { id: string; matricule: string; nom: string; prenom: string }

export default async function RecapitulatifCyclePage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>
}) {
  noStore()
  const { cycle } = await searchParams
  const supabase = await createClient()

  const { data: niveauxRaw } = await supabase.from('niveaux').select('id, nom, code, cycle').order('code')
  const niveaux = (niveauxRaw ?? []) as Niveau[]
  const cycles = [...new Set(niveaux.map(n => n.cycle).filter((c): c is string => !!c))]

  const { data: annee } = await supabase.from('annees_academiques').select('id, libelle').eq('active', true).single()

  let lignes: { etudiant: Etudiant; moyenneCycle: number | null; creditsTotal: number }[] = []
  let niveauxCycle: Niveau[] = []
  let dernierNiveau: Niveau | null = null

  if (cycle) {
    niveauxCycle = niveaux.filter(n => n.cycle === cycle).sort((a, b) => a.code.localeCompare(b.code))
    dernierNiveau = niveauxCycle[niveauxCycle.length - 1] ?? null

    if (dernierNiveau) {
      const { data: etudiantsRaw } = await supabase
        .from('etudiants')
        .select('id, matricule, nom, prenom')
        .eq('niveau_id', dernierNiveau.id)
        .order('nom')
      const etudiants = (etudiantsRaw ?? []) as Etudiant[]

      // Charger structure + notes de chaque niveau du cycle
      const structuresParNiveau = await Promise.all(
        niveauxCycle.map(async (niv) => {
          const [{ data: semestresRaw }, { data: uesRaw }, { data: ecuesRaw }] = await Promise.all([
            supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', niv.id).order('ordre'),
            supabase.from('ues').select('id, credits, semestre_id').eq('niveau_id', niv.id),
            supabase.from('ecues').select('id, coefficient, ue_id').eq('niveau_id', niv.id),
          ])
          return {
            niveau: niv,
            semestres: (semestresRaw ?? []) as SemestreDef[],
            ues: (uesRaw ?? []) as UeDef[],
            ecues: (ecuesRaw ?? []) as EcueDef[],
          }
        })
      )

      const { data: notesRaw } = await supabase
        .from('notes')
        .select('etudiant_id, ecue_id, type, valeur')
        .eq('annee_academique_id', annee?.id ?? '')
        .range(0, 19999)

      const notesParEtudiant = new Map<string, Map<string, number | null>>()
      notesRaw?.forEach(n => {
        if (!notesParEtudiant.has(n.etudiant_id)) notesParEtudiant.set(n.etudiant_id, new Map())
        notesParEtudiant.get(n.etudiant_id)!.set(`${n.ecue_id}-${n.type}`, n.valeur)
      })

      lignes = etudiants.map(etudiant => {
        const notesIndex = notesParEtudiant.get(etudiant.id) ?? new Map()

        const resultatsParNiveau = structuresParNiveau.map(({ semestres, ues, ecues }) =>
          calculerResultatsNiveau(semestres, ues, ecues, notesIndex)
        )

        const moyenneCycle = moyennePonderee(
          resultatsParNiveau.map(r => ({ moyenne: r.moyenneAnnuelle, poids: r.creditsTotal }))
        )

        const creditsTotal = resultatsParNiveau.reduce((a, r) => a + r.creditsTotal, 0)

        return { etudiant, moyenneCycle, creditsTotal }
      }).sort((a, b) => (b.moyenneCycle ?? -1) - (a.moyenneCycle ?? -1))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Récapitulatif de cycle (Grade)</h1>
        <p className="text-sm text-gray-500 mt-0.5">{annee ? `Année académique ${annee.libelle}` : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <form method="get" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Cycle *</label>
            <select name="cycle" defaultValue={cycle ?? ''} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Sélectionner un cycle --</option>
              {cycles.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Afficher
          </button>
        </form>
        {niveauxCycle.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Niveaux du cycle : {niveauxCycle.map(n => n.nom).join(' → ')}
          </p>
        )}
      </div>

      {cycle && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">
              Ordre de mérite — {dernierNiveau?.nom ?? ''}
            </h2>
            <span className="text-xs text-gray-400">{lignes.length} étudiant(s)</span>
          </div>

          {lignes.length === 0 ? (
            <div className="p-12 text-center text-gray-400">Aucun étudiant trouvé dans le dernier niveau de ce cycle.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-center px-3 py-3 font-medium text-gray-400 text-xs">Rang</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Matricule</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Nom et prénom</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500">Moy. du cycle</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500">Mention</th>
                    <th className="text-center px-3 py-3 font-medium text-gray-500">Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lignes.map((ligne, idx) => (
                    <tr key={ligne.etudiant.id} className="hover:bg-gray-50">
                      <td className="text-center px-3 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{ligne.etudiant.matricule}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{ligne.etudiant.nom} {ligne.etudiant.prenom}</td>
                      <td className="text-center px-3 py-2.5">
                        <span className={`font-bold ${noteColor(ligne.moyenneCycle)}`}>
                          {ligne.moyenneCycle !== null ? ligne.moyenneCycle.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="text-center px-3 py-2.5 text-gray-500 text-xs">{mention(ligne.moyenneCycle) ?? '—'}</td>
                      <td className="text-center px-3 py-2.5"><StatutBadge valide={estValide(ligne.moyenneCycle)} /></td>
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
