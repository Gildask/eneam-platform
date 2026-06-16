import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentShell from '@/components/StudentShell'

export default async function DocumentsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('nom, prenom')
    .eq('id', user.id)
    .single()

  return (
    <StudentShell etudiant={etudiant} activePath="/documents">
      {children}
    </StudentShell>
  )
}
