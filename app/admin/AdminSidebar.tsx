'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

const SECTIONS = [
  {
    title: 'Général',
    links: [
      { href: '/admin', label: 'Tableau de bord' },
      { href: '/admin/notes', label: 'Notes' },
      { href: '/admin/recapitulatif', label: 'Récapitulatif (PV)' },
      { href: '/admin/recapitulatif-semestre', label: 'Récap. par semestre' },
      { href: '/admin/recapitulatif-cycle', label: 'Récapitulatif de cycle' },
      { href: '/admin/etudiants', label: 'Étudiants' },
      { href: '/admin/reprises', label: 'Reprises' },
    ],
  },
  {
    title: 'Programme',
    links: [
      { href: '/admin/semestres', label: 'Semestres' },
      { href: '/admin/ues', label: 'UE' },
      { href: '/admin/ecues', label: 'Matières (ECUEs)' },
    ],
  },
  {
    title: 'Enseignement',
    links: [
      { href: '/admin/enseignants', label: 'Enseignants' },
      { href: '/admin/salles', label: 'Salles' },
      { href: '/admin/cours', label: 'Cours' },
      { href: '/admin/emargement', label: 'Émargement' },
    ],
  },
  {
    title: 'Communication',
    links: [
      { href: '/admin/documents', label: 'Documents' },
      { href: '/admin/reclamations', label: 'Réclamations' },
      { href: '/admin/annonces', label: 'Annonces' },
    ],
  },
  {
    title: 'Système',
    links: [
      { href: '/admin/sync', label: 'Sync Sheets' },
    ],
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <aside className="w-56 shrink-0 bg-blue-700 text-white min-h-screen sticky top-0 flex flex-col">
      <div className="px-4 h-14 flex items-center border-b border-blue-600">
        <span className="font-bold text-sm">ENEAM Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-[10px] uppercase tracking-wide text-blue-300 px-2 mb-1">{section.title}</p>
            <div className="space-y-0.5">
              {section.links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-2 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive(link.href)
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-blue-100 hover:bg-blue-600/50 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-blue-600">
        <LogoutButton />
      </div>
    </aside>
  )
}
