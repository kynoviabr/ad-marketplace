/**
 * Test: Health Endpoint
 *
 * Verifies that the /api/health route handler returns the correct shape
 * and never exposes secrets.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('GET /api/health', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('returns status, timestamp, and version fields', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json() as Record<string, unknown>

    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('version')
    expect(typeof body.timestamp).toBe('string')
    // Validate ISO 8601 format
    expect(() => new Date(body.timestamp as string).toISOString()).not.toThrow()
  })

  it('returns status "ok" when env vars are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json() as Record<string, unknown>

    expect(body.status).toBe('ok')
  })

  it('returns status "degraded" when env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const body = await response.json() as Record<string, unknown>

    expect(body.status).toBe('degraded')
  })

  it('NEVER returns the service role key or any secret', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-service-role-key'

    const { GET } = await import('@/app/api/health/route')
    const response = await GET()
    const bodyText = await response.text()

    expect(bodyText).not.toContain('super-secret-service-role-key')
    expect(bodyText).not.toContain('SERVICE_ROLE')
    expect(bodyText).not.toContain('service_role')
  })

  it('returns HTTP 200', async () => {
    const { GET } = await import('@/app/api/health/route')
    const response = await GET()

    expect(response.status).toBe(200)
  })
})
