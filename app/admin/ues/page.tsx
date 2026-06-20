import { createClient } from '@/lib/supabase/server'
import AddUeForm from './AddUeForm'
import UeActions from './UeActions'

type UeRow = {
  id: string
  code: string
  nom: string
  credits: number | null
  niveau_id: string
  niveaux: { nom: string; code: string } | null
}

type EcueRow = {
  id: string
  code: string
  nom: string
  coefficient: number
  ue_id: string | null
}

export default async function UesPage() {
  const supabase = await createClient()

  const [{ data: uesRaw }, { data: niveaux }, { data: ecuesRaw }] = await Promise.all([
    supabase.from('ues').select('id, code, nom, credits, niveau_id, niveaux(nom, code)').order('niveau_id').order('code'),
    supabase.from('niveaux').select('id, nom, code').order('code'),
    supabase.from('ecues').select('id, code, nom, coefficient, ue_id, niveau_id').order('code'),
  ])

  const ues = (uesRaw ?? []) as unknown as UeRow[]
  const ecues = (ecuesRaw ?? []) as unknown as (EcueRow & { niveau_id: string })[]

  const grouped = ues.reduce<Record<string, UeRow[]>>((acc, u) => {
    const niveauNom = u.niveaux?.nom ?? 'Autre'
    if (!acc[niveauNom]) acc[niveauNom] = []
    acc[niveauNom]!.push(u)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Unités d&apos;Enseignement (UE)</h1>
        <span className="text-sm text-gray-400">{ues?.length ?? 0} UE(s)</span>
      </div>

      <AddUeForm niveaux={niveaux ?? []} />

      {Object.entries(grouped).map(([niveauNom, items]) => (
        <div key={niveauNom} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">{niveauNom}</h2>
            <span className="text-xs text-gray-400">{items.length} UE(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Code</th>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Nom</th>
                <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Crédits</th>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">ECUEs rattachées</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((u) => {
                const ecuesRattachees = ecues.filter(e => e.ue_id === u.id)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{u.code}</td>
                    <td className="px-4 py-2.5 text-gray-800">{u.nom}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{u.credits ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {ecuesRattachees.length > 0
                        ? ecuesRattachees.map(e => e.code).join(', ')
                        : <span className="text-gray-300">Aucune</span>}
                    </td>
                    <UeActions ue={u} />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucune UE enregistrée.
        </div>
      )}
    </div>
  )
}
