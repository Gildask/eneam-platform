import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { noteFinaleEcueDetail, calculerResultatsNiveau, type SemestreDef, type UeDef, type EcueDef } from '@/lib/noteCalc'

export const dynamic = 'force-dynamic'

const NOTE_LABELS: Record<string, string> = {
  CC1: 'CC 1', CC2: 'CC 2', CC3: 'CC 3',
  ET: 'Exam. Terminal', rattrapage: 'Rattrapage', reprise: 'Reprise',
}
const TYPES_ORDER = ['CC1', 'CC2', 'CC3', 'ET', 'rattrapage', 'reprise']

function noteColor(v: number | null) {
  if (v === null) return 'text-gray-300'
  if (v >= 12) return 'text-green-600 font-semibold'
  if (v >= 10) return 'text-amber-600 font-semibold'
  return 'text-red-500 font-semibold'
}

type EcueRow = {
  id: string
  code: string
  nom: string
  coefficient: number
  niveau_id: string
  ue_id: string | null
  niveaux: { nom: string; code: string } | null
  ues: { code: string; nom: string } | null
}

function TableNotes({ ecues, notesIndex, typesPresents, moyennesUeMap }: {
  ecues: EcueRow[]
  notesIndex: Map<string, number | null>
  typesPresents: string[]
  moyennesUeMap: Map<string, number | null>
}) {
  const groupes: { ue: { code: string; nom: string } | null; items: EcueRow[] }[] = []
  const indexParUe = new Map<string, number>()
  ecues.forEach(e => {
    const key = e.ue_id ?? '__none__'
    if (!indexParUe.has(key)) {
      indexParUe.set(key, groupes.length)
      groupes.push({ ue: e.ue_id ? e.ues : null, items: [] })
    }
    groupes[indexParUe.get(key)!]!.items.push(e)
  })

  const showFinale = typesPresents.includes('rattrapage') || typesPresents.includes('ET')

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="text-left px-4 py-3 font-medium text-gray-500 w-1/3">Matière (ECUE)</th>
          <th className="text-center px-2 py-3 font-medium text-gray-500">Coef.</th>
          {typesPresents.map(t => (
            <th key={t} className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">{NOTE_LABELS[t]}</th>
          ))}
          {showFinale && (
            <th className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">Note finale</th>
          )}
        </tr>
      </thead>
      {groupes.map((groupe, gIdx) => {
        const items = groupe.items.map(ecue => {
          const { noteFinale, rattrapageUtilise } = noteFinaleEcueDetail({
            CC1: notesIndex.get(`${ecue.id}-CC1`) ?? null,
            CC2: notesIndex.get(`${ecue.id}-CC2`) ?? null,
            CC3: notesIndex.get(`${ecue.id}-CC3`) ?? null,
            ET: notesIndex.get(`${ecue.id}-ET`) ?? null,
            rattrapage: notesIndex.get(`${ecue.id}-rattrapage`) ?? null,
          })
          return { ecue, noteFinale, rattrapageUtilise }
        })
        const ueId = groupe.items[0]?.ue_id ?? null
        const moyUE = groupe.ue && ueId ? moyennesUeMap.get(ueId) ?? null : null

        return (
          <tbody key={gIdx} className="divide-y divide-gray-50">
            {groupe.ue && (
              <tr className="bg-gray-50">
                <td colSpan={2 + typesPresents.length + (showFinale ? 1 : 0)} className="px-4 py-2 text-xs font-semibold text-gray-600">
                  {groupe.ue.code} — {groupe.ue.nom}
                </td>
              </tr>
            )}
            {items.map(({ ecue, noteFinale }) => (
              <tr key={ecue.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{ecue.nom}</p>
                  <p className="text-xs text-gray-400">{ecue.code}</p>
                </td>
                <td className="text-center px-2 py-3 text-gray-500">{ecue.coefficient}</td>
                {typesPresents.map(t => {
                  const v = notesIndex.get(`${ecue.id}-${t}`) ?? null
                  return (
                    <td key={t} className="text-center px-3 py-3">
                      <span className={noteColor(v)}>{v !== null ? v.toFixed(2) : '—'}</span>
                    </td>
                  )
                })}
                {showFinale && (
                  <td className="text-center px-3 py-3">
                    <span className={noteColor(noteFinale)}>{noteFinale !== null ? noteFinale.toFixed(2) : '—'}</span>
                  </td>
                )}
              </tr>
            ))}
            {groupe.ue && (
              <tr className="bg-blue-50/50">
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
  )
}

export default async function EtudiantRecapPage({ params }: { params: Promise<{ id: string }> }) {
  noStore()
  const { id } = await params
  const supabase = createAdminClient()

  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('id, nom, prenom, matricule, email, telephone, niveau_id, niveaux(nom, code)')
    .eq('id', id)
    .single()

  if (!etudiant) notFound()

  const { data: annee } = await supabase
    .from('annees_academiques')
    .select('id, libelle')
    .eq('active', true)
    .single()

  const [{ data: ecuesRaw }, { data: semestresRaw }, { data: uesRaw }] = await Promise.all([
    supabase.from('ecues').select('id, code, nom, coefficient, niveau_id, ue_id, niveaux(nom, code), ues(code, nom)').order('code'),
    supabase.from('semestres').select('id, niveau_id'),
    supabase.from('ues').select('id, credits, semestre_id, niveau_id'),
  ])

  const ecues = (ecuesRaw ?? []) as unknown as EcueRow[]
  const semestresTous = (semestresRaw ?? []) as (SemestreDef & { niveau_id: string })[]
  const uesTous = (uesRaw ?? []) as (UeDef & { niveau_id: string })[]

  const { data: notes } = await supabase
    .from('notes')
    .select('ecue_id, type, valeur')
    .eq('etudiant_id', id)
    .eq('annee_academique_id', annee?.id ?? '')

  const notesIndex = new Map<string, number | null>()
  notes?.forEach(n => notesIndex.set(`${n.ecue_id}-${n.type}`, n.valeur))

  // ECUEs ayant au moins une note pour cet étudiant
  const ecueIdsAvecNotes = new Set(notes?.map(n => n.ecue_id) ?? [])
  const ecuesAvecNotes = ecues.filter(e => ecueIdsAvecNotes.has(e.id))

  // Grouper par niveau
  const parNiveau: Record<string, { niveauNom: string; ecues: EcueRow[] }> = {}
  ecuesAvecNotes.forEach(e => {
    const key = e.niveau_id
    if (!parNiveau[key]) parNiveau[key] = { niveauNom: e.niveaux?.nom ?? 'Niveau inconnu', ecues: [] }
    parNiveau[key]!.ecues.push(e)
  })

  const niveauxOrdonnes = Object.entries(parNiveau).sort(([, a], [, b]) => a.niveauNom.localeCompare(b.niveauNom))

  // Moyennes UE (avec rachat) par niveau, calculées sur la structure complète de chaque niveau
  const moyennesUeParNiveau = new Map<string, Map<string, number | null>>()
  niveauxOrdonnes.forEach(([niveauId]) => {
    const semestresNiveau = semestresTous.filter(s => s.niveau_id === niveauId)
    const uesNiveau = uesTous.filter(u => u.niveau_id === niveauId)
    const ecuesNiveauToutes = ecues.filter(e => e.niveau_id === niveauId) as EcueDef[]
    const { moyennesUe } = calculerResultatsNiveau(semestresNiveau, uesNiveau, ecuesNiveauToutes, notesIndex)
    moyennesUeParNiveau.set(niveauId, moyennesUe)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/etudiants" className="text-xs text-blue-600 hover:text-blue-800">← Retour à la liste</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{etudiant.prenom} {etudiant.nom}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {annee ? `Année académique ${annee.libelle}` : ''}
          </p>
        </div>
        <Link
          href={`/admin/etudiants/${etudiant.id}/releve`}
          className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
        >
          Relevé de notes
        </Link>
      </div>

      {/* Infos étudiant */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-6 text-sm">
        <div>
          <span className="text-gray-400 text-xs">Matricule</span>
          <p className="font-medium text-gray-900">{etudiant.matricule}</p>
        </div>
        <div>
          <span className="text-gray-400 text-xs">Email</span>
          <p className="font-medium text-gray-900">{etudiant.email}</p>
        </div>
        <div>
          <span className="text-gray-400 text-xs">Téléphone</span>
          <p className="font-medium text-gray-900">{etudiant.telephone ?? '—'}</p>
        </div>
        <div>
          <span className="text-gray-400 text-xs">Niveau actuel</span>
          <p className="font-medium text-gray-900">
            {(etudiant.niveaux as unknown as { nom: string } | null)?.nom ?? 'N/A'}
          </p>
        </div>
      </div>

      {/* Tableaux de notes par niveau */}
      {niveauxOrdonnes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">Aucune note enregistrée pour cet étudiant.</p>
        </div>
      ) : (
        niveauxOrdonnes.map(([niveauId, { niveauNom, ecues: ecuesNiveau }]) => {
          const isNiveauActuel = niveauId === etudiant.niveau_id
          const typesPresents = TYPES_ORDER.filter(t =>
            ecuesNiveau.some(e => notesIndex.get(`${e.id}-${t}`) !== undefined && notesIndex.get(`${e.id}-${t}`) !== null)
          )
          return (
            <div key={niveauId} className={`bg-white rounded-xl border overflow-hidden ${isNiveauActuel ? 'border-gray-100' : 'border-orange-100'}`}>
              <div className={`px-4 py-3 border-b flex items-center gap-2 ${isNiveauActuel ? 'bg-gray-50 border-gray-100' : 'bg-orange-50 border-orange-100'}`}>
                <span className={`text-sm font-semibold ${isNiveauActuel ? 'text-gray-700' : 'text-orange-500'}`}>{niveauNom}</span>
                {!isNiveauActuel && <span className="text-orange-400 text-xs">— reprise</span>}
              </div>
              <div className="overflow-x-auto">
                <TableNotes ecues={ecuesNiveau} notesIndex={notesIndex} typesPresents={typesPresents} moyennesUeMap={moyennesUeParNiveau.get(niveauId) ?? new Map()} />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
