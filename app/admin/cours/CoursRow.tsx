'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Enseignant = { id: string; nom: string; prenom: string }
type Salle = { id: string; nom: string }
type Cours = {
  id: string
  enseignant_id: string
  salle_id: string | null
  jour_semaine: string | null
  heure_debut: string | null
  heure_fin: string | null
}

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function CoursRow({
  ecue, cours, enseignants, salles,
}: {
  ecue: { id: string; code: string; nom: string }
  cours: Cours | null
  enseignants: Enseignant[]
  salles: Salle[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    enseignant_id: cours?.enseignant_id ?? '',
    salle_id: cours?.salle_id ?? '',
    jour_semaine: cours?.jour_semaine ?? '',
    heure_debut: cours?.heure_debut ?? '',
    heure_fin: cours?.heure_fin ?? '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const url = cours ? `/api/admin/cours/${cours.id}` : '/api/admin/cours'
    const method = cours ? 'PATCH' : 'POST'
    const body = cours ? form : { ...form, ecue_id: ecue.id }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erreur'); return }
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!cours) return
    setLoading(true)
    await fetch(`/api/admin/cours/${cours.id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  const enseignant = enseignants.find(e => e.id === cours?.enseignant_id)
  const salle = salles.find(s => s.id === cours?.salle_id)

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-2.5">
          <p className="font-medium text-gray-800">{ecue.nom}</p>
          <p className="text-xs text-gray-400">{ecue.code}</p>
        </td>
        <td className="px-4 py-2.5 text-gray-600">
          {enseignant ? `${enseignant.prenom} ${enseignant.nom}` : <span className="text-gray-300">Non assigné</span>}
        </td>
        <td className="px-4 py-2.5 text-gray-500 text-xs">{salle?.nom ?? '—'}</td>
        <td className="px-4 py-2.5 text-gray-500 text-xs">
          {cours?.jour_semaine ? `${cours.jour_semaine} ${cours.heure_debut ?? ''}-${cours.heure_fin ?? ''}` : '—'}
        </td>
        <td className="px-4 py-2.5 text-right">
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(o => !o)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              {cours ? 'Modifier' : 'Assigner'}
            </button>
            {cours && (
              <button onClick={handleDelete} disabled={loading} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Retirer
              </button>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} className="px-4 py-3 bg-blue-50">
            <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[180px]">
                <label className="text-xs text-gray-500 block mb-1">Enseignant *</label>
                <select name="enseignant_id" value={form.enseignant_id} onChange={handleChange} required
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Sélectionner --</option>
                  {enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="text-xs text-gray-500 block mb-1">Salle</label>
                <select name="salle_id" value={form.salle_id} onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Aucune</option>
                  {salles.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
              <div className="min-w-[120px]">
                <label className="text-xs text-gray-500 block mb-1">Jour</label>
                <select name="jour_semaine" value={form.jour_semaine} onChange={handleChange}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">--</option>
                  {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Début</label>
                <input name="heure_debut" type="time" value={form.heure_debut} onChange={handleChange}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fin</label>
                <input name="heure_fin" type="time" value={form.heure_fin} onChange={handleChange}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {loading ? '...' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">
                  Annuler
                </button>
              </div>
              {error && <p className="w-full text-xs text-red-500">{error}</p>}
            </form>
          </td>
        </tr>
      )}
    </>
  )
}
