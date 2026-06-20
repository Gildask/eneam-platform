import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-700 text-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-sm">ENEAM Admin</span>
            <div className="flex gap-4 text-sm">
              <Link href="/admin" className="text-blue-100 hover:text-white transition-colors">
                Tableau de bord
              </Link>
              <Link href="/admin/notes" className="text-blue-100 hover:text-white transition-colors">
                Notes
              </Link>
              <Link href="/admin/etudiants" className="text-blue-100 hover:text-white transition-colors">
                Étudiants
              </Link>
              <Link href="/admin/ues" className="text-blue-100 hover:text-white transition-colors">
                UE
              </Link>
              <Link href="/admin/ecues" className="text-blue-100 hover:text-white transition-colors">
                Matières (ECUEs)
              </Link>
              <Link href="/admin/documents" className="text-blue-100 hover:text-white transition-colors">
                Documents
              </Link>
              <Link href="/admin/reclamations" className="text-blue-100 hover:text-white transition-colors">
                Réclamations
              </Link>
              <Link href="/admin/annonces" className="text-blue-100 hover:text-white transition-colors">
                Annonces
              </Link>
              <Link href="/admin/reprises" className="text-blue-100 hover:text-white transition-colors">
                Reprises
              </Link>
              <Link href="/admin/sync" className="text-blue-100 hover:text-white transition-colors">
                Sync Sheets
              </Link>
            </div>
          </div>
          <LogoutButton />
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
