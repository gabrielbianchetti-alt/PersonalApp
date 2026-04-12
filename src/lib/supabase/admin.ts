import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client — uses the service_role key.
 * ONLY call this from server-side code (server components, server actions, API routes).
 * Never expose this client or the service_role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local:\n' +
      'SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here'
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
