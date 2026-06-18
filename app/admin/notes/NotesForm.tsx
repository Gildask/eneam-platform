'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Niveau = { id: string; nom: string; code: string }
type Etudiant = { id: string; nom: string; prenom: string; matricule: string; niveau_id: string }
type Ecue = { id: string; nom: string; code: string; niveau_id: string }
type NoteType = 'CC1' | 'CC2' | 'CC3' | 'ET' | 'rattrapage'

const TYPES: { value: NoteType; label: string }[] = [
  { value: 'CC1', label: 'CC 1' },
  { value: 'CC2', label: 'CC 2' },
  { value: 'CC3', label: 'CC 3' },
  { value: 'ET', label: 'Exam. Terminal' },
  { value: 'rattrapage', label: 'Rattrapage' },
]

type NotesGrid = Record<string, Record<NoteType, string>> // etudiant_id -> type -> valeur

export default function NotesForm({
  niveaux,
  etudiants,
  ecues,
  notesExistantes,
}: {
  niveaux: Niveau[]
  etudiants: Etudiant[]
  ecues: Ecue[]
  notesExistantes: { etudiant_id: string; ecue_id: string; type: string; valeur: number | null }[]
}) {
  const router = useRouter()
  const [niveauId, setNiveauId] = useState('')
  const [ecueId, setEcueId] = useState('')
  const [grid, setGrid] = useState<NotesGrid>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const etudiantsFiltres = niveauId
    ? etudiants.filter(e => e.niveau_id === niveauId).sort((a, b) => a.matricule.localeCompare(b.matricule))
    : []

  const ecuesFiltres = niveauId
    ? ecues.filter(e => e.niveau_id === niveauId).sort((a, b) => a.code.localeCompare(b.code))
    : []

  // Pré-remplir avec les notes existantes quand on change de matière
  useEffect(() => {
    if (!ecueId || etudiantsFiltres.length === 0) {
      setGrid({})
      return
    }
    const newGrid: NotesGrid = {}
    etudiantsFiltres.forEach(et => {
      const row: Record<NoteType, string> = { CC1: '', CC2: '', CC3: '', ET: '', rattrapage: '' }
      TYPES.forEach(t => {
        const existing = notesExistantes.find(
          n => n.etudiant_id === et.id && n.ecue_id === ecueId && n.type === t.value
        )
        if (existing && existing.valeur !== null) {
          row[t.value] = String(existing.valeur)
        }
      })
      newGrid[et.id] = row
    })
    setGrid(newGrid)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecueId, niveauId])

  function setNote(etudiantId: string, type: NoteType, valeur: string) {
    setGrid(prev => ({
      ...prev,
      [etudiantId]: { ...prev[etudiantId], [type]: valeur },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!niveauId || !ecueId) return

    const lignes = etudiantsFiltres.flatMap(et =>
      TYPES.map(t => ({
        etudiant_id: et.id,
        ecue_id: ecueId,
        type: t.value as NoteType,
        valeur: grid[et.id]?.[t.value] ?? null,
      }))
    )

    setLoading(true)
    setMessage(null)

    const res = await fetch('/api/admin/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lignes }),
    })

    const data = await res.json()
    setLoading(false)

    if (res.ok) {
      setMessage({ text: `Notes enregistrées avec succès.`, ok: true })
      router.refresh()
    } else {
      setMessage({ text: data.error ?? 'Erreur lors de l\'enregistrement.', ok: false })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Sélecteurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Niveau *</label>
          <select
            value={niveauId}
            onChange={e => { setNiveauId(e.target.value); setEcueId(''); setGrid({}); setMessage(null) }}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner un niveau --</option>
            {niveaux.map(n => <option key={n.id} value={n.id}>{n.nom}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Matière (ECUE) *</label>
          <select
            value={ecueId}
            onChange={e => { setEcueId(e.target.value); setMessage(null) }}
            required
            disabled={!niveauId}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">-- Sélectionner une matière --</option>
            {ecuesFiltres.map(e => <option key={e.id} value={e.id}>{e.code} — {e.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Tableau de saisie */}
      {niveauId && ecueId && etudiantsFiltres.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 bg-gray-50 text-left px-4 py-2.5 font-medium text-gray-600 min-w-[60px]">Matricule</th>
                <th className="sticky left-0 bg-gray-50 text-left px-4 py-2.5 font-medium text-gray-600 min-w-[180px]">Nom et prénom</th>
                {TYPES.map(t => (
                  <th key={t.value} className="text-center px-3 py-2.5 font-medium text-gray-600 min-w-[100px]">{t.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {etudiantsFiltres.map(et => (
                <tr key={et.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400 text-xs">{et.matricule}</td>
                  <td className="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">{et.prenom} {et.nom}</td>
                  {TYPES.map(t => (
                    <td key={t.value} className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.25"
                        value={grid[et.id]?.[t.value] ?? ''}
                        onChange={e => setNote(et.id, t.value, e.target.value)}
                        placeholder="—"
                        className="w-20 text-center border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {niveauId && !ecueId && (
        <p className="text-sm text-gray-400 text-center py-4">Sélectionnez une matière pour afficher les étudiants.</p>
      )}

      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ${message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </p>
      )}

      {niveauId && ecueId && (
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
