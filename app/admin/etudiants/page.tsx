import { createClient } from '@/lib/supabase/server'
import AddEtudiantForm from './AddEtudiantForm'

type EtudiantRow = {
  id: string
  matricule: string
  nom: string
  prenom: string
  email: string
  telephone: string | null
  niveaux: { nom: string } | null
}

export default async function EtudiantsPage() {
  const supabase = await createClient()

  const [{ data: etudiantsRaw }, { data: niveaux }] = await Promise.all([
    supabase
      .from('etudiants')
      .select('id, matricule, nom, prenom, email, telephone, niveaux(nom)')
      .order('nom'),
    supabase.from('niveaux').select('id, nom, code').order('code'),
  ])

  const etudiants = (etudiantsRaw ?? []) as unknown as EtudiantRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Étudiants</h1>
        <span className="text-sm text-gray-400">{etudiants?.length ?? 0} étudiant(s)</span>
      </div>

      <AddEtudiantForm niveaux={niveaux ?? []} />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {etudiants && etudiants.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Matricule</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nom complet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Niveau</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Téléphone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {etudiants.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.matricule}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{e.prenom} {e.nom}</td>
                  <td className="px-4 py-3 text-gray-500">{e.email}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {e.niveaux?.nom ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.telephone ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <p>Aucun étudiant enregistré.</p>
            <p className="text-sm mt-1">Utilisez le formulaire ci-dessus pour en ajouter.</p>
          </div>
        )}
      </div>
    </div>
  )
}
