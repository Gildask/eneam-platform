'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Ecue = {
  id: string
  code: string
  nom: string
  coefficient: number
  credits: number
  google_sheet_name: string | null
}

export default function EcueActions({ ecue }: { ecue: Ecue }) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'edit' | 'confirm-delete'>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    code: ecue.code,
    nom: ecue.nom,
    coefficient: String(ecue.coefficient),
    credits: String(ecue.credits),
    google_sheet_name: ecue.google_sheet_name ?? '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch(`/api/admin/ecues/${ecue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur'); setLoading(false); return }
    setMode('idle')
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    setLoading(true)
    const res = await fetch(`/api/admin/ecues/${ecue.id}`, { method: 'DELETE' })
    if (!res.ok) { setLoading(false); return }
    router.refresh()
  }

  if (mode === 'edit') {
    return (
      <td colSpan={6} className="px-4 py-3 bg-blue-50">
        <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Code</label>
            <input name="code" value={form.code} onChange={handleChange}
              className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 block mb-1">Nom</label>
            <input name="nom" value={form.nom} onChange={handleChange} required
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Coef.</label>
            <input name="coefficient" type="number" step="0.5" min="0.5" value={form.coefficient} onChange={handleChange}
              className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Crédits</label>
            <input name="credits" type="number" min="1" value={form.credits} onChange={handleChange}
              className="w-16 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 block mb-1">Feuille Google Sheet</label>
            <input name="google_sheet_name" value={form.google_sheet_name} onChange={handleChange}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => { setMode('idle'); setError('') }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
              Annuler
            </button>
          </div>
          {error && <p className="w-full text-xs text-red-500">{error}</p>}
        </form>
      </td>
    )
  }

  if (mode === 'confirm-delete') {
    return (
      <td colSpan={6} className="px-4 py-3 bg-red-50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-red-700">Supprimer <strong>{ecue.nom}</strong> ?</span>
          <button onClick={handleDelete} disabled={loading}
            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {loading ? '...' : 'Confirmer'}
          </button>
          <button onClick={() => setMode('idle')}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
            Annuler
          </button>
        </div>
      </td>
    )
  }

  return (
    <td className="px-4 py-2.5 text-right">
      <div className="flex gap-2 justify-end">
        <button onClick={() => setMode('edit')}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium">
          Modifier
        </button>
        <button onClick={() => setMode('confirm-delete')}
          className="text-xs text-red-500 hover:text-red-700 font-medium">
          Supprimer
        </button>
      </div>
    </td>
  )
}
