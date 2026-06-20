import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { cours_id, date_seance, presences } = await request.json()

  if (!cours_id || !date_seance || !Array.isArray(presences)) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 })
  }

  const { data: emargement, error: emargError } = await supabase
    .from('emargements')
    .upsert({ cours_id, date_seance }, { onConflict: 'cours_id,date_seance' })
    .select('id')
    .single()

  if (emargError || !emargement) {
    return NextResponse.json({ error: emargError?.message ?? 'Erreur émargement.' }, { status: 400 })
  }

  const rows = presences.map((p: { etudiant_id: string; present: boolean }) => ({
    emargement_id: emargement.id,
    etudiant_id: p.etudiant_id,
    present: p.present,
  }))

  const { error: presError } = await supabase
    .from('emargement_presences')
    .upsert(rows, { onConflict: 'emargement_id,etudiant_id' })

  if (presError) return NextResponse.json({ error: presError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
