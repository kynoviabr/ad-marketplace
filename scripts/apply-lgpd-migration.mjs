#!/usr/bin/env node
/**
 * LGPD-01 — Migration Script for Data Subject Requests Foundation
 *
 * Migration file: supabase/migrations/20260910180000_lgpd_dsr_foundation.sql
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

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

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260910180000_lgpd_dsr_foundation.sql'
)

console.log('=== LGPD-01 MIGRATION STATUS ===')
console.log('Migration file:', migrationPath)
console.log('File exists:', existsSync(migrationPath))
if (existsSync(migrationPath)) {
  const sql = readFileSync(migrationPath, 'utf-8')
  console.log('SQL Size:', sql.length, 'bytes')
}
