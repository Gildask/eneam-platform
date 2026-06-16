import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { code, nom, coefficient, credits, niveau_id, google_sheet_name } = await request.json()

  if (!code || !nom || !niveau_id) {
    return NextResponse.json({ error: 'Code, nom et niveau sont obligatoires.' }, { status: 400 })
  }

  const { error } = await supabase.from('ecues').insert({
    code: String(code).trim().toUpperCase(),
    nom: String(nom).trim(),
    coefficient: parseFloat(coefficient) || 1,
    credits: parseInt(credits) || 1,
    niveau_id: String(niveau_id),
    google_sheet_name: google_sheet_name?.trim() || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
