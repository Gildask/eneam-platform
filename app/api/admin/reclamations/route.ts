import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { id, statut, reponse } = await request.json()
  if (!id || !statut) {
    return NextResponse.json({ error: 'id et statut obligatoires.' }, { status: 400 })
  }

  const { error } = await supabase.from('reclamations').update({
    statut,
    reponse: reponse ?? null,
    traite_le: statut === 'traite' || statut === 'rejete' ? new Date().toISOString() : null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
