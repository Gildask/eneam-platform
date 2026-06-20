import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return supabase
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await params
  const { nom, prenom, email, telephone, specialite } = await request.json()

  if (!nom || !prenom) return NextResponse.json({ error: 'Nom et prénom sont obligatoires.' }, { status: 400 })

  const { error } = await supabase.from('enseignants').update({
    nom: String(nom).trim().toUpperCase(),
    prenom: String(prenom).trim(),
    email: email?.trim().toLowerCase() || null,
    telephone: telephone?.trim() || null,
    specialite: specialite?.trim() || null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await params
  const { error } = await supabase.from('enseignants').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
