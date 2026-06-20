import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentShell from '@/components/StudentShell'

export default async function RecapitulatifLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('nom, prenom, password_changed')
    .eq('id', user.id)
    .single()

  if (etudiant && etudiant.password_changed === false) redirect('/change-password')

  return (
    <StudentShell etudiant={etudiant} activePath="/recapitulatif">
      {children}
    </StudentShell>
  )
}
