/**
 * Test: Environment Security Boundaries
 *
 * Verifies that:
 * 1. The client env module does NOT expose SUPABASE_SERVICE_ROLE_KEY
 * 2. The client env module does NOT import from the server env module
 * 3. Environment variable naming conventions are respected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(__dirname, '..')

describe('Environment Security', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('Client env module (lib/env/client.ts)', () => {
    it('does not reference SUPABASE_SERVICE_ROLE_KEY', () => {
      const clientEnvSource = readFileSync(
        resolve(ROOT, 'lib/env/client.ts'),
        'utf-8'
      )
      expect(clientEnvSource).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
    })

    it('does not import from server env module', () => {
      const clientEnvSource = readFileSync(
        resolve(ROOT, 'lib/env/client.ts'),
        'utf-8'
      )
      expect(clientEnvSource).not.toContain("from './server'")
      expect(clientEnvSource).not.toContain("from '../env/server'")
      expect(clientEnvSource).not.toContain("require('./server')")
    })

    it('does not import server-only package', () => {
      const clientEnvSource = readFileSync(
        resolve(ROOT, 'lib/env/client.ts'),
        'utf-8'
      )
      // Client module should NOT have 'server-only' — that's only for server modules
      // (and we verify server.ts DOES have it in a separate test)
      expect(clientEnvSource).not.toContain("'server-only'")
    })

    it('only references NEXT_PUBLIC_ prefixed supabase variables', () => {
      const clientEnvSource = readFileSync(
        resolve(ROOT, 'lib/env/client.ts'),
        'utf-8'
      )
      // Should reference public vars
      expect(clientEnvSource).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(clientEnvSource).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    })
  })

  describe('Server env module (lib/env/server.ts)', () => {
    it('imports server-only guard', () => {
      const serverEnvSource = readFileSync(
        resolve(ROOT, 'lib/env/server.ts'),
        'utf-8'
      )
      expect(serverEnvSource).toContain("'server-only'")
    })

    it('references SUPABASE_SERVICE_ROLE_KEY', () => {
      const serverEnvSource = readFileSync(
        resolve(ROOT, 'lib/env/server.ts'),
        'utf-8'
      )
      expect(serverEnvSource).toContain('SUPABASE_SERVICE_ROLE_KEY')
    })
  })

  describe('Supabase admin client (lib/supabase/admin.ts)', () => {
    it('imports server-only guard', () => {
      const adminSource = readFileSync(
        resolve(ROOT, 'lib/supabase/admin.ts'),
        'utf-8'
      )
      expect(adminSource).toContain("'server-only'")
    })

    it('uses SUPABASE_SERVICE_ROLE_KEY (not a NEXT_PUBLIC_ key)', () => {
      const adminSource = readFileSync(
        resolve(ROOT, 'lib/supabase/admin.ts'),
        'utf-8'
      )
      expect(adminSource).toContain('SUPABASE_SERVICE_ROLE_KEY')
      // Must NOT use a NEXT_PUBLIC_ prefixed variable for the service role
      const lines = adminSource.split('\n')
      const serviceRoleLine = lines.find((l) =>
        l.includes('SUPABASE_SERVICE_ROLE_KEY')
      )
      expect(serviceRoleLine).not.toContain('NEXT_PUBLIC_')
    })
  })

  describe('.env.example', () => {
    it('exists and contains required variable names', () => {
      const envExample = readFileSync(
        resolve(ROOT, '.env.example'),
        'utf-8'
      )
      expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(envExample).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
      expect(envExample).toContain('SUPABASE_SERVICE_ROLE_KEY')
      expect(envExample).toContain('NEXT_PUBLIC_APP_URL')
    })

    it('does not contain real secret values', () => {
      const envExample = readFileSync(
        resolve(ROOT, '.env.example'),
        'utf-8'
      )
      // Service role key line should be empty (placeholder only)
      const serviceRoleLine = envExample
        .split('\n')
        .find((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='))
      expect(serviceRoleLine).toBeDefined()
      // The value after '=' should be empty
      const value = serviceRoleLine!.split('=')[1]?.trim()
      expect(value).toBeFalsy()
    })
  })
})
