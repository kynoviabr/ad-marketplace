/**
 * Supabase Server Client
 *
 * Use this client in Server Components, API Routes, and Server Actions.
 * It reads cookies from the Next.js request context for session management.
 * Uses the anon key — user permissions are enforced via Supabase RLS.
 *
 * SECURITY: Server-only. Not importable from client components directly
 * (the 'cookies()' call from 'next/headers' enforces this at runtime).
 *
 * Usage:
 *   import { createServerClient } from '@/lib/supabase/server'
 *   const supabase = await createServerClient()
 */

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      '[AD-Marketplace] Supabase server client: NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.local.'
    )
  }

  const cookieStore = await cookies()

  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  })
}
