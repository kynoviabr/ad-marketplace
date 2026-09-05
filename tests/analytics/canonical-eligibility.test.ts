/**
 * PX2A — Canonical Publication Eligibility & Ingestion Deduplication Test Suite
 *
 * Verifies:
 * - Public discovery events (PROFILE_IMPRESSION, PROFILE_VIEWED, CONTACT_WHATSAPP_CLICKED)
 *   are rejected / ignored if profile is not in v_publication_eligible_profiles.
 * - Profile views are deduplicated per visitor session per calendar day using deterministic event_key.
 * - Duplicate submissions return { success: true, ignored: true } safely.
 * - Zero visitor IP or PII is recorded in analytics tables.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ingestClientEvent } from '@/modules/analytics/write'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileBySlug } from '@/modules/profiles/dal'
import { getCityBySlug } from '@/modules/locations/dal'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/profiles/dal', () => ({
  getProfileBySlug: vi.fn(),
}))

vi.mock('@/modules/locations/dal', () => ({
  getCityBySlug: vi.fn(),
  getLocationBySlug: vi.fn(),
}))

describe('PX2A — Canonical Publication Eligibility & Ingestion Deduplication', () => {
  const mockInsert = vi.fn()
  const mockFrom = vi.fn()
  const mockAdmin = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)
  })

  it('silently ignores events when profile is NOT in v_publication_eligible_profiles', async () => {
    vi.mocked(getProfileBySlug).mockResolvedValue({
      id: 'profile-draft-id',
      slug: 'draft-profile',
      status: 'PENDING_APPROVAL',
    } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_publication_eligible_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }), // NOT eligible!
            }),
          }),
        }
      }
      return {}
    })

    const result = await ingestClientEvent({
      event_type: 'PROFILE_VIEWED',
      profile_slug: 'draft-profile',
      city_slug: 'sao-paulo',
      occurred_at: new Date().toISOString(),
      visitor_session_id: '11111111-1111-4111-a111-111111111111',
    })

    expect(result.success).toBe(true)
    expect(result.ignored).toBe(true)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('ingests event and assigns deterministic event_key for PROFILE_VIEWED when profile is eligible', async () => {
    vi.mocked(getProfileBySlug).mockResolvedValue({
      id: 'profile-eligible-id',
      slug: 'eligible-profile',
      status: 'ACTIVE',
    } as any)

    vi.mocked(getCityBySlug).mockResolvedValue({
      id: 'city-sp-id',
      name: 'São Paulo',
      slug: 'sao-paulo',
    } as any)

    let insertedRow: any = null
    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_publication_eligible_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { profile_id: 'profile-eligible-id' },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'analytics_events') {
        return {
          insert: async (row: any) => {
            insertedRow = row
            return { error: null }
          },
        }
      }

      return {}
    })

    const sessionId = '22222222-2222-4222-a222-222222222222'
    const occurredAt = '2026-09-05T15:30:00.000Z'

    const result = await ingestClientEvent({
      event_type: 'PROFILE_VIEWED',
      profile_slug: 'eligible-profile',
      city_slug: 'sao-paulo',
      occurred_at: occurredAt,
      visitor_session_id: sessionId,
    })

    expect(result.success).toBe(true)
    expect(result.ignored).toBeFalsy()
    expect(insertedRow).toBeTruthy()
    expect(insertedRow.event_type).toBe('PROFILE_VIEWED')
    expect(insertedRow.profile_id).toBe('profile-eligible-id')
    expect(insertedRow.event_key).toBe(`view:${sessionId}:profile-eligible-id:2026-09-05`)

    // Verify privacy: zero IP or personal identifying information
    expect(insertedRow).not.toHaveProperty('ip')
    expect(insertedRow).not.toHaveProperty('client_ip')
    expect(insertedRow).not.toHaveProperty('phone')
  })

  it('handles unique constraint violation (23505) on event_key gracefully as idempotent ignore', async () => {
    vi.mocked(getProfileBySlug).mockResolvedValue({
      id: 'profile-eligible-id',
      slug: 'eligible-profile',
      status: 'ACTIVE',
    } as any)

    vi.mocked(getCityBySlug).mockResolvedValue({
      id: 'city-sp-id',
      name: 'São Paulo',
      slug: 'sao-paulo',
    } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'v_publication_eligible_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { profile_id: 'profile-eligible-id' },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'analytics_events') {
        return {
          insert: async () => {
            // Simulate Postgres unique constraint violation
            return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          },
        }
      }

      return {}
    })

    const result = await ingestClientEvent({
      event_type: 'PROFILE_VIEWED',
      profile_slug: 'eligible-profile',
      city_slug: 'sao-paulo',
      occurred_at: new Date().toISOString(),
      visitor_session_id: '33333333-3333-4333-a333-333333333333',
    })

    expect(result.success).toBe(true)
    expect(result.ignored).toBe(true)
  })
})
