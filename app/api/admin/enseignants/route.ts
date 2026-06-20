import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { nom, prenom, email, telephone, specialite } = await request.json()

  if (!nom || !prenom) {
    return NextResponse.json({ error: 'Nom et prénom sont obligatoires.' }, { status: 400 })
  }

  const { error } = await supabase.from('enseignants').insert({
    nom: String(nom).trim().toUpperCase(),
    prenom: String(prenom).trim(),
    email: email?.trim().toLowerCase() || null,
    telephone: telephone?.trim() || null,
    specialite: specialite?.trim() || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
