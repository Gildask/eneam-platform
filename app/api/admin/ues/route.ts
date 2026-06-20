import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { code, nom, credits, niveau_id } = await request.json()

  if (!code || !nom || !niveau_id) {
    return NextResponse.json({ error: 'Code, nom et niveau sont obligatoires.' }, { status: 400 })
  }

  const { error } = await supabase.from('ues').insert({
    code: String(code).trim().toUpperCase(),
    nom: String(nom).trim(),
    credits: credits ? parseInt(credits) : null,
    niveau_id: String(niveau_id),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
