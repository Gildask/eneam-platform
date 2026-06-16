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
  const { code, nom, coefficient, credits, google_sheet_name } = await request.json()

  if (!nom) return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })

  const { error } = await supabase.from('ecues').update({
    code: String(code).trim().toUpperCase(),
    nom: String(nom).trim(),
    coefficient: parseFloat(coefficient) || 1,
    credits: parseInt(credits) || 1,
    google_sheet_name: google_sheet_name?.trim() || null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await checkAdmin()
  if (!supabase) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const { id } = await params
  const { error } = await supabase.from('ecues').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
