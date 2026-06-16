'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Etudiant = { id: string; nom: string; prenom: string; matricule: string }
type Annee = { id: string; libelle: string }

const DOC_TYPES = [
  { value: 'bulletin', label: 'Bulletin de notes' },
  { value: 'attestation', label: 'Attestation de scolarité' },
  { value: 'releve', label: 'Relevé de notes' },
]

export default function UploadDocumentForm({ etudiants, annees }: { etudiants: Etudiant[]; annees: Annee[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ etudiant_id: '', annee_id: '', type: 'bulletin' })
  const [file, setFile] = useState<File | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !form.etudiant_id || !form.annee_id) {
      setError('Tous les champs sont obligatoires.')
      return
    }
    setError('')
    setSuccess('')
    setLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('etudiant_id', form.etudiant_id)
    formData.append('annee_id', form.annee_id)
    formData.append('type', form.type)

    const res = await fetch('/api/admin/documents', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Erreur lors du téléversement.'); setLoading(false); return }

    setSuccess('Document mis en ligne avec succès.')
    setForm({ etudiant_id: '', annee_id: '', type: 'bulletin' })
    setFile(null)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span>+ Téléverser un document</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-gray-100 px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Étudiant *</label>
              <select name="etudiant_id" value={form.etudiant_id} onChange={handleChange} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sélectionner...</option>
                {etudiants.map(e => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom} ({e.matricule})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Année académique *</label>
              <select name="annee_id" value={form.annee_id} onChange={handleChange} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sélectionner...</option>
                {annees.map(a => (
                  <option key={a.id} value={a.id}>{a.libelle}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Type de document *</label>
              <select name="type" value={form.type} onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Fichier PDF *</label>
              <input type="file" accept="application/pdf" required
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-2 file:text-xs file:border-0 file:bg-blue-50 file:text-blue-600 file:rounded file:px-2 file:py-0.5" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Annuler</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Téléversement...' : 'Mettre en ligne'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
