import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { id } = await params
  const { ecue_ids } = await request.json()

  if (!Array.isArray(ecue_ids)) {
    return NextResponse.json({ error: 'Liste d\'ECUEs invalide.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ecues')
    .update({ ue_id: id })
    .in('id', ecue_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { id } = await params
  const { ecue_id } = await request.json()

  if (!ecue_id) {
    return NextResponse.json({ error: 'ECUE manquante.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('ecues')
    .update({ ue_id: null })
    .eq('id', ecue_id)
    .eq('ue_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
