import { createClient } from '@/lib/supabase/server'
import AddEcueForm from './AddEcueForm'
import EcueActions from './EcueActions'

type EcueRow = {
  id: string
  code: string
  nom: string
  coefficient: number
  credits: number
  google_sheet_name: string | null
  niveau_id: string
  ue_id: string | null
  niveaux: { nom: string; code: string } | null
  ues: { code: string; nom: string } | null
}

export default async function EcuesPage() {
  const supabase = await createClient()

  const [{ data: ecuesRaw }, { data: niveaux }, { data: uesRaw }] = await Promise.all([
    supabase
      .from('ecues')
      .select('id, code, nom, coefficient, credits, google_sheet_name, niveau_id, ue_id, niveaux(nom, code), ues(code, nom)')
      .order('niveau_id')
      .order('code'),
    supabase.from('niveaux').select('id, nom, code').order('code'),
    supabase.from('ues').select('id, code, nom, niveau_id').order('code'),
  ])

  const ecues = (ecuesRaw ?? []) as unknown as EcueRow[]
  const ues = uesRaw ?? []

  const grouped = ecues.reduce<Record<string, EcueRow[]>>((acc, e) => {
    const niveauNom = e.niveaux?.nom ?? 'Autre'
    if (!acc[niveauNom]) acc[niveauNom] = []
    acc[niveauNom]!.push(e)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Matières (ECUEs)</h1>
        <span className="text-sm text-gray-400">{ecues?.length ?? 0} ECUE(s)</span>
      </div>

      <AddEcueForm niveaux={niveaux ?? []} />

      {Object.entries(grouped).map(([niveau, items]) => {
        const niveauId = items[0]?.niveau_id
        const uesNiveau = ues.filter(u => u.niveau_id === niveauId)
        return (
          <div key={niveau} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">{niveau}</h2>
              <span className="text-xs text-gray-400">{items.length} matière(s)</span>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Code</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Nom</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Coef.</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Crédits</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">UE</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Feuille Google Sheet</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{e.code}</td>
                    <td className="px-4 py-2.5 text-gray-800">{e.nom}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{e.coefficient}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{e.credits}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {e.ues ? `${e.ues.code} — ${e.ues.nom}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{e.google_sheet_name ?? '—'}</td>
                    <EcueActions ecue={e} ues={uesNiveau} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucune matière enregistrée.
        </div>
      )}
    </div>
  )
}
