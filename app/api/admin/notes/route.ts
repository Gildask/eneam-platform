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
  const { lignes } = body as {
    lignes: { etudiant_id: string; ecue_id: string; type: NoteType; valeur: string | null }[]
  }

  if (!lignes || lignes.length === 0) {
    return NextResponse.json({ error: 'Aucune note à enregistrer.' }, { status: 400 })
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

  const upserts = lignes.map(l => {
    const noteValeur = l.valeur === '' || l.valeur === null || l.valeur === undefined
      ? null
      : parseFloat(String(l.valeur))
    return {
      etudiant_id: l.etudiant_id,
      ecue_id: l.ecue_id,
      annee_academique_id: annee.id,
      type: l.type,
      valeur: noteValeur,
      notifie_email: false,
      notifie_whatsapp: false,
    }
  })

  const { error } = await supabase
    .from('notes')
    .upsert(upserts, { onConflict: 'etudiant_id,ecue_id,annee_academique_id,type' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, count: upserts.length })
}
