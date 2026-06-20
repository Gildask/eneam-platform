import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { calculerResultatsNiveau, moyennePonderee, estValide, SEUIL_VALIDATION_UE } from '@/lib/noteCalc'

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
    ? <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">Validé</span>
    : <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Non validé</span>
}

type EcueRow = { id: string; code: string; nom: string; coefficient: number; ue_id: string | null }
type UeRow = { id: string; code: string; nom: string; credits: number | null; semestre_id: string | null }
type SemestreRow = { id: string; code: string; nom: string; ordre: number }

export default async function RecapitulatifPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: annee } = await supabase
    .from('annees_academiques')
    .select('id, libelle')
    .eq('active', true)
    .single()

  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('nom, prenom, matricule, niveau_id, niveaux(nom)')
    .eq('id', user.id)
    .single()

  const niveauId = etudiant?.niveau_id ?? ''

  const [{ data: semestresRaw }, { data: uesRaw }, { data: ecuesRaw }, { data: notes }] = await Promise.all([
    supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', niveauId).order('ordre'),
    supabase.from('ues').select('id, code, nom, credits, semestre_id').eq('niveau_id', niveauId).order('code'),
    supabase.from('ecues').select('id, code, nom, coefficient, ue_id').eq('niveau_id', niveauId).order('code'),
    supabase.from('notes').select('ecue_id, type, valeur').eq('etudiant_id', user.id).eq('annee_academique_id', annee?.id ?? ''),
  ])

  const semestres = (semestresRaw ?? []) as SemestreRow[]
  const ues = (uesRaw ?? []) as UeRow[]
  const ecues = (ecuesRaw ?? []) as EcueRow[]

  const notesIndex = new Map<string, number | null>()
  notes?.forEach(n => notesIndex.set(`${n.ecue_id}-${n.type}`, n.valeur))

  const { moyennesUe, moyennesSemestre, moyenneAnnuelle: moyenneAnnuelleNiveau } = calculerResultatsNiveau(
    semestres, ues, ecues, notesIndex
  )

  // Regrouper les UE par semestre (les UE sans semestre vont dans un groupe "Hors semestre")
  const semestresAffiches: (SemestreRow | { id: '__none__'; code: ''; nom: 'Hors semestre'; ordre: 999 })[] = [
    ...semestres,
  ]
  if (ues.some(u => !u.semestre_id)) {
    semestresAffiches.push({ id: '__none__', code: '', nom: 'Hors semestre', ordre: 999 })
  }

  const recapSemestres = semestresAffiches.map((sem, i) => {
    const uesSemestre = ues.filter(u => (u.semestre_id ?? '__none__') === sem.id)
    const moyenneSemestre = sem.id === '__none__'
      ? moyennePonderee(uesSemestre.map(u => ({ moyenne: moyennesUe.get(u.id) ?? null, poids: u.credits })))
      : moyennesSemestre[i] ?? null
    return { semestre: sem, uesSemestre, moyenneSemestre }
  })

  const moyenneAnnuelle = moyenneAnnuelleNiveau

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Récapitulatif</h1>
        {annee && <p className="text-sm text-gray-500 mt-0.5">Année académique {annee.libelle}</p>}
      </div>

      {/* Synthèse annuelle */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Moyenne générale annuelle</p>
          <p className={`text-2xl font-bold ${noteColor(moyenneAnnuelle)}`}>
            {moyenneAnnuelle !== null ? moyenneAnnuelle.toFixed(2) : '—'} / 20
          </p>
        </div>
        <StatutBadge valide={estValide(moyenneAnnuelle)} />
      </div>

      {/* Récapitulatif par semestre */}
      {recapSemestres.map(({ semestre, uesSemestre, moyenneSemestre }) => (
        <div key={semestre.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">
              {semestre.code ? `${semestre.code} — ${semestre.nom}` : semestre.nom}
            </h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${noteColor(moyenneSemestre)}`}>
                {moyenneSemestre !== null ? moyenneSemestre.toFixed(2) : '—'} / 20
              </span>
              <StatutBadge valide={estValide(moyenneSemestre)} />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">UE</th>
                <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Crédits</th>
                <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Moyenne</th>
                <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {uesSemestre.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-300 text-xs">Aucune UE</td></tr>
              ) : uesSemestre.map(ue => {
                const moy = moyennesUe.get(ue.id) ?? null
                return (
                  <tr key={ue.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{ue.nom}</p>
                      <p className="text-xs text-gray-400">{ue.code}</p>
                    </td>
                    <td className="text-center px-4 py-2.5 text-gray-500">{ue.credits ?? '—'}</td>
                    <td className="text-center px-4 py-2.5">
                      <span className={noteColor(moy)}>{moy !== null ? moy.toFixed(2) : '—'}</span>
                    </td>
                    <td className="text-center px-4 py-2.5"><StatutBadge valide={estValide(moy, SEUIL_VALIDATION_UE)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {recapSemestres.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucun semestre ou UE configuré pour votre niveau.
        </div>
      )}
    </div>
  )
}
