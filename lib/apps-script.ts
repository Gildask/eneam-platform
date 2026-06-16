// Ce fichier génère le code Google Apps Script à installer dans chaque Google Sheet.
// Il est utilisé uniquement côté serveur pour l'affichage dans la page /admin/sync.

export function generateAppsScript(webhookUrl: string, syncSecret: string): string {
  return `// ============================================================
// ENEAM Notes Platform - Script de synchronisation automatique
// À installer dans chaque Google Sheet (Outils > Éditeur de scripts)
// ============================================================

// ⚙️ CONFIGURATION — ne pas modifier après installation
var WEBHOOK_URL = "${webhookUrl}";
var SYNC_SECRET = "${syncSecret}";

// Correspondance entre en-têtes de colonnes et types de notes
var COLONNES_NOTES = {
  "CC1": true,
  "CC2": true,
  "CC3": true,
  "ET": true,
  "RATTRAPAGE": true,
  "RATT": true,
  "REPRISE": true,
  "REP": true
};

// ============================================================
// Fonction principale — déclenchée automatiquement à chaque saisie
// ============================================================
function onEdit(e) {
  var range = e.range;
  var sheet = range.getSheet();
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  var row = range.getRow();
  var col = range.getColumn();

  // Ignorer la ligne d'en-tête (ligne 1)
  if (row <= 1) return;

  // Lire l'en-tête de la colonne modifiée
  var header = sheet.getRange(1, col).getValue();
  if (!header) return;

  var headerUpper = String(header).toUpperCase().trim();

  // Ignorer si la colonne n'est pas une colonne de note
  if (!COLONNES_NOTES[headerUpper]) return;

  // Lire le matricule (toujours en colonne A)
  var matricule = sheet.getRange(row, 1).getValue();
  if (!matricule || String(matricule).trim() === "") return;

  var valeur = e.value; // valeur saisie (peut être vide si cellule effacée)
  var spreadsheetId = spreadsheet.getId();
  var sheetName = sheet.getName();

  // Envoyer les données au webhook
  var payload = {
    spreadsheet_id: spreadsheetId,
    sheet_name: sheetName,
    matricule: String(matricule).trim().toUpperCase(),
    column_header: headerUpper,
    valeur: valeur
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-sync-secret": SYNC_SECRET
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var result = JSON.parse(response.getContentText());

    if (!result.success) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "Erreur : " + result.error,
        "ENEAM Sync",
        5
      );
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        result.message,
        "ENEAM Sync ✓",
        3
      );
    }
  } catch (err) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      "Erreur de connexion : " + err.toString(),
      "ENEAM Sync",
      5
    );
  }
}
`;
}
