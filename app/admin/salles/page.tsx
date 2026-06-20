import { createClient } from '@/lib/supabase/server'
import AddSalleForm from './AddSalleForm'
import SalleActions from './SalleActions'

type Salle = { id: string; nom: string; capacite: number | null }

export default async function SallesPage() {
  const supabase = await createClient()
  const { data: salles } = await supabase.from('salles').select('id, nom, capacite').order('nom')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Salles</h1>
        <span className="text-sm text-gray-400">{salles?.length ?? 0} salle(s)</span>
      </div>

      <AddSalleForm />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {salles && salles.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nom</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Capacité</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(salles as Salle[]).map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.nom}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{s.capacite ?? '—'}</td>
                  <SalleActions salle={s} />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-400">
            <p>Aucune salle enregistrée.</p>
          </div>
        )}
      </div>
    </div>
  )
}
