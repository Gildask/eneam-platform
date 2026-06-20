import { createClient } from '@/lib/supabase/server'
import CoursRow from './CoursRow'

type Ecue = { id: string; code: string; nom: string; niveau_id: string; niveaux: { nom: string } | null }
type Cours = {
  id: string
  ecue_id: string
  enseignant_id: string
  salle_id: string | null
  jour_semaine: string | null
  heure_debut: string | null
  heure_fin: string | null
}

export default async function CoursPage() {
  const supabase = await createClient()

  const { data: annee } = await supabase.from('annees_academiques').select('id, libelle').eq('active', true).single()

  const [{ data: ecuesRaw }, { data: coursRaw }, { data: enseignants }, { data: salles }] = await Promise.all([
    supabase.from('ecues').select('id, code, nom, niveau_id, niveaux(nom)').order('niveau_id').order('code'),
    supabase.from('cours').select('id, ecue_id, enseignant_id, salle_id, jour_semaine, heure_debut, heure_fin').eq('annee_academique_id', annee?.id ?? ''),
    supabase.from('enseignants').select('id, nom, prenom').order('nom'),
    supabase.from('salles').select('id, nom').order('nom'),
  ])

  const ecues = (ecuesRaw ?? []) as unknown as Ecue[]
  const cours = (coursRaw ?? []) as Cours[]
  const coursMap = new Map(cours.map(c => [c.ecue_id, c]))

  const grouped = ecues.reduce<Record<string, Ecue[]>>((acc, e) => {
    const niveauNom = e.niveaux?.nom ?? 'Autre'
    if (!acc[niveauNom]) acc[niveauNom] = []
    acc[niveauNom]!.push(e)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Cours</h1>
        <span className="text-sm text-gray-400">{annee ? `Année ${annee.libelle}` : ''}</span>
      </div>

      {enseignants?.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 text-amber-700 text-sm px-4 py-3 rounded-xl">
          Aucun enseignant enregistré. Ajoutez-en d&apos;abord dans <a href="/admin/enseignants" className="underline font-medium">/admin/enseignants</a>.
        </div>
      )}

      {Object.entries(grouped).map(([niveauNom, items]) => (
        <div key={niveauNom} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">{niveauNom}</h2>
            <span className="text-xs text-gray-400">{items.length} matière(s)</span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Matière (ECUE)</th>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Enseignant</th>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Salle</th>
                <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Horaire</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(ecue => (
                <CoursRow
                  key={ecue.id}
                  ecue={ecue}
                  cours={coursMap.get(ecue.id) ?? null}
                  enseignants={enseignants ?? []}
                  salles={salles ?? []}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
