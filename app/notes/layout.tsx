import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('nom, prenom, matricule, niveaux(nom)')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-blue-600 text-sm">ENEAM Notes</span>
            <div className="flex gap-4 text-sm">
              <Link href="/notes" className="text-gray-600 hover:text-blue-600 transition-colors">
                Mes notes
              </Link>
              <Link href="/documents" className="text-gray-600 hover:text-blue-600 transition-colors">
                Mes documents
              </Link>
              <Link href="/reclamations" className="text-gray-600 hover:text-blue-600 transition-colors">
                Réclamations
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {etudiant && (
              <span className="text-sm text-gray-500">
                {etudiant.prenom} {etudiant.nom}
              </span>
            )}
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
