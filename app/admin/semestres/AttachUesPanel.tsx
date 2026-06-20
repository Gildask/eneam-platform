'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Ue = { id: string; code: string; nom: string; semestre_id: string | null }

export default function AttachUesPanel({ semestreId, uesNiveau }: { semestreId: string; uesNiveau: Ue[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const disponibles = uesNiveau.filter(u => u.semestre_id !== semestreId)
  const rattachees = uesNiveau.filter(u => u.semestre_id === semestreId)

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
    const res = await fetch(`/api/admin/semestres/${semestreId}/ues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ue_ids: [...selected] }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erreur'); return }
    setSelected(new Set())
    router.refresh()
  }

  async function handleDetach(ueId: string) {
    setLoading(true)
    await fetch(`/api/admin/semestres/${semestreId}/ues`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ue_id: ueId }),
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
        {open ? '▲ Fermer' : '▼ Gérer les UE de ce semestre'}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {rattachees.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Déjà rattachées :</p>
              <div className="flex flex-wrap gap-2">
                {rattachees.map(u => (
                  <span key={u.id} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                    {u.code} — {u.nom}
                    <button onClick={() => handleDetach(u.id)} disabled={loading} className="text-blue-400 hover:text-red-600 ml-1">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {disponibles.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Sélectionner les UE à rattacher :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                {disponibles.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-xs px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggle(u.id)}
                      className="rounded"
                    />
                    <span className="font-mono text-gray-400">{u.code}</span>
                    <span className="text-gray-700">{u.nom}</span>
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
            <p className="text-xs text-gray-400">Toutes les UE du niveau sont déjà rattachées à un semestre.</p>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
