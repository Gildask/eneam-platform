import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { titre, contenu, niveau_id, publie } = await request.json()
  if (!titre || !contenu) {
    return NextResponse.json({ error: 'Titre et contenu obligatoires.' }, { status: 400 })
  }

  const { error } = await supabase.from('annonces').insert({
    titre: titre.trim(),
    contenu: contenu.trim(),
    niveau_id: niveau_id ?? null,
    publie: publie ?? false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
