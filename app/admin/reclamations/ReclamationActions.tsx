'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUTS = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'traite', label: 'Traité' },
  { value: 'rejete', label: 'Rejeté' },
]

export default function ReclamationActions({
  reclamationId,
  currentStatut,
  currentReponse,
}: {
  reclamationId: string
  currentStatut: string
  currentReponse: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [statut, setStatut] = useState(currentStatut)
  const [reponse, setReponse] = useState(currentReponse ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await fetch('/api/admin/reclamations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reclamationId, statut, reponse: reponse || null }),
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          Traiter cette réclamation
        </button>
      ) : (
        <div className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex gap-2">
            <select
              value={statut}
              onChange={e => setStatut(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <textarea
            value={reponse}
            onChange={e => setReponse(e.target.value)}
            placeholder="Réponse à l'étudiant (optionnel)"
            rows={2}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">Annuler</button>
            <button onClick={handleSave} disabled={loading}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
