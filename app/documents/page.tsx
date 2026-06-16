import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: annees } = await supabase
    .from('annees_academiques')
    .select('id, libelle')
    .order('libelle', { ascending: false })

  const { data: documents } = await supabase
    .from('documents')
    .select('id, type, nom_fichier, url, created_at, annees_academiques(libelle)')
    .eq('etudiant_id', user.id)
    .order('created_at', { ascending: false })

  type Doc = {
    id: string
    type: string
    nom_fichier: string
    url: string
    created_at: string
    annees_academiques: { libelle: string } | null
  }

  const docs = (documents ?? []) as unknown as Doc[]

  function typeLabel(type: string) {
    const labels: Record<string, string> = {
      bulletin: 'Bulletin de notes',
      attestation: 'Attestation de scolarité',
      releve: 'Relevé de notes',
    }
    return labels[type] ?? type
  }

  function typeIcon(type: string) {
    if (type === 'bulletin') return '📋'
    if (type === 'attestation') return '📄'
    return '🗂️'
  }

  const grouped = docs.reduce<Record<string, Doc[]>>((acc, d) => {
    const annee = (d.annees_academiques as { libelle: string } | null)?.libelle ?? 'Autre'
    if (!acc[annee]) acc[annee] = []
    acc[annee]!.push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mes documents</h1>
        <p className="text-sm text-gray-400 mt-0.5">Bulletins et documents officiels mis à disposition par l&apos;ENEAM</p>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400">Aucun document disponible pour le moment.</p>
          <p className="text-gray-300 text-sm mt-1">Les bulletins seront mis en ligne en fin d&apos;année académique.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([annee, items]) => (
          <div key={annee} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Année {annee}
            </h2>
            <div className="space-y-2">
              {items.map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeIcon(doc.type)}</span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{typeLabel(doc.type)}</p>
                      <p className="text-xs text-gray-400">
                        {doc.nom_fichier} &middot; Mis en ligne le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Télécharger
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
