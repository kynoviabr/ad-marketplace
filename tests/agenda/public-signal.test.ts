import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPublicAvailabilitySignal } from '@/modules/agenda/dal'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('PX4 — Public Availability Signal & Privacy Guarantees', () => {
  const profileId = '11111111-1111-4111-a111-111111111111'
  const profileSlug = 'isabella-lux'

  let isEligible = true
  let isEnabled = true
  let weeklyRulesData: any[] = []
  let exceptionsData: any[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    isEligible = true
    isEnabled = true
    weeklyRulesData = [
      {
        id: 'r1',
        profile_id: profileId,
        day_of_week: 0,
        start_time: '00:00',
        end_time: '23:59',
        location_id: null,
      },
      {
        id: 'r2',
        profile_id: profileId,
        day_of_week: 1,
        start_time: '00:00',
        end_time: '23:59',
        location_id: null,
      },
      {
        id: 'r3',
        profile_id: profileId,
        day_of_week: 2,
        start_time: '00:00',
        end_time: '23:59',
        location_id: null,
      },
      {
        id: 'r4',
        profile_id: profileId,
        day_of_week: 3,
        start_time: '00:00',
        end_time: '23:59',
        location_id: null,
      },
      {
        id: 'r5',
        profile_id: profileId,
        day_of_week: 4,
        start_time: '00:00',
        end_time: '23:59',
        location_id: null,
      },
      {
        id: 'r6',
        profile_id: profileId,
        day_of_week: 5,
        start_time: '00:00',
        end_time: '23:59',
        location_id: null,
      },
      {
        id: 'r7',
        profile_id: profileId,
        day_of_week: 6,
        start_time: '00:00',
        end_time: '23:59',
        location_id: null,
      },
    ]
    exceptionsData = []

    const mockFrom = vi.fn((table: string) => {
      if (table === 'v_publication_eligible_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                if (isEligible) {
                  return { data: { profile_id: profileId, profile_status: 'ACTIVE' }, error: null }
                }
                return { data: null, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'professional_availability_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  profile_id: profileId,
                  enabled: isEnabled,
                  timezone: 'America/Sao_Paulo',
                  slot_duration_minutes: 60,
                  slot_interval_minutes: 60,
                  minimum_notice_minutes: 0,
                  maximum_advance_days: 30,
                  buffer_before_minutes: 0,
                  buffer_after_minutes: 0,
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'professional_weekly_availability') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({ data: weeklyRulesData, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'professional_availability_exceptions') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  order: () => ({
                    order: async () => ({ data: exceptionsData, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as any)
  })

  it('returns AVAILABLE_TODAY when an eligible profile has remaining slots today', async () => {
    const signal = await getPublicAvailabilitySignal(profileSlug)
    expect(signal.status).toBe('AVAILABLE_TODAY')
    if (signal.status === 'AVAILABLE_TODAY') {
      expect(signal.labelPt).toBe('Disponível hoje')
      expect(signal.labelEn).toBe('Available today')
    }
  })

  it('returns AVAILABLE_THIS_WEEK when today has no slots but future slots exist within 7 days', async () => {
    // Make today closed
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
    exceptionsData = [
      {
        id: 'ex-closed',
        profile_id: profileId,
        exception_date: today,
        exception_type: 'CLOSED_DAY',
        start_time: null,
        end_time: null,
        location_id: null,
      },
    ]

    const signal = await getPublicAvailabilitySignal(profileSlug)
    expect(signal.status).toBe('AVAILABLE_THIS_WEEK')
    if (signal.status === 'AVAILABLE_THIS_WEEK') {
      expect(signal.labelPt).toBe('Disponibilidade esta semana')
      expect(signal.labelEn).toBe('Available this week')
    }
  })

  it('returns NO_SIGNAL when profile availability is paused/disabled', async () => {
    isEnabled = false

    const signal = await getPublicAvailabilitySignal(profileSlug)
    expect(signal.status).toBe('NO_SIGNAL')
  })

  it('returns NO_SIGNAL when profile is ineligible in v_publication_eligible_profiles (fail-closed)', async () => {
    isEligible = false

    const signal = await getPublicAvailabilitySignal(profileSlug)
    expect(signal.status).toBe('NO_SIGNAL')
  })

  it('returns NO_SIGNAL when profile has no weekly rules configured', async () => {
    weeklyRulesData = []

    const signal = await getPublicAvailabilitySignal(profileSlug)
    expect(signal.status).toBe('NO_SIGNAL')
  })

  it('strict privacy check: signal contains ZERO UUIDs, zero buffer values, zero private rules', async () => {
    const signal = await getPublicAvailabilitySignal(profileSlug)
    const serialized = JSON.stringify(signal)

    expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
    expect(serialized).not.toContain('bufferBeforeMinutes')
    expect(serialized).not.toContain('weeklyRules')
    expect(serialized).not.toContain('exceptions')
  })
})
