/**
 * Tests: Public Health Endpoint Security Hardening — PX1B
 *
 * Verifies that the public GET /api/health endpoint:
 * 1. Conforms to the minimal anonymous contract: status, timestamp, requestId.
 * 2. Emits zero internal provider details, storage buckets, or database specifics.
 * 3. Emits zero latency or probe breakdown metadata.
 * 4. Carries canonical x-request-id in headers matching payload requestId.
 * 5. Strictly prevents secret leakage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('PX1B: Public Health Security & Anonymity Contracts', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('returns exact minimal anonymous shape without internal details', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mwzlunkkyigxzjpnybxj.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const testId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    const req = new Request('https://velvet.club/api/health', {
      headers: { 'x-request-id': testId },
    })

    const response = await GET(req)
    expect(response.status).toBe(200)
    expect(response.headers.get('x-request-id')).toBe(testId)
    expect(response.headers.get('cache-control')).toBe('no-store')

    const body = (await response.json()) as Record<string, unknown>

    // Minimal contract assertions
    expect(body.status).toBe('ok')
    expect(typeof body.timestamp).toBe('string')
    expect(body.requestId).toBe(testId)

    // Strictly forbidden fields in public endpoint
    expect(body).not.toHaveProperty('configuration')
    expect(body).not.toHaveProperty('probes')
    expect(body).not.toHaveProperty('latencies')
    expect(body).not.toHaveProperty('version')
    expect(body).not.toHaveProperty('phase')
    expect(body).not.toHaveProperty('database')
    expect(body).not.toHaveProperty('storage')
  })

  it('never leaks internal provider names, bucket names, or secrets', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mwzlunkkyigxzjpnybxj.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-service-role-key-12345'
    process.env.DIDIT_API_KEY = 'didit-secret-api-key-999'

    const response = await GET()
    const rawText = await response.text()

    expect(rawText).not.toContain('super-secret-service-role-key-12345')
    expect(rawText).not.toContain('didit-secret-api-key-999')
    expect(rawText).not.toContain('supabase')
    expect(rawText).not.toContain('didit')
    expect(rawText).not.toContain('profile-media')
    expect(rawText).not.toContain('account_users')
  })

  it('returns degraded status when essential env vars are absent', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const response = await GET()
    expect(response.status).toBe(200)

    const body = (await response.json()) as Record<string, unknown>
    expect(body.status).toBe('degraded')
    expect(body.requestId).toBeDefined()
  })
})
