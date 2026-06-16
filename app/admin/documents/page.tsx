import { createClient } from '@/lib/supabase/server'
import UploadDocumentForm from './UploadDocumentForm'

type DocRow = {
  id: string
  type: string
  nom_fichier: string
  created_at: string
  etudiants: { nom: string; prenom: string; matricule: string } | null
  annees_academiques: { libelle: string } | null
}

export default async function AdminDocumentsPage() {
  const supabase = await createClient()

  const [{ data: etudiantsRaw }, { data: anneesRaw }, { data: docsRaw }] = await Promise.all([
    supabase.from('etudiants').select('id, nom, prenom, matricule').order('nom'),
    supabase.from('annees_academiques').select('id, libelle').order('libelle', { ascending: false }),
    supabase
      .from('documents')
      .select('id, type, nom_fichier, created_at, etudiants(nom, prenom, matricule), annees_academiques(libelle)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const etudiants = (etudiantsRaw ?? []) as { id: string; nom: string; prenom: string; matricule: string }[]
  const annees = (anneesRaw ?? []) as { id: string; libelle: string }[]
  const docs = (docsRaw ?? []) as unknown as DocRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Gestion des documents</h1>
        <span className="text-sm text-gray-400">{docs.length} document(s)</span>
      </div>

      <UploadDocumentForm etudiants={etudiants} annees={annees} />

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {docs.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Étudiant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Année</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {d.etudiants?.prenom} {d.etudiants?.nom}
                    </p>
                    <p className="text-xs text-gray-400">{d.etudiants?.matricule}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.nom_fichier}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {(d.annees_academiques as { libelle: string } | null)?.libelle ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(d.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-400">Aucun document téléversé.</div>
        )}
      </div>
    </div>
  )
}
