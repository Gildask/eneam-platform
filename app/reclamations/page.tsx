import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReclamationForm from './ReclamationForm'

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-amber-50 text-amber-700' },
  en_cours:   { label: 'En cours de traitement', color: 'bg-blue-50 text-blue-700' },
  traite:     { label: 'Traité', color: 'bg-green-50 text-green-700' },
  rejete:     { label: 'Rejeté', color: 'bg-red-50 text-red-700' },
}

export default async function ReclamationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: reclamations }, { data: notes }] = await Promise.all([
    supabase
      .from('reclamations')
      .select('id, message, statut, reponse, created_at, notes(type, valeur, ecues(nom))')
      .eq('etudiant_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('notes')
      .select('id, type, valeur, ecues(nom)')
      .eq('etudiant_id', user.id)
      .not('valeur', 'is', null),
  ])

  type Reclamation = {
    id: string
    message: string
    statut: string
    reponse: string | null
    created_at: string
    notes: { type: string; valeur: number; ecues: { nom: string } | null } | null
  }

  type Note = {
    id: string
    type: string
    valeur: number
    ecues: { nom: string } | null
  }

  const recs = (reclamations ?? []) as unknown as Reclamation[]
  const notesList = (notes ?? []) as unknown as Note[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Réclamations</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Si vous pensez qu&apos;une note est erronée, déposez une réclamation ici.
        </p>
      </div>

      <ReclamationForm notes={notesList} />

      {recs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucune réclamation déposée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mes réclamations</h2>
          {recs.map((rec) => {
            const note = rec.notes
            const { label, color } = STATUT_LABELS[rec.statut] ?? { label: rec.statut, color: 'bg-gray-50 text-gray-600' }
            return (
              <div key={rec.id} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {note && (
                      <p className="text-xs text-gray-400 mb-1">
                        {(note.ecues as { nom: string } | null)?.nom} &middot; {note.type} &middot; {note.valeur}/20
                      </p>
                    )}
                    <p className="text-sm text-gray-700">{rec.message}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${color}`}>
                    {label}
                  </span>
                </div>
                {rec.reponse && (
                  <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 text-sm text-green-700">
                    <p className="font-medium text-xs mb-1">Réponse du service</p>
                    {rec.reponse}
                  </div>
                )}
                <p className="text-xs text-gray-300">
                  Déposée le {new Date(rec.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
