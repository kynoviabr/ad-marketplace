/**
 * Server-side environment variables.
 *
 * SECURITY: This module must ONLY be imported from server-side code.
 * It contains SUPABASE_SERVICE_ROLE_KEY which must NEVER reach the browser.
 *
 * Next.js server boundary guarantee: files without 'use client' directive
 * are server-only. Additionally, we add an explicit server-only guard below.
 *
 * Usage:
 *   import { serverEnv } from '@/lib/env/server'
 */

// Prevent accidental import from client-side code
import 'server-only'

type ServerEnv = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  APP_URL: string
  NODE_ENV: 'development' | 'production' | 'test'
}

function getServerEnv(): ServerEnv {
  const missingVars: string[] = []

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const NODE_ENV = (process.env.NODE_ENV ?? 'development') as ServerEnv['NODE_ENV']

  if (!SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_ANON_KEY) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (!SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missingVars.length > 0) {
    throw new Error(
      `[AD-Marketplace] Missing required server environment variables:\n` +
        missingVars.map((v) => `  - ${v}`).join('\n') +
        `\n\nCopy .env.example to .env.local and fill in all values.`
    )
  }

  return {
    SUPABASE_URL: SUPABASE_URL!,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY!,
    APP_URL,
    NODE_ENV,
  }
}

/**
 * Validated server environment variables.
 * Will throw at module-load time if any required variable is missing.
 */
export function getValidatedServerEnv(): ServerEnv {
  return getServerEnv()
}
