import { Resend } from 'resend'
import { generateNoteEmailHtml, generateNoteEmailText } from './email-template'

const NOTE_TYPE_LABELS: Record<string, string> = {
  CC1: 'Contrôle Continu 1',
  CC2: 'Contrôle Continu 2',
  CC3: 'Contrôle Continu 3',
  ET: 'Examen Terminal',
  rattrapage: 'Rattrapage',
  reprise: 'Reprise',
}

export type NoteNotificationData = {
  etudiant: {
    prenom: string
    nom: string
    matricule: string
    email: string
    telephone: string | null
  }
  ecueNom: string
  noteType: string
  valeur: number
  anneeLibelle: string
}

// ─── Email via Resend ──────────────────────────────────────────────────────────

export async function sendNoteEmail(data: NoteNotificationData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Notifications] RESEND_API_KEY non configuré. Email ignoré.')
    return false
  }

  const resend = new Resend(apiKey)
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://eneam-platform.vercel.app'
  const label = NOTE_TYPE_LABELS[data.noteType] ?? data.noteType

  try {
    const { error } = await resend.emails.send({
      from: 'ENEAM Notes <notes@eneam.bj>',
      to: data.etudiant.email,
      subject: `Nouvelle note : ${label} en ${data.ecueNom} — ${data.valeur.toFixed(2)}/20`,
      html: generateNoteEmailHtml({
        prenom: data.etudiant.prenom,
        nom: data.etudiant.nom,
        matricule: data.etudiant.matricule,
        ecueNom: data.ecueNom,
        noteType: data.noteType,
        valeur: data.valeur,
        anneeLibelle: data.anneeLibelle,
        platformUrl,
      }),
      text: generateNoteEmailText({
        prenom: data.etudiant.prenom,
        nom: data.etudiant.nom,
        matricule: data.etudiant.matricule,
        ecueNom: data.ecueNom,
        noteType: data.noteType,
        valeur: data.valeur,
        anneeLibelle: data.anneeLibelle,
        platformUrl,
      }),
    })

    if (error) {
      console.error('[Notifications] Erreur Resend:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[Notifications] Erreur inattendue Resend:', err)
    return false
  }
}

// ─── WhatsApp via WATI ─────────────────────────────────────────────────────────

export async function sendNoteWhatsApp(data: NoteNotificationData): Promise<boolean> {
  const apiUrl = process.env.WATI_API_URL
  const apiKey = process.env.WATI_API_KEY
  const templateName = process.env.WATI_TEMPLATE_NAME ?? 'eneam_nouvelle_note'

  if (!apiUrl || !apiKey) {
    console.warn('[Notifications] WATI_API_URL ou WATI_API_KEY non configuré. WhatsApp ignoré.')
    return false
  }

  if (!data.etudiant.telephone) {
    console.warn(`[Notifications] Pas de numéro WhatsApp pour ${data.etudiant.matricule}.`)
    return false
  }

  // Nettoyer le numéro : supprimer espaces et "+" (WATI attend le format international sans +)
  const phone = data.etudiant.telephone.replace(/[\s+\-().]/g, '')
  const label = NOTE_TYPE_LABELS[data.noteType] ?? data.noteType

  // Variables du template WATI (dans l'ordre défini dans le template)
  // Template attendu :
  // "Bonjour {{1}}, votre note de {{2}} en {{3}} est de {{4}}/20. Consultez votre espace : {{5}}"
  const parameters = [
    { name: '1', value: data.etudiant.prenom },
    { name: '2', value: label },
    { name: '3', value: data.ecueNom },
    { name: '4', value: data.valeur.toFixed(2) },
    { name: '5', value: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://eneam-platform.vercel.app'}/notes` },
  ]

  try {
    const response = await fetch(`${apiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template_name: templateName,
        broadcast_name: `note_${data.noteType}_${Date.now()}`,
        parameters,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[Notifications] Erreur WATI:', response.status, errText)
      return false
    }

    return true
  } catch (err) {
    console.error('[Notifications] Erreur inattendue WATI:', err)
    return false
  }
}

// ─── Envoi groupé ─────────────────────────────────────────────────────────────

export async function sendNoteNotifications(data: NoteNotificationData): Promise<{
  email: boolean
  whatsapp: boolean
}> {
  const [email, whatsapp] = await Promise.all([
    sendNoteEmail(data),
    sendNoteWhatsApp(data),
  ])
  return { email, whatsapp }
}
