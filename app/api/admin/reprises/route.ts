import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NoteType } from '@/lib/types'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabaseAuth = await createClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const body = await request.json()
  const { etudiant_id, ecue_id, type, valeur } = body

  if (!etudiant_id || !ecue_id || !type) {
    return NextResponse.json({ error: 'Champs obligatoires manquants.' }, { status: 400 })
  }

  const noteValeur = valeur === '' || valeur === null || valeur === undefined
    ? null
    : parseFloat(String(valeur))

  if (noteValeur !== null && (isNaN(noteValeur) || noteValeur < 0 || noteValeur > 20)) {
    return NextResponse.json({ error: `Note invalide : "${valeur}". La note doit être entre 0 et 20.` }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: annee } = await supabase
    .from('annees_academiques')
    .select('id')
    .eq('active', true)
    .single()

  if (!annee) {
    return NextResponse.json({ error: 'Aucune année académique active.' }, { status: 500 })
  }

  const { error } = await supabase
    .from('notes')
    .upsert(
      {
        etudiant_id,
        ecue_id,
        annee_academique_id: annee.id,
        type: type as NoteType,
        valeur: noteValeur,
        notifie_email: false,
        notifie_whatsapp: false,
      },
      { onConflict: 'etudiant_id,ecue_id,annee_academique_id,type' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
