import { createClient } from '@/lib/supabase/server'
import EmargementChecklist from './EmargementChecklist'

type CoursOption = {
  id: string
  ecue_id: string
  ecues: { code: string; nom: string; niveau_id: string; niveaux: { nom: string } | null } | null
  enseignants: { nom: string; prenom: string } | null
}

export default async function EmargementPage({
  searchParams,
}: {
  searchParams: Promise<{ cours_id?: string; date?: string }>
}) {
  const { cours_id, date } = await searchParams
  const supabase = await createClient()

  const { data: annee } = await supabase.from('annees_academiques').select('id, libelle').eq('active', true).single()

  const { data: coursRaw } = await supabase
    .from('cours')
    .select('id, ecue_id, ecues(code, nom, niveau_id, niveaux(nom)), enseignants(nom, prenom)')
    .eq('annee_academique_id', annee?.id ?? '')

  const coursOptions = (coursRaw ?? []) as unknown as CoursOption[]

  let etudiants: { id: string; matricule: string; nom: string; prenom: string }[] = []
  let presencesInitiales: Record<string, boolean> = {}

  if (cours_id && date) {
    const coursSelectionne = coursOptions.find(c => c.id === cours_id)
    if (coursSelectionne?.ecues?.niveau_id) {
      const { data: etudiantsData } = await supabase
        .from('etudiants')
        .select('id, matricule, nom, prenom')
        .eq('niveau_id', coursSelectionne.ecues.niveau_id)
        .order('nom')
      etudiants = etudiantsData ?? []

      const { data: emargement } = await supabase
        .from('emargements')
        .select('id')
        .eq('cours_id', cours_id)
        .eq('date_seance', date)
        .maybeSingle()

      if (emargement) {
        const { data: presences } = await supabase
          .from('emargement_presences')
          .select('etudiant_id, present')
          .eq('emargement_id', emargement.id)
        presences?.forEach(p => { presencesInitiales[p.etudiant_id] = p.present })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Émargement</h1>
        <p className="text-sm text-gray-500 mt-0.5">{annee ? `Année ${annee.libelle}` : ''}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <form method="get" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[260px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Cours *</label>
            <select name="cours_id" defaultValue={cours_id ?? ''} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Sélectionner un cours --</option>
              {coursOptions.map(c => (
                <option key={c.id} value={c.id}>
                  {c.ecues?.niveaux?.nom} — {c.ecues?.code} {c.ecues?.nom} ({c.enseignants?.prenom} {c.enseignants?.nom})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Date *</label>
            <input type="date" name="date" defaultValue={date ?? ''} required
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Charger la liste
          </button>
        </form>

        {coursOptions.length === 0 && (
          <p className="text-sm text-amber-600 mt-3">
            Aucun cours configuré. Allez d&apos;abord dans /admin/cours pour assigner des enseignants aux matières.
          </p>
        )}
      </div>

      {cours_id && date && etudiants.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Liste de présence — {date}
          </h2>
          <EmargementChecklist
            coursId={cours_id}
            dateSeance={date}
            etudiants={etudiants}
            presencesInitiales={presencesInitiales}
          />
        </div>
      )}

      {cours_id && date && etudiants.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucun étudiant trouvé pour ce niveau.
        </div>
      )}
    </div>
  )
}
