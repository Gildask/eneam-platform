'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteRepriseButton({ noteId }: { noteId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Supprimer cette note de reprise ?')) return
    setLoading(true)
    await fetch(`/api/admin/reprises/${noteId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
    >
      {loading ? '...' : 'Supprimer'}
    </button>
  )
}
