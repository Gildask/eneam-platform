import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'gildaskodonon3@gmail.com'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  const { matricule, nom, prenom, email, telephone, niveau_id } = await request.json()

  if (!matricule || !nom || !prenom || !email || !niveau_id) {
    return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis.' }, { status: 400 })
  }

  // Créer le compte Auth avec email = matricule@eneam.bj, mot de passe = matricule par défaut
  const authEmail = `${matricule.trim().toLowerCase()}@eneam.bj`
  const defaultPassword = matricule.trim()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: authEmail,
    password: defaultPassword,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erreur création compte.' }, { status: 400 })
  }

  // Insérer dans la table etudiants
  const { error: dbError } = await supabase.from('etudiants').insert({
    id: authData.user.id,
    matricule: matricule.trim().toUpperCase(),
    nom: nom.trim().toUpperCase(),
    prenom: prenom.trim(),
    email: email.trim().toLowerCase(),
    telephone: telephone?.trim() || null,
    niveau_id,
  })

  if (dbError) {
    // Supprimer le compte auth si l'insertion échoue
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
