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
  const { code, nom, credits } = await request.json()

  if (!nom) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })

  const { error } = await supabase.from('ues').update({
    code: String(code).trim().toUpperCase(),
    nom: String(nom).trim(),
    credits: credits ? parseInt(credits) : null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await params

  // Détacher les ECUEs rattachées avant suppression
  await supabase.from('ecues').update({ ue_id: null }).eq('ue_id', id)

  const { error } = await supabase.from('ues').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
