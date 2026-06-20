import { createClient } from '@/lib/supabase/server'
import AddEnseignantForm from './AddEnseignantForm'
import EnseignantActions from './EnseignantActions'

type Enseignant = {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  specialite: string | null
}

export default async function EnseignantsPage() {
  const supabase = await createClient()
  const { data: enseignants } = await supabase
    .from('enseignants')
    .select('id, nom, prenom, email, telephone, specialite')
    .order('nom')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Enseignants</h1>
        <span className="text-sm text-gray-400">{enseignants?.length ?? 0} enseignant(s)</span>
      </div>

      <AddEnseignantForm />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {enseignants && enseignants.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nom complet</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Téléphone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Spécialité</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(enseignants as Enseignant[]).map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{e.prenom} {e.nom}</td>
                  <td className="px-4 py-3 text-gray-500">{e.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.telephone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{e.specialite ?? '—'}</td>
                  <EnseignantActions enseignant={e} />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <p>Aucun enseignant enregistré.</p>
          </div>
        )}
      </div>
    </div>
  )
}
