'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Niveau = { id: string; nom: string; code: string }
type Etudiant = { id: string; nom: string; prenom: string; matricule: string; niveau_id: string }
type Ecue = { id: string; nom: string; code: string; niveau_id: string }

const NOTE_TYPES = [
  { value: 'CC1', label: 'CC 1' },
  { value: 'CC2', label: 'CC 2' },
  { value: 'CC3', label: 'CC 3' },
  { value: 'ET', label: 'Examen Terminal' },
  { value: 'rattrapage', label: 'Rattrapage' },
  { value: 'reprise', label: 'Reprise' },
]

export default function AddRepriseForm({
  niveaux,
  etudiants,
  ecues,
}: {
  niveaux: Niveau[]
  etudiants: Etudiant[]
  ecues: Ecue[]
}) {
  const router = useRouter()
  const [niveauEtudiantId, setNiveauEtudiantId] = useState('')
  const [etudiantId, setEtudiantId] = useState('')
  const [niveauEcueId, setNiveauEcueId] = useState('')
  const [ecueId, setEcueId] = useState('')
  const [type, setType] = useState('')
  const [valeur, setValeur] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const etudiantsFiltres = niveauEtudiantId
    ? etudiants.filter(e => e.niveau_id === niveauEtudiantId)
    : etudiants

  const ecuesFiltres = niveauEcueId
    ? ecues.filter(e => e.niveau_id === niveauEcueId && e.niveau_id !== niveauEtudiantId)
    : ecues.filter(e => e.niveau_id !== niveauEtudiantId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!etudiantId || !ecueId || !type) return
    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/admin/reprises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etudiant_id: etudiantId, ecue_id: ecueId, type, valeur }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setMessage({ text: 'Note enregistrée avec succès.', ok: true })
      setEcueId('')
      setType('')
      setValeur('')
      router.refresh()
    } else {
      setMessage({ text: data.error ?? 'Erreur lors de l\'enregistrement.', ok: false })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Niveau de l&apos;étudiant</label>
          <select
            value={niveauEtudiantId}
            onChange={e => { setNiveauEtudiantId(e.target.value); setEtudiantId(''); setNiveauEcueId(''); setEcueId('') }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Tous les niveaux --</option>
            {niveaux.map(n => (
              <option key={n.id} value={n.id}>{n.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Étudiant *</label>
          <select
            value={etudiantId}
            onChange={e => setEtudiantId(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner un étudiant --</option>
            {etudiantsFiltres.map(e => (
              <option key={e.id} value={e.id}>{e.matricule} — {e.prenom} {e.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Niveau de la matière (reprise)</label>
          <select
            value={niveauEcueId}
            onChange={e => { setNiveauEcueId(e.target.value); setEcueId('') }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Tous les niveaux (sauf celui de l&apos;étudiant) --</option>
            {niveaux.filter(n => n.id !== niveauEtudiantId).map(n => (
              <option key={n.id} value={n.id}>{n.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Matière (ECUE) *</label>
          <select
            value={ecueId}
            onChange={e => setEcueId(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner une matière --</option>
            {ecuesFiltres.map(e => (
              <option key={e.id} value={e.id}>{e.code} — {e.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type de note *</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner un type --</option>
            {NOTE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valeur (0–20)</label>
          <input
            type="number"
            min="0"
            max="20"
            step="0.25"
            value={valeur}
            onChange={e => setValeur(e.target.value)}
            placeholder="Ex: 12.50"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ${message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer la note'}
      </button>
    </form>
  )
}
