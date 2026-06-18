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
  const [niveauEcueId, setNiveauEcueId] = useState('')
  const [ecueId, setEcueId] = useState('')
  const [type, setType] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const etudiantsFiltres = niveauEtudiantId
    ? etudiants.filter(e => e.niveau_id === niveauEtudiantId)
    : []

  const ecuesFiltres = niveauEcueId
    ? ecues.filter(e => e.niveau_id === niveauEcueId)
    : ecues.filter(e => e.niveau_id !== niveauEtudiantId)

  const pret = niveauEtudiantId && ecueId && type && etudiantsFiltres.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pret) return

    const lignes = Object.entries(notes).filter(([, v]) => v !== '' && v !== null)
    if (lignes.length === 0) {
      setMessage({ text: 'Aucune note saisie.', ok: false })
      return
    }

    setLoading(true)
    setMessage(null)

    const resultats = await Promise.all(
      lignes.map(([etudiant_id, valeur]) =>
        fetch('/api/admin/reprises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ etudiant_id, ecue_id: ecueId, type, valeur }),
        })
      )
    )

    const erreurs = resultats.filter(r => !r.ok).length
    setLoading(false)

    if (erreurs === 0) {
      setMessage({ text: `${lignes.length} note(s) enregistrée(s) avec succès.`, ok: true })
      setNotes({})
      router.refresh()
    } else {
      setMessage({ text: `${erreurs} erreur(s) sur ${lignes.length} notes.`, ok: false })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Filtres */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Niveau de l&apos;étudiant *</label>
          <select
            value={niveauEtudiantId}
            onChange={e => { setNiveauEtudiantId(e.target.value); setNiveauEcueId(''); setEcueId(''); setNotes({}) }}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner --</option>
            {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Niveau de la matière (reprise)</label>
          <select
            value={niveauEcueId}
            onChange={e => { setNiveauEcueId(e.target.value); setEcueId('') }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Tous --</option>
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
            <option value="">-- Sélectionner --</option>
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
            <option value="">-- Sélectionner --</option>
            {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tableau des étudiants */}
      {niveauEtudiantId && etudiantsFiltres.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Matricule</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Nom et prénom</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600 w-32">Note (0–20)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {etudiantsFiltres.map(et => (
                <tr key={et.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500 text-xs">{et.matricule}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{et.prenom} {et.nom}</td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      value={notes[et.id] ?? ''}
                      onChange={e => setNotes(prev => ({ ...prev, [et.id]: e.target.value }))}
                      placeholder="—"
                      className="w-24 text-center border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {niveauEtudiantId && etudiantsFiltres.length === 0 && (
        <p className="text-sm text-gray-400">Aucun étudiant dans ce niveau.</p>
      )}

      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ${message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </p>
      )}

      {pret && (
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer toutes les notes'}
        </button>
      )}
    </form>
  )
}
