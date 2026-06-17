'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RefreshButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRefresh() {
    setLoading(true)
    router.refresh()
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      <span className={loading ? 'animate-spin' : ''}>↻</span>
      {loading ? 'Actualisation...' : 'Actualiser'}
    </button>
  )
}
