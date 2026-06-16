import Link from 'next/link'
import LogoutButton from './LogoutButton'

type Props = {
  children: React.ReactNode
  etudiant: { prenom: string; nom: string } | null
  activePath: string
}

const NAV = [
  { href: '/notes', label: 'Mes notes' },
  { href: '/documents', label: 'Mes documents' },
  { href: '/reclamations', label: 'Réclamations' },
]

export default function StudentShell({ children, etudiant, activePath }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-blue-600 text-sm">ENEAM Notes</span>
            <div className="flex gap-4 text-sm">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={activePath.startsWith(href)
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-500 hover:text-blue-600 transition-colors'}
                >
                  {label}
                </Link>
              ))}
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
