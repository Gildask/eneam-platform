import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AddEtudiantForm from './AddEtudiantForm'

type EtudiantRow = {
  id: string
  matricule: string
  nom: string
  prenom: string
  email: string
  telephone: string | null
  niveau_id: string | null
  niveaux: { nom: string; code: string } | null
}

export default async function EtudiantsPage() {
  const supabase = await createClient()

  const [{ data: etudiantsRaw }, { data: niveaux }] = await Promise.all([
    supabase
      .from('etudiants')
      .select('id, matricule, nom, prenom, email, telephone, niveau_id, niveaux(nom, code)')
      .order('nom'),
    supabase.from('niveaux').select('id, nom, code').order('code'),
  ])

  const etudiants = (etudiantsRaw ?? []) as unknown as EtudiantRow[]

  const grouped = etudiants.reduce<Record<string, EtudiantRow[]>>((acc, e) => {
    const key = e.niveau_id ?? '__none__'
    if (!acc[key]) acc[key] = []
    acc[key]!.push(e)
    return acc
  }, {})

  Object.values(grouped).forEach(list =>
    list.sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom))
  )

  const niveauxOrdonnes = (niveaux ?? []).filter(n => grouped[n.id])
  const groupesAffiches = [
    ...niveauxOrdonnes.map(n => ({ key: n.id, nom: n.nom, etudiants: grouped[n.id]! })),
    ...(grouped['__none__'] ? [{ key: '__none__', nom: 'Sans niveau', etudiants: grouped['__none__'] }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Étudiants</h1>
        <span className="text-sm text-gray-400">{etudiants?.length ?? 0} étudiant(s)</span>
      </div>

      <AddEtudiantForm niveaux={niveaux ?? []} />

      {groupesAffiches.map(groupe => (
        <div key={groupe.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">{groupe.nom}</h2>
            <span className="text-xs text-gray-400">{groupe.etudiants.length} étudiant(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Matricule</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nom complet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Téléphone</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupe.etudiants.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.matricule}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.nom} {e.prenom}</td>
                  <td className="px-4 py-3 text-gray-500">{e.email}</td>
                  <td className="px-4 py-3 text-gray-500">{e.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/admin/etudiants/${e.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Voir les notes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {etudiants.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun étudiant enregistré.</p>
          <p className="text-sm mt-1">Utilisez le formulaire ci-dessus pour en ajouter.</p>
        </div>
      )}
    </div>
  )
}
