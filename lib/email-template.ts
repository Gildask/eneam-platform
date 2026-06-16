type NoteEmailData = {
  prenom: string
  nom: string
  matricule: string
  ecueNom: string
  noteType: string
  valeur: number
  anneeLibelle: string
  platformUrl: string
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  CC1: 'Contrôle Continu 1',
  CC2: 'Contrôle Continu 2',
  CC3: 'Contrôle Continu 3',
  ET: 'Examen Terminal',
  rattrapage: 'Rattrapage',
  reprise: 'Reprise',
}

function noteColorHex(valeur: number): string {
  if (valeur >= 12) return '#16a34a'
  if (valeur >= 10) return '#d97706'
  return '#dc2626'
}

function noteAppreciation(valeur: number): string {
  if (valeur >= 14) return 'Très bien'
  if (valeur >= 12) return 'Bien'
  if (valeur >= 10) return 'Passable'
  return 'Insuffisant'
}

export function generateNoteEmailHtml(data: NoteEmailData): string {
  const { prenom, nom, matricule, ecueNom, noteType, valeur, anneeLibelle, platformUrl } = data
  const color = noteColorHex(valeur)
  const appreciation = noteAppreciation(valeur)
  const label = NOTE_TYPE_LABELS[noteType] ?? noteType

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle note disponible</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

          <!-- En-tête -->
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;">
              <p style="margin:0;color:#bfdbfe;font-size:12px;letter-spacing:1px;text-transform:uppercase;">ENEAM &mdash; Espace Notes</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;">Nouvelle note disponible</h1>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;">
                Bonjour <strong>${prenom} ${nom}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                Une nouvelle note vient d'être enregistrée dans votre espace pour l'année académique <strong>${anneeLibelle}</strong>.
              </p>

              <!-- Carte note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Matière</p>
                    <p style="margin:0 0 16px;color:#1e293b;font-size:16px;font-weight:600;">${ecueNom}</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:50%;">
                          <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Type d'évaluation</p>
                          <p style="margin:0;color:#1e293b;font-size:14px;font-weight:500;">${label}</p>
                        </td>
                        <td style="width:50%;text-align:right;">
                          <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Note obtenue</p>
                          <p style="margin:0;color:${color};font-size:28px;font-weight:700;">${valeur.toFixed(2)}<span style="font-size:14px;color:#94a3b8;">/20</span></p>
                          <p style="margin:4px 0 0;color:${color};font-size:12px;font-weight:600;">${appreciation}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Bouton -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td align="center" style="background:#1d4ed8;border-radius:8px;">
                    <a href="${platformUrl}/notes" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                      Voir toutes mes notes &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Si vous pensez que cette note est erronée, vous pouvez déposer une réclamation depuis votre espace personnel.<br>
                Matricule : <strong>${matricule}</strong>
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
              <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
                ENEAM &mdash; École Nationale d'Économie Appliquée et de Management &mdash; Cotonou, Bénin<br>
                Ce message est automatique, merci de ne pas y répondre.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function generateNoteEmailText(data: NoteEmailData): string {
  const label = NOTE_TYPE_LABELS[data.noteType] ?? data.noteType
  return `Bonjour ${data.prenom} ${data.nom},

Une nouvelle note a été enregistrée dans votre espace ENEAM.

Matière : ${data.ecueNom}
Type : ${label}
Note : ${data.valeur.toFixed(2)}/20
Année : ${data.anneeLibelle}

Consultez toutes vos notes : ${data.platformUrl}/notes

Matricule : ${data.matricule}
---
ENEAM - Service des Programmes Spéciaux`
}
