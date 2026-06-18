import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'
import AddRepriseForm from './AddRepriseForm'
import DeleteRepriseButton from './DeleteRepriseButton'

export const dynamic = 'force-dynamic'

const NOTE_LABELS: Record<string, string> = {
  CC1: 'CC 1', CC2: 'CC 2', CC3: 'CC 3',
  ET: 'Exam. Terminal', rattrapage: 'Rattrapage', reprise: 'Reprise',
}

function noteColor(v: number | null) {
  if (v === null) return 'text-gray-400'
  if (v >= 12) return 'text-green-600 font-semibold'
  if (v >= 10) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

export default async function ReprisesPage() {
  noStore()
  const supabase = createAdminClient()

  const [
    { data: niveaux },
    { data: etudiants },
    { data: ecues },
    { data: annee },
  ] = await Promise.all([
    supabase.from('niveaux').select('id, nom, code').order('code'),
    supabase.from('etudiants').select('id, nom, prenom, matricule, niveau_id').order('matricule'),
    supabase.from('ecues').select('id, nom, code, niveau_id').order('code'),
    supabase.from('annees_academiques').select('id, libelle').eq('active', true).single(),
  ])

  // Récupérer toutes les notes de reprise (ecue d'un niveau différent de l'étudiant)
  type NoteRow = {
    id: string
    valeur: number | null
    type: string
    etudiant_id: string
    ecue_id: string
    etudiants: { nom: string; prenom: string; matricule: string; niveau_id: string } | null
    ecues: { nom: string; code: string; niveau_id: string } | null
  }

  const { data: notesRaw } = await supabase
    .from('notes')
    .select('id, valeur, type, etudiant_id, ecue_id, etudiants(nom, prenom, matricule, niveau_id), ecues(nom, code, niveau_id)')
    .eq('annee_academique_id', annee?.id ?? '')

  const notes = (notesRaw ?? []) as unknown as NoteRow[]

  const reprises = notes.filter(n => {
    const etudiantNiveau = n.etudiants?.niveau_id
    const ecueNiveau = n.ecues?.niveau_id
    return etudiantNiveau && ecueNiveau && etudiantNiveau !== ecueNiveau
  })

  const niveauxMap = new Map((niveaux ?? []).map(n => [n.id, n.nom]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Gestion des reprises</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Notes pour des matières d&apos;un niveau antérieur. {annee ? `Année : ${annee.libelle}` : ''}
        </p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Saisir une note de reprise</h2>
        <AddRepriseForm
          niveaux={niveaux ?? []}
          etudiants={etudiants ?? []}
          ecues={ecues ?? []}
        />
      </div>

      {/* Liste des notes de reprise existantes */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">
            Notes de reprise saisies ({reprises.length})
          </h2>
        </div>

        {reprises.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-8 text-center">Aucune note de reprise enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Étudiant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Niveau étudiant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Matière (ECUE)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Niveau matière</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Note</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reprises.map(n => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{n.etudiants?.prenom} {n.etudiants?.nom}</p>
                      <p className="text-xs text-gray-400">{n.etudiants?.matricule}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {niveauxMap.get(n.etudiants?.niveau_id ?? '') ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{n.ecues?.nom}</p>
                      <p className="text-xs text-gray-400">{n.ecues?.code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {niveauxMap.get(n.ecues?.niveau_id ?? '') ?? '—'}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                        {NOTE_LABELS[n.type] ?? n.type}
                      </span>
                    </td>
                    <td className={`text-center px-4 py-3 ${noteColor(n.valeur)}`}>
                      {n.valeur !== null ? n.valeur.toFixed(2) : '—'}
                    </td>
                    <td className="text-center px-4 py-3">
                      <DeleteRepriseButton noteId={n.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
