import { createClient } from '@/lib/supabase/server'
import AnnonceForm from './AnnonceForm'

type AnnonceRow = {
  id: string
  titre: string
  contenu: string
  publie: boolean
  created_at: string
  niveaux: { nom: string } | null
}

export default async function AdminAnnoncesPage() {
  const supabase = await createClient()

  const [{ data: annoncesRaw }, { data: niveaux }] = await Promise.all([
    supabase
      .from('annonces')
      .select('id, titre, contenu, publie, created_at, niveaux(nom)')
      .order('created_at', { ascending: false }),
    supabase.from('niveaux').select('id, nom, code').order('code'),
  ])

  const annonces = (annoncesRaw ?? []) as unknown as AnnonceRow[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Annonces</h1>
        <span className="text-sm text-gray-400">{annonces.length} annonce(s)</span>
      </div>

      <AnnonceForm niveaux={niveaux ?? []} />

      <div className="space-y-3">
        {annonces.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-semibold text-gray-800">{a.titre}</p>
                <p className="text-sm text-gray-500 line-clamp-2">{a.contenu}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>
                    {(a.niveaux as { nom: string } | null)?.nom ?? 'Tous les niveaux'}
                  </span>
                  <span>&middot;</span>
                  <span>{new Date(a.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                a.publie ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {a.publie ? 'Publiée' : 'Brouillon'}
              </span>
            </div>
          </div>
        ))}
        {annonces.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
            Aucune annonce créée.
          </div>
        )}
      </div>
    </div>
  )
}
