import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { ecue_id, enseignant_id, salle_id, jour_semaine, heure_debut, heure_fin } = await request.json()

  if (!ecue_id || !enseignant_id) {
    return NextResponse.json({ error: 'ECUE et enseignant sont obligatoires.' }, { status: 400 })
  }

  const { data: annee } = await supabase
    .from('annees_academiques')
    .select('id')
    .eq('active', true)
    .single()

  if (!annee) return NextResponse.json({ error: 'Aucune année académique active.' }, { status: 500 })

  const { error } = await supabase.from('cours').insert({
    ecue_id,
    enseignant_id,
    salle_id: salle_id || null,
    annee_academique_id: annee.id,
    jour_semaine: jour_semaine || null,
    heure_debut: heure_debut || null,
    heure_fin: heure_fin || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
