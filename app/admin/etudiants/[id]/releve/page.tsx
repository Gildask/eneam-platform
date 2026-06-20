import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound } from 'next/navigation'
import { calculerResultatsNiveau, mention, estValide } from '@/lib/noteCalc'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

type EcueRow = { id: string; code: string; nom: string; coefficient: number; credits: number; ue_id: string | null }
type UeRow = { id: string; code: string; nom: string; credits: number | null; semestre_id: string | null }
type SemestreRow = { id: string; code: string; nom: string; ordre: number }

export default async function RelevePage({ params }: { params: Promise<{ id: string }> }) {
  noStore()
  const { id } = await params
  const supabase = createAdminClient()

  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('id, nom, prenom, matricule, niveau_id, niveaux(nom, code)')
    .eq('id', id)
    .single()

  if (!etudiant) notFound()

  const { data: annee } = await supabase.from('annees_academiques').select('id, libelle').eq('active', true).single()

  const [{ data: semestresRaw }, { data: uesRaw }, { data: ecuesRaw }, { data: notesRaw }] = await Promise.all([
    supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', etudiant.niveau_id ?? '').order('ordre'),
    supabase.from('ues').select('id, code, nom, credits, semestre_id').eq('niveau_id', etudiant.niveau_id ?? ''),
    supabase.from('ecues').select('id, code, nom, coefficient, credits, ue_id').eq('niveau_id', etudiant.niveau_id ?? ''),
    supabase.from('notes').select('ecue_id, type, valeur').eq('etudiant_id', id).eq('annee_academique_id', annee?.id ?? ''),
  ])

  const semestres = (semestresRaw ?? []) as SemestreRow[]
  const ues = (uesRaw ?? []) as UeRow[]
  const ecues = (ecuesRaw ?? []) as EcueRow[]

  const notesIndex = new Map<string, number | null>()
  notesRaw?.forEach(n => notesIndex.set(`${n.ecue_id}-${n.type}`, n.valeur))

  const { moyennesUe, moyennesSemestre, moyenneAnnuelle } = calculerResultatsNiveau(semestres, ues, ecues, notesIndex)

  const niveauNom = (etudiant.niveaux as unknown as { nom: string } | null)?.nom ?? ''

  return (
    <div className="space-y-4">
      <div className="print:hidden flex justify-end">
        <PrintButton />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-8 print:border-0 print:rounded-none print:p-0 max-w-3xl mx-auto">
        {/* En-tête */}
        <div className="text-center space-y-1 mb-6 border-b border-gray-200 pb-4">
          <p className="text-xs text-gray-500">ÉCOLE NATIONALE D&apos;ÉCONOMIE APPLIQUÉE ET DE MANAGEMENT (ENEAM)</p>
          <p className="text-xs text-gray-500">UNIVERSITÉ D&apos;ABOMEY-CALAVI (UAC)</p>
          <h1 className="text-lg font-bold text-gray-900 mt-3">RELEVÉ DE NOTES</h1>
          <p className="text-sm text-gray-600">{niveauNom} — Année académique {annee?.libelle ?? ''}</p>
        </div>

        {/* Infos étudiant */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-6">
          <p><span className="text-gray-400">Nom et prénom : </span><span className="font-medium">{etudiant.nom} {etudiant.prenom}</span></p>
          <p><span className="text-gray-400">Matricule : </span><span className="font-medium">{etudiant.matricule}</span></p>
        </div>

        {/* Par semestre */}
        {semestres.map((sem, i) => {
          const uesSemestre = ues.filter(u => u.semestre_id === sem.id)
          return (
            <div key={sem.id} className="mb-6">
              <h2 className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-1.5 rounded">
                {sem.code} — {sem.nom}
              </h2>
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1.5 font-medium text-gray-500">UE / ECUE</th>
                    <th className="text-center py-1.5 font-medium text-gray-500 w-16">Crédits</th>
                    <th className="text-center py-1.5 font-medium text-gray-500 w-20">Note</th>
                    <th className="text-center py-1.5 font-medium text-gray-500 w-16">Résultat</th>
                  </tr>
                </thead>
                {uesSemestre.map(ue => {
                    const ecuesUe = ecues.filter(e => e.ue_id === ue.id)
                    const moyUe = moyennesUe.get(ue.id) ?? null
                    return (
                      <tbody key={ue.id}>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <td className="py-1.5 font-semibold text-gray-700">{ue.code} — {ue.nom}</td>
                          <td className="text-center py-1.5 text-gray-600">{ue.credits ?? '—'}</td>
                          <td className="text-center py-1.5 font-semibold text-gray-800">{moyUe !== null ? moyUe.toFixed(2) : '—'}</td>
                          <td className="text-center py-1.5 font-semibold">
                            {estValide(moyUe) === null ? '—' : estValide(moyUe) ? 'V' : 'NV'}
                          </td>
                        </tr>
                        {ecuesUe.map(e => (
                          <tr key={e.id} className="border-b border-gray-50">
                            <td className="py-1 pl-4 text-gray-500">{e.nom}</td>
                            <td className="text-center py-1 text-gray-400">{e.credits}</td>
                            <td className="text-center py-1 text-gray-500"></td>
                            <td className="text-center py-1 text-gray-400"></td>
                          </tr>
                        ))}
                      </tbody>
                    )
                  })}
              </table>
              <p className="text-right text-xs font-semibold text-gray-700 mt-1">
                Moyenne {sem.code} : {moyennesSemestre[i] !== null ? moyennesSemestre[i]!.toFixed(2) : '—'} / 20
              </p>
            </div>
          )
        })}

        {/* Synthèse annuelle */}
        <div className="border-t border-gray-300 pt-4 mt-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">
              Moyenne générale annuelle : {moyenneAnnuelle !== null ? moyenneAnnuelle.toFixed(2) : '—'} / 20
            </p>
            {mention(moyenneAnnuelle) && (
              <p className="text-xs text-gray-500">Mention : {mention(moyenneAnnuelle)}</p>
            )}
          </div>
          <p className="text-sm font-semibold">
            {estValide(moyenneAnnuelle) === null ? '' : estValide(moyenneAnnuelle) ? 'ADMIS(E)' : 'AJOURNÉ(E)'}
          </p>
        </div>

        <div className="mt-12 flex justify-end">
          <div className="text-center text-xs text-gray-500">
            <p>Fait à Cotonou, le {new Date().toLocaleDateString('fr-FR')}</p>
            <p className="mt-8">Le Directeur de l&apos;ENEAM</p>
          </div>
        </div>
      </div>
    </div>
  )
}
