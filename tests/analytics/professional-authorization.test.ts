/**
 * PX2A — Professional Analytics Authorization & Ownership Isolation
 *
 * Verifies:
 * - Professional can only query analytics for profiles they own
 * - Rejects unauthorized caller attempting to view another professional's metrics
 * - Rejects request for non-existent profile
 * - Returns sanitized DTO with zero visitor PII or session IDs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getProfessionalAnalyticsOverview } from '@/modules/analytics/dal'
import { getSaoPauloDateStr } from '@/modules/analytics/aggregation'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('PX2A — Professional Analytics Authorization & Ownership Isolation', () => {
  const mockFrom = vi.fn()
  const mockAdmin = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)
  })

  it('rejects access when professional does not own the profile', async () => {
    const ownerAccountId = '11111111-1111-4111-a111-111111111111'
    const attackerAccountId = '22222222-2222-4222-a222-222222222222'
    const profileId = '33333333-3333-4333-a333-333333333333'

    mockFrom.mockImplementation((table: string) => {
      if (table === 'professional_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: profileId,
                  slug: 'target-profile',
                  account_user_id: ownerAccountId, // owned by someone else!
                  audience_setting: 'PUBLIC',
                  status: 'ACTIVE',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    await expect(
      getProfessionalAnalyticsOverview({
        profileId,
        accountId: attackerAccountId,
        periodDays: 30,
      })
    ).rejects.toThrow('Forbidden: Professional does not own this profile')
  })

  it('rejects access when profile does not exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'professional_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: null,
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    await expect(
      getProfessionalAnalyticsOverview({
        profileId: 'non-existent-id',
        accountId: 'any-account-id',
      })
    ).rejects.toThrow('Profile not found')
  })

  it('permits authorized owner to query their own metrics and returns sanitized DTO', async () => {
    const ownerAccountId = '11111111-1111-4111-a111-111111111111'
    const profileId = '33333333-3333-4333-a333-333333333333'

    mockFrom.mockImplementation((table: string) => {
      if (table === 'professional_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: profileId,
                  slug: 'my-profile',
                  account_user_id: ownerAccountId,
                  audience_setting: 'VIP_ONLY',
                  status: 'ACTIVE',
                },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'profile_daily_metrics') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  order: async () => ({
                    data: [
                      {
                        id: 'm1',
                        profile_id: profileId,
                        metric_date: getSaoPauloDateStr(new Date()),
                        impressions_total: 100,
                        impressions_organic: 80,
                        impressions_sponsored: 20,
                        views_total: 25,
                        views_organic: 20,
                        views_sponsored: 5,
                        whatsapp_clicks: 5,
                        phone_clicks: 1,
                        telegram_clicks: 0,
                        location_breakdown: [],
                        hourly_breakdown: {},
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }

      if (table === 'marketplace_locations') {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        }
      }

      return {}
    })

    const overview = await getProfessionalAnalyticsOverview({
      profileId,
      accountId: ownerAccountId,
      periodDays: 30,
    })

    expect(overview.profileId).toBe(profileId)
    expect(overview.profileSlug).toBe('my-profile')
    expect(overview.audienceMode).toBe('VIP_ONLY')
    expect(overview.periodDays).toBe(30)
    expect(overview.funnel.impressions.total).toBe(100)
    expect(overview.funnel.views.total).toBe(25)
    expect(overview.funnel.contacts.total).toBe(6)
    expect(overview.funnel.rates.impressionToViewRate).toBe(25)
    expect(overview.funnel.rates.viewToContactRate).toBe(24) // 6 / 25 * 100
    expect(overview.funnel.rates.overallConversionRate).toBe(6) // 6 / 100 * 100

    // Zero visitor session data or raw IPs exposed
    expect(overview).not.toHaveProperty('visitor_session_id')
    expect(overview).not.toHaveProperty('ip')
    expect(overview).not.toHaveProperty('rawIp')
  })
})
