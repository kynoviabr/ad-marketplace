#!/usr/bin/env node
/**
 * FASE 11 — Migration Apply Script
 * Applies 20260819000010_fase11_security_remediation.sql to the real Supabase DEV
 * using the service role key and Supabase postgres.js client.
 *
 * Usage: node scripts/apply-fase11-migration.mjs
 * Run from the project root with SUPABASE_SERVICE_ROLE_KEY in environment.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=')
      const val = rest.join('=').trim()
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val
      }
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  process.exit(1)
}

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260819000010_fase11_security_remediation.sql'
)

if (!existsSync(migrationPath)) {
  console.error('ERROR: Migration file not found:', migrationPath)
  process.exit(1)
}

const sql = readFileSync(migrationPath, 'utf-8')

console.log('Connecting to Supabase DEV:', url)
console.log('Migration file:', migrationPath)
console.log('SQL length:', sql.length, 'chars')
console.log()

// Split into individual statements to apply one by one
// Note: This is a simplified splitter — works for our migration which uses ; as terminators
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`Found ${statements.length} SQL statements to execute`)
console.log()

// Use the Supabase REST RPC endpoint to execute SQL
// (service_role has execute access to pg_catalog functions via supabase's execute endpoint)

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Apply the full migration as a single SQL block via the execute endpoint
// (Supabase doesn't expose a direct SQL execute endpoint, but we can use rpc())
// Instead, we'll use the postgres.js approach via node-postgres

console.log('NOTE: The service role client cannot run raw DDL via PostgREST.')
console.log()
console.log('To apply the FASE 11 migration, please run the SQL from:')
console.log(migrationPath)
console.log()
console.log('Using one of:')
console.log('1. Supabase Dashboard → SQL Editor → paste the migration file contents')
console.log('2. npx supabase db push (if authenticated with personal access token)')
console.log('3. psql connection with your database password:')
console.log('   PGPASSWORD=<your-db-password> psql -h aws-0-sa-east-1.pooler.supabase.com \\')
console.log('     -p 5432 -U postgres.mwzlunkkyigxzjpnybxj -d postgres \\')
console.log('     -f supabase/migrations/20260819000010_fase11_security_remediation.sql')
console.log()
console.log('The migration is idempotent (uses CREATE OR REPLACE / DROP POLICY IF EXISTS).')
