/**
 * Supabase Admin / Service Role Client
 *
 * ⚠️  CRITICAL SECURITY WARNING ⚠️
 *
 * This client reads a Supabase Secret API Key from the compatibility env name
 * SUPABASE_SERVICE_ROLE_KEY. The key has elevated access and bypasses ALL
 * Row Level Security (RLS) policies. It must NEVER be used in:
 *   - Client Components ('use client')
 *   - Any code that runs in the browser
 *   - Public API routes without proper authorization checks
 *
 * Use this ONLY for:
 *   - Internal server-side admin operations
 *   - Background jobs and maintenance tasks
 *   - Operations that legitimately require bypassing RLS
 *
 * SECURITY: The 'server-only' import prevents accidental use in client code.
 *
 * Usage:
 *   import { createAdminClient } from '@/lib/supabase/admin'
 *   const supabase = createAdminClient()
 */

import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      '[AD-Marketplace] Supabase admin client: NEXT_PUBLIC_SUPABASE_URL must be set.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      '[AD-Marketplace] Supabase admin client: SUPABASE_SERVICE_ROLE_KEY must be set. ' +
        'This is a server-only secret and must NEVER be exposed to the browser.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      // Disable automatic session management for privileged server clients.
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
