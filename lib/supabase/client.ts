'use client'

/**
 * Supabase Browser Client
 *
 * Use this client in Client Components ('use client' directive).
 * It uses only NEXT_PUBLIC_* environment variables — no server secrets.
 *
 * Usage:
 *   import { createBrowserClient } from '@/lib/supabase/client'
 *   const supabase = createBrowserClient()
 */

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'

export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      '[AD-Marketplace] Supabase browser client: NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.local.'
    )
  }

  return createSupabaseBrowserClient(url, anonKey)
}
