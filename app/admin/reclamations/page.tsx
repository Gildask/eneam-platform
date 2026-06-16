import { createClient } from '@/lib/supabase/server'
import ReclamationActions from './ReclamationActions'

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  en_attente: { label: 'En attente', color: 'bg-amber-50 text-amber-700' },
  en_cours:   { label: 'En cours', color: 'bg-blue-50 text-blue-700' },
  traite:     { label: 'Traité', color: 'bg-green-50 text-green-700' },
  rejete:     { label: 'Rejeté', color: 'bg-red-50 text-red-700' },
}

type RecRow = {
  id: string
  message: string
  statut: string
  reponse: string | null
  created_at: string
  etudiants: { nom: string; prenom: string; matricule: string } | null
  notes: { type: string; valeur: number; ecues: { nom: string } | null } | null
}

export default async function AdminReclamationsPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('reclamations')
    .select('id, message, statut, reponse, created_at, etudiants(nom, prenom, matricule), notes(type, valeur, ecues(nom))')
    .order('created_at', { ascending: false })

  const reclamations = (raw ?? []) as unknown as RecRow[]
  const enAttente = reclamations.filter(r => r.statut === 'en_attente').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Réclamations</h1>
          {enAttente > 0 && (
            <p className="text-sm text-amber-600 mt-0.5">{enAttente} réclamation(s) en attente de traitement</p>
          )}
        </div>
        <span className="text-sm text-gray-400">{reclamations.length} au total</span>
      </div>

      {reclamations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          Aucune réclamation reçue.
        </div>
      ) : (
        <div className="space-y-3">
          {reclamations.map(rec => {
            const { label, color } = STATUT_LABELS[rec.statut] ?? { label: rec.statut, color: 'bg-gray-50 text-gray-600' }
            const note = rec.notes as { type: string; valeur: number; ecues: { nom: string } | null } | null
            return (
              <div key={rec.id} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm">
                        {rec.etudiants?.prenom} {rec.etudiants?.nom}
                      </p>
                      <span className="text-xs text-gray-400">{rec.etudiants?.matricule}</span>
                    </div>
                    {note && (
                      <p className="text-xs text-gray-400">
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
                  <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-2 text-sm text-green-700">
                    <span className="font-medium text-xs">Réponse : </span>{rec.reponse}
                  </div>
                )}

                <ReclamationActions reclamationId={rec.id} currentStatut={rec.statut} currentReponse={rec.reponse} />

                <p className="text-xs text-gray-300">
                  Reçue le {new Date(rec.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
