/**
 * Client-side environment variables.
 *
 * SECURITY: This module ONLY exposes NEXT_PUBLIC_* variables.
 * It must NEVER import from server.ts or reference any server secret.
 *
 * Usage:
 *   import { clientEnv } from '@/lib/env/client'
 */

type ClientEnv = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  APP_URL: string
}

function getClientEnv(): ClientEnv {
  const missingVars: string[] = []

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (missingVars.length > 0) {
    throw new Error(
      `[AD-Marketplace] Missing required public environment variables:\n` +
        missingVars.map((v) => `  - ${v}`).join('\n') +
        `\n\nCopy .env.example to .env.local and fill in all values.`
    )
  }

  return {
    SUPABASE_URL: SUPABASE_URL!,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY!,
    APP_URL,
  }
}

/**
 * Validated client-side environment variables.
 * Safe to use in browser context. Does NOT include any server-only secrets.
 */
export function getValidatedClientEnv(): ClientEnv {
  return getClientEnv()
}
