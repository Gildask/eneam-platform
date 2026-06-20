import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import type { NoteType } from '@/lib/types'
import { noteFinaleEcue, moyenneUE } from '@/lib/noteCalc'
import RefreshButton from './RefreshButton'

export const dynamic = 'force-dynamic'

const NOTE_LABELS: Record<NoteType, string> = {
  CC1: 'CC 1',
  CC2: 'CC 2',
  CC3: 'CC 3',
  ET: 'Exam. Terminal',
  rattrapage: 'Rattrapage',
  reprise: 'Reprise',
}

const NOTE_COLORS: Record<NoteType, string> = {
  CC1: 'bg-blue-50 text-blue-700',
  CC2: 'bg-blue-50 text-blue-700',
  CC3: 'bg-blue-50 text-blue-700',
  ET: 'bg-indigo-50 text-indigo-700',
  rattrapage: 'bg-amber-50 text-amber-700',
  reprise: 'bg-orange-50 text-orange-700',
}

function noteColor(valeur: number | null) {
  if (valeur === null) return 'text-gray-300'
  if (valeur >= 12) return 'text-green-600 font-semibold'
  if (valeur >= 10) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

type EcueAffichage = {
  id: string
  code: string
  nom: string
  coefficient: number
  ue_id: string | null
  ues: { code: string; nom: string } | null
}

function NotesTable({ ecues, notesIndex, typesPresents }: {
  ecues: EcueAffichage[]
  notesIndex: Map<string, number | null>
  typesPresents: NoteType[]
}) {
  // Regrouper par UE (les ECUEs sans UE restent affichées directement, sans moyenne de groupe)
  const groupes: { ue: { code: string; nom: string } | null; items: EcueAffichage[] }[] = []
  const indexParUe = new Map<string, number>()

  ecues.forEach(e => {
    const key = e.ue_id ?? '__none__'
    if (!indexParUe.has(key)) {
      indexParUe.set(key, groupes.length)
      groupes.push({ ue: e.ue_id ? e.ues : null, items: [] })
    }
    groupes[indexParUe.get(key)!]!.items.push(e)
  })

  const showRattrapage = typesPresents.includes('rattrapage') || typesPresents.includes('ET')

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="sticky top-0 z-10 bg-white text-left px-4 py-3 font-medium text-gray-500 w-1/3">Matière (ECUE)</th>
            <th className="sticky top-0 z-10 bg-white text-center px-2 py-3 font-medium text-gray-500">Coef.</th>
            {typesPresents.map(type => (
              <th key={type} className="sticky top-0 z-10 bg-white text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${NOTE_COLORS[type]}`}>
                  {NOTE_LABELS[type]}
                </span>
              </th>
            ))}
            {showRattrapage && (
              <th className="sticky top-0 z-10 bg-white text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">
                Note finale
              </th>
            )}
          </tr>
        </thead>
          {groupes.map((groupe, gIdx) => {
            const ecuesAvecNoteFinale = groupe.items.map(ecue => ({
              ecue,
              noteFinale: noteFinaleEcue({
                CC1: notesIndex.get(`${ecue.id}-CC1`) ?? null,
                CC2: notesIndex.get(`${ecue.id}-CC2`) ?? null,
                CC3: notesIndex.get(`${ecue.id}-CC3`) ?? null,
                ET: notesIndex.get(`${ecue.id}-ET`) ?? null,
                rattrapage: notesIndex.get(`${ecue.id}-rattrapage`) ?? null,
              }),
            }))

            const moyUE = groupe.ue
              ? moyenneUE(ecuesAvecNoteFinale.map(({ ecue, noteFinale }) => ({ noteFinale, coefficient: ecue.coefficient })))
              : null

            return (
              <tbody key={gIdx} className="divide-y divide-gray-50">
                {groupe.ue && (
                  <tr className="bg-gray-50">
                    <td colSpan={2 + typesPresents.length + (showRattrapage ? 1 : 0)} className="px-4 py-2 text-xs font-semibold text-gray-600">
                      {groupe.ue.code} — {groupe.ue.nom}
                    </td>
                  </tr>
                )}
                {ecuesAvecNoteFinale.map(({ ecue, noteFinale }) => (
                  <tr key={ecue.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{ecue.nom}</p>
                      <p className="text-xs text-gray-400">{ecue.code}</p>
                    </td>
                    <td className="text-center px-2 py-3 text-gray-500">{ecue.coefficient}</td>
                    {typesPresents.map(type => {
                      const valeur = notesIndex.get(`${ecue.id}-${type}`) ?? null
                      return (
                        <td key={type} className="text-center px-3 py-3">
                          <span className={noteColor(valeur)}>
                            {valeur !== null ? valeur.toFixed(2) : '—'}
                          </span>
                        </td>
                      )
                    })}
                    {showRattrapage && (
                      <td className="text-center px-3 py-3">
                        <span className={noteColor(noteFinale)}>
                          {noteFinale !== null ? noteFinale.toFixed(2) : '—'}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
                {groupe.ue && (
                  <tr key={`ue-avg-${gIdx}`} className="bg-blue-50/50">
                    <td colSpan={1 + typesPresents.length} className="px-4 py-2 text-xs font-semibold text-blue-700 text-right">
                      Moyenne UE
                    </td>
                    <td className="text-center px-2 py-2"></td>
                    <td className="text-center px-3 py-2">
                      <span className={`text-xs font-bold ${noteColor(moyUE)}`}>
                        {moyUE !== null ? moyUE.toFixed(2) : '—'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
      </table>
    </div>
  )
}

export default async function NotesPage() {
  noStore()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Année académique active
  const { data: annee } = await supabase
    .from('annees_academiques')
    .select('id, libelle')
    .eq('active', true)
    .single()

  // Infos étudiant
  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('nom, prenom, matricule, niveau_id, niveaux(nom, code)')
    .eq('id', user.id)
    .single()

  // ECUEs du niveau actuel
  const { data: ecuesNiveauRaw } = await supabase
    .from('ecues')
    .select('id, code, nom, coefficient, credits, niveau_id, ue_id, ues(code, nom)')
    .eq('niveau_id', etudiant?.niveau_id ?? '')
    .order('code')

  const ecuesNiveau = (ecuesNiveauRaw ?? []) as unknown as EcueAffichage[]

  // Toutes les notes de l'étudiant pour l'année active
  const { data: notes } = await supabase
    .from('notes')
    .select('ecue_id, type, valeur')
    .eq('etudiant_id', user.id)
    .eq('annee_academique_id', annee?.id ?? '')

  // Index notes par ecue_id + type
  const notesIndex = new Map<string, number | null>()
  notes?.forEach(n => notesIndex.set(`${n.ecue_id}-${n.type}`, n.valeur))

  // Reprises : admin client pour récupérer toutes les notes hors niveau actuel
  const supabaseAdmin = createAdminClient()
  const ecueIdsNiveau = new Set(ecuesNiveau.map(e => e.id))

  const { data: notesHorsNiveau } = await supabaseAdmin
    .from('notes')
    .select('ecue_id, type, valeur')
    .eq('etudiant_id', user.id)
    .eq('annee_academique_id', annee?.id ?? '')
    .not('valeur', 'is', null)

  const ecueIdsReprises = [...new Set(
    (notesHorsNiveau ?? []).filter(n => !ecueIdsNiveau.has(n.ecue_id)).map(n => n.ecue_id)
  )]

  type EcueReprise = EcueAffichage & { niveau_id: string; niveaux: { nom: string; code: string } | null }

  let ecuesReprisesRaw: EcueReprise[] = []
  if (ecueIdsReprises.length > 0) {
    const { data } = await supabaseAdmin
      .from('ecues')
      .select('id, code, nom, coefficient, credits, niveau_id, ue_id, ues(code, nom), niveaux(nom, code)')
      .in('id', ecueIdsReprises)
      .order('code')
    ecuesReprisesRaw = (data ?? []) as unknown as EcueReprise[]
  }

  // Grouper par niveau d'origine
  const reprisesByNiveau: Record<string, { niveauNom: string; ecues: EcueReprise[] }> = {}
  ecuesReprisesRaw.forEach((e) => {
    const key = e.niveau_id
    const niveauNom = e.niveaux?.nom ?? 'Autre niveau'
    if (!reprisesByNiveau[key]) reprisesByNiveau[key] = { niveauNom, ecues: [] }
    reprisesByNiveau[key]!.ecues.push(e)
  })

  const typesPresents: NoteType[] = ['CC1', 'CC2', 'CC3', 'ET', 'rattrapage', 'reprise']

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes notes</h1>
          {annee && (
            <p className="text-sm text-gray-500 mt-0.5">Année académique {annee.libelle}</p>
          )}
        </div>
        <RefreshButton />
      </div>

      {/* Infos étudiant */}
      {etudiant && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs">Étudiant</span>
            <p className="font-medium text-gray-900">{etudiant.prenom} {etudiant.nom}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Matricule</span>
            <p className="font-medium text-gray-900">{etudiant.matricule}</p>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Niveau</span>
            <p className="font-medium text-gray-900">
              {(etudiant.niveaux as unknown as { nom: string } | null)?.nom ?? 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Tableau des notes du niveau actuel */}
      {ecuesNiveau.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <NotesTable ecues={ecuesNiveau} notesIndex={notesIndex} typesPresents={typesPresents} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">Aucune matière enregistrée pour votre niveau.</p>
          <p className="text-gray-300 text-sm mt-1">Contactez le service des programmes spéciaux.</p>
        </div>
      )}

      {/* Section Reprises : matières des années antérieures */}
      {Object.entries(reprisesByNiveau).map(([niveauId, { niveauNom, ecues }]) => {
        // N'afficher que les colonnes qui ont au moins une note non nulle pour ces ECUEs
        const ecueIds = new Set(ecues.map(e => e.id))
        const typesAvecValeur = typesPresents.filter(t =>
          notes?.some(n => ecueIds.has(n.ecue_id) && n.type === t && n.valeur !== null)
        )
        const typesReprise = typesAvecValeur.length > 0 ? typesAvecValeur : typesPresents
        return (
          <div key={niveauId} className="bg-white rounded-xl border border-orange-100 overflow-hidden">
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
              <span className="text-orange-500 text-sm font-semibold">Reprises</span>
              <span className="text-orange-400 text-xs">— matières de {niveauNom}</span>
            </div>
            <NotesTable ecues={ecues} notesIndex={notesIndex} typesPresents={typesReprise} />
          </div>
        )
      })}

      {/* Légende */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="text-green-600">■ Note ≥ 12 : Bien</span>
        <span className="text-amber-600">■ Note ≥ 10 : Passable</span>
        <span className="text-red-500">■ Note &lt; 10 : Insuffisant</span>
        <span>— : Note non encore disponible</span>
      </div>
    </div>
  )
}
