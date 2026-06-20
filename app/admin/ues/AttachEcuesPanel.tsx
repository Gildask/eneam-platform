'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Ecue = { id: string; code: string; nom: string; ue_id: string | null }

export default function AttachEcuesPanel({ ueId, ecuesNiveau }: { ueId: string; ecuesNiveau: Ecue[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const disponibles = ecuesNiveau.filter(e => e.ue_id !== ueId)
  const rattachees = ecuesNiveau.filter(e => e.ue_id === ueId)

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAttach() {
    if (selected.size === 0) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/ues/${ueId}/ecues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ecue_ids: [...selected] }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erreur'); return }
    setSelected(new Set())
    router.refresh()
  }

  async function handleDetach(ecueId: string) {
    setLoading(true)
    await fetch(`/api/admin/ues/${ueId}/ecues`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ecue_id: ecueId }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="px-4 py-3 bg-gray-50/50">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        {open ? '▲ Fermer' : '▼ Gérer les ECUEs de cette UE'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {rattachees.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Déjà rattachées :</p>
              <div className="flex flex-wrap gap-2">
                {rattachees.map(e => (
                  <span key={e.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                    {e.code} — {e.nom}
                    <button onClick={() => handleDetach(e.id)} disabled={loading} className="text-blue-400 hover:text-red-600 ml-1">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {disponibles.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Sélectionner les ECUEs à rattacher :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                {disponibles.map(e => (
                  <label key={e.id} className="flex items-center gap-2 text-xs px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(e.id)}
                      onChange={() => toggle(e.id)}
                      className="rounded"
                    />
                    <span className="font-mono text-gray-400">{e.code}</span>
                    <span className="text-gray-700">{e.nom}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={handleAttach}
                disabled={loading || selected.size === 0}
                className="mt-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : `Rattacher (${selected.size})`}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Toutes les ECUEs du niveau sont déjà rattachées à une UE.</p>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
