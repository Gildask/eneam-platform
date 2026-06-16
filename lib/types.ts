export type NoteType = 'CC1' | 'CC2' | 'CC3' | 'ET' | 'rattrapage' | 'reprise'
export type ReclamationStatut = 'en_attente' | 'en_cours' | 'traite' | 'rejete'

export type Database = {
  public: {
    Tables: {
      niveaux: {
        Row: { id: string; code: string; nom: string; google_sheet_id: string | null; created_at: string }
        Insert: { code: string; nom: string; google_sheet_id?: string | null }
        Update: { code?: string; nom?: string; google_sheet_id?: string | null }
      }
      annees_academiques: {
        Row: { id: string; libelle: string; active: boolean; created_at: string }
        Insert: { libelle: string; active?: boolean }
        Update: { libelle?: string; active?: boolean }
      }
      etudiants: {
        Row: { id: string; matricule: string; nom: string; prenom: string; email: string; telephone: string | null; niveau_id: string | null; created_at: string }
        Insert: { id: string; matricule: string; nom: string; prenom: string; email: string; telephone?: string | null; niveau_id?: string | null }
        Update: { matricule?: string; nom?: string; prenom?: string; email?: string; telephone?: string | null; niveau_id?: string | null }
      }
      ecues: {
        Row: { id: string; code: string; nom: string; coefficient: number; credits: number; niveau_id: string | null; google_sheet_name: string | null; created_at: string }
        Insert: { code: string; nom: string; coefficient?: number; credits?: number; niveau_id?: string | null; google_sheet_name?: string | null }
        Update: { code?: string; nom?: string; coefficient?: number; credits?: number; niveau_id?: string | null; google_sheet_name?: string | null }
      }
      notes: {
        Row: { id: string; etudiant_id: string; ecue_id: string; annee_academique_id: string; type: NoteType; valeur: number | null; saisie_le: string; notifie_email: boolean; notifie_whatsapp: boolean }
        Insert: { etudiant_id: string; ecue_id: string; annee_academique_id: string; type: NoteType; valeur?: number | null }
        Update: { valeur?: number | null; notifie_email?: boolean; notifie_whatsapp?: boolean }
      }
      reclamations: {
        Row: { id: string; etudiant_id: string; note_id: string | null; message: string; statut: ReclamationStatut; reponse: string | null; created_at: string; traite_le: string | null }
        Insert: { etudiant_id: string; note_id?: string | null; message: string }
        Update: { statut?: ReclamationStatut; reponse?: string | null; traite_le?: string | null }
      }
      documents: {
        Row: { id: string; etudiant_id: string; annee_academique_id: string; type: string; nom_fichier: string; url: string; created_at: string }
        Insert: { etudiant_id: string; annee_academique_id: string; type?: string; nom_fichier: string; url: string }
        Update: { type?: string; nom_fichier?: string; url?: string }
      }
      annonces: {
        Row: { id: string; titre: string; contenu: string; niveau_id: string | null; publie: boolean; created_at: string }
        Insert: { titre: string; contenu: string; niveau_id?: string | null; publie?: boolean }
        Update: { titre?: string; contenu?: string; niveau_id?: string | null; publie?: boolean }
      }
    }
  }
}
