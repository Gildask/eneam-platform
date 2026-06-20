import { Fragment } from 'react'
import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'
import { noteFinaleEcueDetail, moyenneUE, estValide } from '@/lib/noteCalc'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

type Niveau = { id: string; nom: string; code: string }
type SemestreRow = { id: string; code: string; nom: string; ordre: number }
type UeRow = { id: string; code: string; nom: string; credits: number | null; semestre_id: string | null }
type EcueRow = { id: string; code: string; nom: string; coefficient: number; ue_id: string | null }
type Etudiant = { id: string; matricule: string; nom: string; prenom: string }

function noteColor(v: number | null) {
  if (v === null) return 'text-gray-300'
  return v >= 10 ? 'text-green-700' : 'text-red-600'
}

export default async function RecapitulatifSemestrePage({
  searchParams,
}: {
  searchParams: Promise<{ niveau_id?: string; semestre_id?: string; rattrapages?: string }>
}) {
  noStore()
  const { niveau_id, semestre_id, rattrapages } = await searchParams
  const supabase = await createClient()

  const { data: niveauxRaw } = await supabase.from('niveaux').select('id, nom, code').order('code')
  const niveaux = (niveauxRaw ?? []) as Niveau[]

  const { data: annee } = await supabase.from('annees_academiques').select('id, libelle').eq('active', true).single()

  let semestresNiveau: SemestreRow[] = []
  if (niveau_id) {
    const { data } = await supabase.from('semestres').select('id, code, nom, ordre').eq('niveau_id', niveau_id).order('ordre')
    semestresNiveau = (data ?? []) as SemestreRow[]
  }

  type LigneMatiere = { ecue: EcueRow; note: number | null; rattrapageUtilise: boolean }
  type LigneUe = { ue: UeRow; matieres: LigneMatiere[]; moyenne: number | null; valide: boolean | null }
  type Ligne = {
    etudiant: Etudiant
    ues: LigneUe[]
    creditsObtenus: number
    creditsTotal: number
    nbUeValidees: number
    moyenneGenerale: number | null
    aUneReprise: boolean
  }

  let lignes: Ligne[] = []
  let uesSemestre: UeRow[] = []
  let ecuesParUe = new Map<string, EcueRow[]>()

  if (niveau_id && semestre_id) {
    const [{ data: uesRaw }, { data: ecuesRaw }, { data: etudiantsRaw }] = await Promise.all([
      supabase.from('ues').select('id, code, nom, credits, semestre_id').eq('niveau_id', niveau_id),
      supabase.from('ecues').select('id, code, nom, coefficient, ue_id').eq('niveau_id', niveau_id),
      supabase.from('etudiants').select('id, matricule, nom, prenom').eq('niveau_id', niveau_id).order('nom'),
    ])

    const ues = (uesRaw ?? []) as UeRow[]
    const ecues = (ecuesRaw ?? []) as EcueRow[]
    const etudiants = (etudiantsRaw ?? []) as Etudiant[]
    uesSemestre = ues.filter(u => u.semestre_id === semestre_id).sort((a, b) => a.code.localeCompare(b.code))

    uesSemestre.forEach(ue => {
      ecuesParUe.set(ue.id, ecues.filter(e => e.ue_id === ue.id).sort((a, b) => a.code.localeCompare(b.code)))
    })

    const { data: notesRaw } = await supabase
      .from('notes')
      .select('etudiant_id, ecue_id, type, valeur')
      .eq('annee_academique_id', annee?.id ?? '')

    const etudiantIds = new Set(etudiants.map(e => e.id))
    const notesParEtudiant = new Map<string, Map<string, number | null>>()
    notesRaw?.forEach(n => {
      if (!etudiantIds.has(n.etudiant_id)) return
      if (!notesParEtudiant.has(n.etudiant_id)) notesParEtudiant.set(n.etudiant_id, new Map())
      notesParEtudiant.get(n.etudiant_id)!.set(`${n.ecue_id}-${n.type}`, n.valeur)
    })

    const creditsTotal = uesSemestre.reduce((a, u) => a + (u.credits ?? 1), 0)

    lignes = etudiants.map(etudiant => {
      const notesIndex = notesParEtudiant.get(etudiant.id) ?? new Map()

      const ues_: LigneUe[] = uesSemestre.map(ue => {
        const matieres: LigneMatiere[] = (ecuesParUe.get(ue.id) ?? []).map(ecue => {
          const { noteFinale, rattrapageUtilise } = noteFinaleEcueDetail({
            CC1: notesIndex.get(`${ecue.id}-CC1`) ?? null,
            CC2: notesIndex.get(`${ecue.id}-CC2`) ?? null,
            CC3: notesIndex.get(`${ecue.id}-CC3`) ?? null,
            ET: notesIndex.get(`${ecue.id}-ET`) ?? null,
            rattrapage: notesIndex.get(`${ecue.id}-rattrapage`) ?? null,
          })
          return { ecue, note: noteFinale, rattrapageUtilise }
        })

        const moyenne = moyenneUE(matieres.map(m => ({ noteFinale: m.note, coefficient: m.ecue.coefficient })) as { noteFinale: number | null; coefficient: number }[])
        return { ue, matieres, moyenne, valide: estValide(moyenne) }
      })

      const creditsObtenus = ues_.reduce((a, u) => a + (u.valide ? (u.ue.credits ?? 1) : 0), 0)
      const nbUeValidees = ues_.filter(u => u.valide).length

      const validesPourMoyenne = ues_.filter(u => u.moyenne !== null)
      const totalCoefMoy = validesPourMoyenne.reduce((a, u) => a + (u.ue.credits ?? 1), 0)
      const moyenneGenerale = totalCoefMoy === 0 ? null
        : validesPourMoyenne.reduce((a, u) => a + (u.moyenne ?? 0) * (u.ue.credits ?? 1), 0) / totalCoefMoy

      const aUneReprise = ues_.some(u => u.matieres.some(m => m.rattrapageUtilise))

      return { etudiant, ues: ues_, creditsObtenus, creditsTotal, nbUeValidees, moyenneGenerale, aUneReprise }
    })

    if (rattrapages === '1') {
      lignes = lignes.filter(l => l.ues.some(u => u.valide === false))
    }

    lignes.sort((a, b) => a.etudiant.nom.localeCompare(b.etudiant.nom) || a.etudiant.prenom.localeCompare(b.etudiant.prenom))
  }

  const niveauActuel = niveaux.find(n => n.id === niveau_id)
  const semestreActuel = semestresNiveau.find(s => s.id === semestre_id)
  const totalUe = uesSemestre.length
  const creditsTotalSemestre = uesSemestre.reduce((a, u) => a + (u.credits ?? 1), 0)

  // Statistiques
  const effectifTotal = lignes.length
  const validesSansReprise = lignes.filter(l => estValide(l.moyenneGenerale) && !l.aUneReprise).length
  const validesAvecReprise = lignes.filter(l => estValide(l.moyenneGenerale) && l.aUneReprise).length
  const nonValidesSup70 = lignes.filter(l => !estValide(l.moyenneGenerale) && creditsTotalSemestre > 0 && (l.creditsObtenus / creditsTotalSemestre) * 100 >= 70).length
  const nonValidesInf70 = lignes.filter(l => !estValide(l.moyenneGenerale) && !(creditsTotalSemestre > 0 && (l.creditsObtenus / creditsTotalSemestre) * 100 >= 70)).length
  const pct = (n: number) => effectifTotal > 0 ? ((n / effectifTotal) * 100).toFixed(2) : '0.00'

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          table { font-size: 7px; }
          th, td { padding: 1px 3px !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Récapitulatif du semestre</h1>
          <p className="text-sm text-gray-500 mt-0.5">{annee ? `Année académique ${annee.libelle}` : ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 print:hidden">
        <form method="get" className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Année d&apos;étude *</label>
            <select name="niveau_id" defaultValue={niveau_id ?? ''} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">-- Sélectionner --</option>
              {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-gray-600 mb-1 block">Semestre *</label>
            <select name="semestre_id" defaultValue={semestre_id ?? ''} required disabled={!niveau_id}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              <option value="">{niveau_id ? '-- Sélectionner --' : "Choisissez d'abord une année d'étude !"}</option>
              {semestresNiveau.map(s => <option key={s.id} value={s.id}>{s.code} — {s.nom}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900">
            Afficher
          </button>
          {niveau_id && semestre_id && (
            <a
              href={`?niveau_id=${niveau_id}&semestre_id=${semestre_id}&rattrapages=${rattrapages === '1' ? '' : '1'}`}
              className={`px-4 py-2 text-sm rounded-lg ${rattrapages === '1' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
            >
              {rattrapages === '1' ? '✓ Rattrapages (filtré)' : 'Rattrapages'}
            </a>
          )}
        </form>
      </div>

      {niveau_id && semestre_id && uesSemestre.length > 0 && (
        <>
          <PrintButton />

          {/* Légende */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-xs text-gray-600 space-y-1.5">
            {uesSemestre.map(ue => {
              const matieres = ecuesParUe.get(ue.id) ?? []
              return (
                <p key={ue.id}>
                  <span className="font-semibold text-gray-800">{ue.code}</span> ==&gt; {ue.nom} (
                  {matieres.map((m, i) => (
                    <span key={m.id}>
                      {i > 0 && ' | '}
                      {m.code}: {m.nom} ({Number(m.coefficient).toFixed(2)}%)
                    </span>
                  ))}
                  )
                </p>
              )
            })}
            <p className="pt-1 text-gray-500">
              <strong>V</strong> = Validé &nbsp;---&nbsp; <strong>NV</strong> = Non Validé &nbsp;---&nbsp;
              <span className="text-amber-600"> * Rattrapage</span>
            </p>
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between print:hidden">
              <h2 className="font-semibold text-gray-700 text-sm">
                {niveauActuel?.nom} — {semestreActuel?.code} {semestreActuel?.nom}
              </h2>
              <span className="text-xs text-gray-400">{lignes.length} étudiant(s)</span>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky left-0 z-10 bg-blue-100 border border-blue-200 px-2 py-1.5 text-left min-w-[160px] print:static">
                      Semestre : {semestreActuel?.code}
                    </th>
                    {uesSemestre.map(ue => (
                      <th key={ue.id} colSpan={(ecuesParUe.get(ue.id)?.length ?? 0) + 2}
                        className="bg-blue-100 border border-blue-200 px-2 py-1.5 whitespace-nowrap">
                        {ue.code} ({ue.credits ?? 1} Cr)
                      </th>
                    ))}
                    <th rowSpan={2} className="bg-blue-100 border border-blue-200 px-2 py-1.5 whitespace-nowrap">
                      Crédits capitalisés / {creditsTotalSemestre}
                    </th>
                    <th rowSpan={2} className="bg-blue-100 border border-blue-200 px-2 py-1.5 whitespace-nowrap">% UE</th>
                    <th rowSpan={2} className="bg-blue-100 border border-blue-200 px-2 py-1.5 whitespace-nowrap">Moyenne</th>
                    <th rowSpan={2} className="bg-blue-100 border border-blue-200 px-2 py-1.5 whitespace-nowrap">Nbre UE Validé</th>
                  </tr>
                  <tr>
                    {uesSemestre.map(ue => (
                      <Fragment key={ue.id}>
                        {(ecuesParUe.get(ue.id) ?? []).map(m => (
                          <th key={m.id} className="bg-amber-100 border border-amber-200 px-1.5 py-1 whitespace-nowrap font-normal" title={m.nom}>
                            {m.code} / {Number(m.coefficient).toFixed(2)}%
                          </th>
                        ))}
                        <th className="bg-amber-100 border border-amber-200 px-1.5 py-1">MoY</th>
                        <th className="bg-amber-100 border border-amber-200 px-1.5 py-1">Etat</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((ligne, idx) => (
                    <tr key={ligne.etudiant.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="sticky left-0 z-10 bg-inherit border border-gray-200 px-2 py-1.5 whitespace-nowrap print:static">
                        <span className="text-gray-400">{ligne.etudiant.matricule}</span>{' '}
                        <strong>{ligne.etudiant.nom}</strong> {ligne.etudiant.prenom}
                      </td>
                      {ligne.ues.map(ueLigne => (
                        <Fragment key={ueLigne.ue.id}>
                          {ueLigne.matieres.map(m => (
                            <td key={m.ecue.id} className="border border-gray-100 px-1.5 py-1.5 text-center whitespace-nowrap">
                              {m.note === null ? (
                                <span className="text-gray-300">Abs</span>
                              ) : (
                                <span className={m.rattrapageUtilise ? 'text-amber-600' : 'text-gray-700'}>
                                  {m.note.toFixed(2)}{m.rattrapageUtilise && '*'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="border border-gray-100 px-1.5 py-1.5 text-center font-semibold whitespace-nowrap">
                            <span className={noteColor(ueLigne.moyenne)}>{ueLigne.moyenne !== null ? ueLigne.moyenne.toFixed(2) : '—'}</span>
                          </td>
                          <td className="border border-gray-100 px-1.5 py-1.5 text-center">
                            {ueLigne.valide === null ? (
                              <span className="text-gray-300">—</span>
                            ) : ueLigne.valide ? (
                              <span className="inline-block bg-green-100 text-green-700 px-1.5 rounded font-semibold">V</span>
                            ) : (
                              <span className="inline-block bg-red-100 text-red-700 px-1.5 rounded font-semibold">NV</span>
                            )}
                          </td>
                        </Fragment>
                      ))}
                      <td className="border border-gray-100 px-2 py-1.5 text-center whitespace-nowrap">
                        {ligne.creditsObtenus} / {ligne.creditsTotal}
                      </td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center whitespace-nowrap">
                        {ligne.creditsTotal > 0 ? ((ligne.creditsObtenus / ligne.creditsTotal) * 100).toFixed(0) : 0}%
                      </td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center font-bold whitespace-nowrap">
                        <span className={noteColor(ligne.moyenneGenerale)}>
                          {ligne.moyenneGenerale !== null ? ligne.moyenneGenerale.toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="border border-gray-100 px-2 py-1.5 text-center whitespace-nowrap">
                        {ligne.nbUeValidees} / {totalUe}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistiques */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 text-sm text-gray-700 space-y-1 font-mono">
            <p>Nombre d&apos;étudiants ayant validé le semestre sans reprise : {validesSansReprise}</p>
            <p>Nombre d&apos;étudiants ayant validé le semestre avec des reprises : {validesAvecReprise}</p>
            <p>Nombre d&apos;étudiants n&apos;ayant pas validé le semestre et supérieur à 70% : {nonValidesSup70}</p>
            <p>Nombre d&apos;étudiants n&apos;ayant pas validé le semestre et inférieur ou égal à 70% : {nonValidesInf70}</p>
            <p>sur un effectif total de : {effectifTotal}</p>
            <div className="pt-2 space-y-0.5">
              <p>Taux des validations sans reprises : {pct(validesSansReprise)}%</p>
              <p>Taux des validations avec reprises : {pct(validesAvecReprise)}%</p>
              <p>Taux des non validations et supérieur à 70% : {pct(nonValidesSup70)}%</p>
              <p>Taux des non validations et inférieur ou égal à 70% : {pct(nonValidesInf70)}%</p>
            </div>
          </div>
        </>
      )}

      {niveau_id && semestre_id && uesSemestre.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucune UE configurée pour ce semestre.
        </div>
      )}
    </div>
  )
}
