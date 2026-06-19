import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { password } = await request.json()

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' }, { status: 400 })
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error: dbError } = await adminClient
    .from('etudiants')
    .update({ password_changed: true })
    .eq('id', user.id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
