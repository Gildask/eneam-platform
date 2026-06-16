import { createClient } from '@supabase/supabase-js'

// Client avec la service_role key — contourne le RLS
// À utiliser UNIQUEMENT dans les API routes côté serveur (jamais côté client)
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant dans les variables d\'environnement.')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
