import type { SupabaseClient } from '@supabase/supabase-js'

type NoteRow = { etudiant_id: string; ecue_id: string; type: string; valeur: number | null }

/**
 * Supabase plafonne les requêtes à 1000 lignes côté serveur (db-max-rows),
 * même avec un .range() plus large. Cette fonction paginate manuellement
 * pour récupérer toutes les notes d'une année académique sans troncature.
 */
export async function fetchAllNotes(
  supabase: SupabaseClient,
  anneeAcademiqueId: string,
  columns = 'etudiant_id, ecue_id, type, valeur'
): Promise<NoteRow[]> {
  const PAGE_SIZE = 1000
  let allRows: NoteRow[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('notes')
      .select(columns)
      .eq('annee_academique_id', anneeAcademiqueId)
      .range(from, from + PAGE_SIZE - 1)

    if (error || !data) break
    allRows = allRows.concat(data as unknown as NoteRow[])
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}
