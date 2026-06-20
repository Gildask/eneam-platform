'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Etudiant = { id: string; matricule: string; nom: string; prenom: string }

export default function EmargementChecklist({
  coursId, dateSeance, etudiants, presencesInitiales,
}: {
  coursId: string
  dateSeance: string
  etudiants: Etudiant[]
  presencesInitiales: Record<string, boolean>
}) {
  const router = useRouter()
  const [presences, setPresences] = useState<Record<string, boolean>>(presencesInitiales)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  function toggle(id: string) {
    setPresences(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function toutCocher(valeur: boolean) {
    const next: Record<string, boolean> = {}
    etudiants.forEach(e => { next[e.id] = valeur })
    setPresences(next)
  }

  async function handleSave() {
    setLoading(true)
    setMessage(null)
    const res = await fetch('/api/admin/emargement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cours_id: coursId,
        date_seance: dateSeance,
        presences: etudiants.map(e => ({ etudiant_id: e.id, present: presences[e.id] ?? false })),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setMessage({ text: data.error ?? 'Erreur', ok: false }); return }
    setMessage({ text: 'Émargement enregistré.', ok: true })
    router.refresh()
  }

  const nbPresents = Object.values(presences).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{nbPresents} / {etudiants.length} présent(s)</p>
        <div className="flex gap-2">
          <button onClick={() => toutCocher(true)} className="text-xs text-blue-600 hover:text-blue-800">Tout cocher</button>
          <button onClick={() => toutCocher(false)} className="text-xs text-gray-500 hover:text-gray-700">Tout décocher</button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {etudiants.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-400">{e.matricule}</td>
                <td className="px-3 py-2 text-gray-800">{e.nom} {e.prenom}</td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="checkbox"
                    checked={presences[e.id] ?? false}
                    onChange={() => toggle(e.id)}
                    className="w-4 h-4 rounded"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ${message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer la liste d’émargement'}
      </button>
    </div>
  )
}
