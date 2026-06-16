'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Note = { id: string; type: string; valeur: number; ecues: { nom: string } | null }

const TYPE_LABELS: Record<string, string> = {
  CC1: 'CC 1', CC2: 'CC 2', CC3: 'CC 3',
  ET: 'Examen Terminal', rattrapage: 'Rattrapage', reprise: 'Reprise',
}

export default function ReclamationForm({ notes }: { notes: Note[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [noteId, setNoteId] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expirée. Reconnectez-vous.'); setLoading(false); return }

    const { error: err } = await supabase.from('reclamations').insert({
      etudiant_id: user.id,
      note_id: noteId || null,
      message: message.trim(),
    })

    if (err) { setError(err.message); setLoading(false); return }

    setNoteId('')
    setMessage('')
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>+ Déposer une réclamation</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-gray-100 px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Note concernée (optionnel)
            </label>
            <select
              value={noteId}
              onChange={e => setNoteId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Réclamation générale</option>
              {notes.map(n => (
                <option key={n.id} value={n.id}>
                  {(n.ecues as { nom: string } | null)?.nom} — {TYPE_LABELS[n.type] ?? n.type} : {n.valeur}/20
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Votre message *
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={4}
              placeholder="Décrivez votre réclamation avec précision..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
