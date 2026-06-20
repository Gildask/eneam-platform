import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_noStore as noStore } from 'next/cache'
import { fetchAllNotes } from '@/lib/fetchAllNotes'
import NotesForm from './NotesForm'

export const dynamic = 'force-dynamic'

export default async function AdminNotesPage() {
  noStore()
  const supabase = createAdminClient()

  const [
    { data: niveaux },
    { data: etudiants },
    { data: ecues },
    { data: annee },
  ] = await Promise.all([
    supabase.from('niveaux').select('id, nom, code').order('code'),
    supabase.from('etudiants').select('id, nom, prenom, matricule, niveau_id').order('matricule'),
    supabase.from('ecues').select('id, nom, code, niveau_id').order('code'),
    supabase.from('annees_academiques').select('id, libelle').eq('active', true).single(),
  ])

  const notes = await fetchAllNotes(supabase, annee?.id ?? '')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Saisie des notes</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {annee ? `Année académique ${annee.libelle}` : 'Aucune année académique active'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <NotesForm
          niveaux={niveaux ?? []}
          etudiants={etudiants ?? []}
          ecues={ecues ?? []}
          notesExistantes={notes}
        />
      </div>
    </div>
  )
}
