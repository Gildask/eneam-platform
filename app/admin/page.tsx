import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [{ count: nbEtudiants }, { count: nbEcues }, { count: nbNotes }, { count: nbReclamations }] =
    await Promise.all([
      supabase.from('etudiants').select('*', { count: 'exact', head: true }),
      supabase.from('ecues').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true }),
      supabase.from('reclamations').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    ])

  const stats = [
    { label: 'Étudiants inscrits', value: nbEtudiants ?? 0, color: 'bg-blue-500' },
    { label: 'Matières (ECUEs)', value: nbEcues ?? 0, color: 'bg-indigo-500' },
    { label: 'Notes saisies', value: nbNotes ?? 0, color: 'bg-green-500' },
    { label: 'Réclamations en attente', value: nbReclamations ?? 0, color: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-2 h-2 rounded-full ${s.color} mb-3`} />
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Actions rapides</h2>
          <div className="space-y-2 text-sm">
            <a href="/admin/etudiants" className="block text-blue-600 hover:underline">
              + Ajouter / importer des étudiants
            </a>
            <a href="/admin/ecues" className="block text-blue-600 hover:underline">
              + Ajouter des matières (ECUEs)
            </a>
            <a href="/admin/annonces" className="block text-blue-600 hover:underline">
              + Publier une annonce
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Synchronisation Google Sheets</h2>
          <p className="text-sm text-gray-500">
            Les notes sont synchronisées automatiquement via Google Apps Script.
            Configurez le webhook dans votre Google Sheet pour activer la synchronisation en temps réel.
          </p>
          <a href="/admin/sync" className="text-sm text-blue-600 hover:underline mt-2 block">
            Voir la configuration →
          </a>
        </div>
      </div>
    </div>
  )
}
