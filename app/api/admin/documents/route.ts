import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const etudiant_id = formData.get('etudiant_id') as string
  const annee_id = formData.get('annee_id') as string
  const type = formData.get('type') as string

  if (!file || !etudiant_id || !annee_id || !type) {
    return NextResponse.json({ error: 'Tous les champs sont obligatoires.' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Seuls les fichiers PDF sont acceptés.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Chemin de stockage : {etudiant_id}/{timestamp}_{nom_fichier}
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${etudiant_id}/${Date.now()}_${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('bulletins')
    .upload(storagePath, arrayBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // URL signée valable 10 ans (pour les bulletins permanents)
  const { data: signedUrl, error: urlError } = await admin.storage
    .from('bulletins')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)

  if (urlError || !signedUrl) {
    return NextResponse.json({ error: 'Erreur génération URL.' }, { status: 500 })
  }

  const { error: dbError } = await admin.from('documents').insert({
    etudiant_id,
    annee_academique_id: annee_id,
    type,
    nom_fichier: file.name,
    url: signedUrl.signedUrl,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
