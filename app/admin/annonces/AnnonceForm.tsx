'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Niveau = { id: string; nom: string; code: string }

export default function AnnonceForm({ niveaux }: { niveaux: Niveau[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ titre: '', contenu: '', niveau_id: '', publie: true })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(f => ({ ...f, [e.target.name]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/admin/annonces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        niveau_id: form.niveau_id || null,
        publie: form.publie,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur.'); setLoading(false); return }

    setForm({ titre: '', contenu: '', niveau_id: '', publie: true })
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
        <span>+ Créer une annonce</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-gray-100 px-5 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Titre *</label>
            <input name="titre" value={form.titre} onChange={handleChange} required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Calendrier des examens du semestre 2" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Contenu *</label>
            <textarea name="contenu" value={form.contenu} onChange={handleChange} required rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Texte de l'annonce..." />
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Destinataires
              </label>
              <select name="niveau_id" value={form.niveau_id} onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tous les niveaux</option>
                {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pb-2 cursor-pointer">
              <input type="checkbox" name="publie" checked={form.publie}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded" />
              Publier immédiatement
            </label>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Enregistrement...' : 'Créer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
