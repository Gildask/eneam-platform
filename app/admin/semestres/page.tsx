import { createClient } from '@/lib/supabase/server'
import AddSemestreForm from './AddSemestreForm'
import SemestreActions from './SemestreActions'
import AttachUesPanel from './AttachUesPanel'

type SemestreRow = {
  id: string
  code: string
  nom: string
  ordre: number
  niveau_id: string
  niveaux: { nom: string; code: string } | null
}

type UeRow = {
  id: string
  code: string
  nom: string
  semestre_id: string | null
  niveau_id: string
}

export default async function SemestresPage() {
  const supabase = await createClient()

  const [{ data: semestresRaw }, { data: niveaux }, { data: uesRaw }] = await Promise.all([
    supabase.from('semestres').select('id, code, nom, ordre, niveau_id, niveaux(nom, code)').order('niveau_id').order('ordre'),
    supabase.from('niveaux').select('id, nom, code').order('code'),
    supabase.from('ues').select('id, code, nom, semestre_id, niveau_id').order('code'),
  ])

  const semestres = (semestresRaw ?? []) as unknown as SemestreRow[]
  const ues = (uesRaw ?? []) as unknown as UeRow[]

  const grouped = semestres.reduce<Record<string, SemestreRow[]>>((acc, s) => {
    const niveauNom = s.niveaux?.nom ?? 'Autre'
    if (!acc[niveauNom]) acc[niveauNom] = []
    acc[niveauNom]!.push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Semestres</h1>
        <span className="text-sm text-gray-400">{semestres?.length ?? 0} semestre(s)</span>
      </div>

      <AddSemestreForm niveaux={niveaux ?? []} />

      {Object.entries(grouped).map(([niveauNom, items]) => (
        <div key={niveauNom} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">{niveauNom}</h2>
            <span className="text-xs text-gray-400">{items.length} semestre(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Code</th>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Nom</th>
                <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Ordre</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            {items.map((s) => {
              const uesNiveau = ues.filter(u => u.niveau_id === s.niveau_id)
              return (
                <tbody key={s.id} className="divide-y divide-gray-50">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.code}</td>
                    <td className="px-4 py-2.5 text-gray-800">{s.nom}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{s.ordre}</td>
                    <SemestreActions semestre={s} />
                  </tr>
                  <tr>
                    <td colSpan={4} className="p-0">
                      <AttachUesPanel semestreId={s.id} uesNiveau={uesNiveau} />
                    </td>
                  </tr>
                </tbody>
              )
            })}
          </table>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucun semestre enregistré.
        </div>
      )}
    </div>
  )
}
