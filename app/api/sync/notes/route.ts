import { createAdminClient } from '@/lib/supabase/admin'
import { sendNoteNotifications } from '@/lib/notifications'
import { NextResponse } from 'next/server'
import type { NoteType } from '@/lib/types'

const COLUMN_TO_TYPE: Record<string, NoteType> = {
  'CC1': 'CC1',
  'CC2': 'CC2',
  'CC3': 'CC3',
  'ET': 'ET',
  'RATTRAPAGE': 'rattrapage',
  'RATT': 'rattrapage',
  'REPRISE': 'reprise',
  'REP': 'reprise',
}

export async function POST(request: Request) {
  // 1. Vérification de la clé secrète
  const authHeader = request.headers.get('x-sync-secret')
  if (!authHeader || authHeader !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const body = await request.json()
  const { spreadsheet_id, sheet_name, matricule, column_header, valeur } = body

  if (!spreadsheet_id || !sheet_name || !matricule || !column_header) {
    return NextResponse.json({
      error: 'Champs obligatoires manquants : spreadsheet_id, sheet_name, matricule, column_header'
    }, { status: 400 })
  }

  const noteType = COLUMN_TO_TYPE[String(column_header).toUpperCase().trim()]
  if (!noteType) {
    return NextResponse.json({
      error: `Colonne inconnue : "${column_header}". Valeurs acceptées : CC1, CC2, CC3, ET, RATTRAPAGE, REPRISE`
    }, { status: 400 })
  }

  const noteValeur = valeur === '' || valeur === null || valeur === undefined
    ? null
    : parseFloat(String(valeur))

  if (noteValeur !== null && (isNaN(noteValeur) || noteValeur < 0 || noteValeur > 20)) {
    return NextResponse.json({
      error: `Note invalide : "${valeur}". La note doit être entre 0 et 20.`
    }, { status: 400 })
  }

  // Client admin (bypass RLS) pour toutes les opérations serveur
  const supabase = createAdminClient()

  // 2. Trouver le niveau via l'ID du Google Sheet
  const { data: niveau } = await supabase
    .from('niveaux')
    .select('id')
    .eq('google_sheet_id', spreadsheet_id)
    .single()

  if (!niveau) {
    return NextResponse.json({
      error: `Aucun niveau trouvé pour ce Google Sheet (${spreadsheet_id}). Configurez-le dans l'admin.`
    }, { status: 404 })
  }

  // 3. Trouver l'ECUE via le nom de la feuille
  const sheetNameTrimmed = String(sheet_name).trim()

  // Normalise un nom : minuscules, sans accents, sans caractères spéciaux
  function normalize(s: string) {
    return s.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // supprimer accents
      .replace(/[^a-z0-9\-]/g, '')                      // garder lettres, chiffres, tirets
      .trim()
  }

  // Extrait le préfixe numérique "01", "09", "21", etc.
  function extractPrefix(s: string) {
    const m = s.match(/^(\d+)/)
    return m ? m[1].padStart(2, '0') : null
  }

  const { data: ecues } = await supabase
    .from('ecues')
    .select('id, nom, google_sheet_name')
    .eq('niveau_id', niveau.id)

  let ecue = ecues?.find(e => e.google_sheet_name?.trim() === sheetNameTrimmed) ?? null

  // Fallback 1 : insensible à la casse
  if (!ecue) {
    ecue = ecues?.find(e =>
      e.google_sheet_name?.trim().toLowerCase() === sheetNameTrimmed.toLowerCase()
    ) ?? null
  }

  // Fallback 2 : noms normalisés (accents, apostrophes, espaces)
  if (!ecue) {
    const normSheet = normalize(sheetNameTrimmed)
    ecue = ecues?.find(e =>
      normalize(e.google_sheet_name ?? '') === normSheet
    ) ?? null
  }

  // Fallback 3 : correspondance par préfixe numérique uniquement (ex: "09-...")
  if (!ecue) {
    const sheetPrefix = extractPrefix(sheetNameTrimmed)
    if (sheetPrefix) {
      ecue = ecues?.find(e => extractPrefix(e.google_sheet_name ?? '') === sheetPrefix) ?? null
    }
  }

  if (!ecue) {
    return NextResponse.json({
      error: `Aucune ECUE trouvée pour la feuille "${sheetNameTrimmed}". Vérifiez la configuration dans /admin/ecues.`
    }, { status: 404 })
  }

  // 4. Trouver l'étudiant
  const { data: etudiant } = await supabase
    .from('etudiants')
    .select('id, nom, prenom, matricule, email, telephone, niveau_id')
    .eq('matricule', String(matricule).trim().toUpperCase())
    .single()

  if (!etudiant) {
    return NextResponse.json({
      error: `Étudiant introuvable : matricule "${matricule}".`
    }, { status: 404 })
  }

  // Validation : l'étudiant doit appartenir au niveau de ce classeur
  // Les reprises passent uniquement par l'interface admin
  if (etudiant.niveau_id !== niveau.id) {
    return NextResponse.json({
      error: `L'étudiant ${matricule} n'appartient pas au niveau de ce classeur. Les reprises se saisissent via l'interface admin (/admin/reprises).`
    }, { status: 403 })
  }

  // 5. Trouver l'année académique active
  const { data: annee } = await supabase
    .from('annees_academiques')
    .select('id, libelle')
    .eq('active', true)
    .single()

  if (!annee) {
    return NextResponse.json({ error: 'Aucune année académique active.' }, { status: 500 })
  }

  // 6. Upsert la note
  const { data: noteUpserted, error: upsertError } = await supabase
    .from('notes')
    .upsert(
      {
        etudiant_id: etudiant.id,
        ecue_id: ecue.id,
        annee_academique_id: annee.id,
        type: noteType,
        valeur: noteValeur,
        notifie_email: false,
        notifie_whatsapp: false,
      },
      { onConflict: 'etudiant_id,ecue_id,annee_academique_id,type' }
    )
    .select('id')
    .single()

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // 7. Envoyer les notifications (seulement si la note n'est pas supprimée)
  let notifEmail = false
  let notifWhatsapp = false

  if (noteValeur !== null && noteUpserted) {
    const { email, whatsapp } = await sendNoteNotifications({
      etudiant: {
        prenom: etudiant.prenom,
        nom: etudiant.nom,
        matricule: etudiant.matricule,
        email: etudiant.email,
        telephone: etudiant.telephone,
      },
      ecueNom: ecue.nom,
      noteType,
      valeur: noteValeur,
      anneeLibelle: annee.libelle,
    })

    notifEmail = email
    notifWhatsapp = whatsapp

    // Mettre à jour le statut des notifications
    if (email || whatsapp) {
      await supabase
        .from('notes')
        .update({ notifie_email: email, notifie_whatsapp: whatsapp })
        .eq('id', noteUpserted.id)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Note ${noteType} = ${noteValeur ?? 'effacée'} enregistrée pour ${matricule} / ${sheet_name}`,
    notifications: { email: notifEmail, whatsapp: notifWhatsapp },
  })
}
