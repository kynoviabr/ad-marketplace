import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAvailabilityExceptionAction,
  deleteAvailabilityExceptionAction,
  restoreTodayAvailabilityAction,
  saveAvailabilitySettingsAction,
  saveWeeklyScheduleAction,
  setUnavailableTodayAction,
} from '@/modules/agenda/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(),
}))

describe('PX4 — Owner Authorization & Security Invariants', () => {
  const profileId = '11111111-1111-4111-a111-111111111111'
  const otherProfileId = '22222222-2222-4222-a222-222222222222'
  const accountId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
  const otherAccountId = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
  const validLocationId = 'loc-moema-uuid'
  const unownedLocationId = 'loc-copacabana-uuid'

  let mockFrom: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockFrom = vi.fn((table: string) => {
      if (table === 'professional_profiles') {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => {
                if (id === profileId) {
                  return { data: { id: profileId, account_user_id: accountId }, error: null }
                }
                if (id === otherProfileId) {
                  return { data: { id: otherProfileId, account_user_id: otherAccountId }, error: null }
                }
                return { data: null, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'professional_profile_locations') {
        return {
          select: () => ({
            eq: (_col1: string, pId: string) => ({
              eq: (_col2: string, locId: string) => ({
                maybeSingle: async () => {
                  if (pId === profileId && locId === validLocationId) {
                    return { data: { profile_id: profileId, location_id: validLocationId }, error: null }
                  }
                  return { data: null, error: null }
                },
              }),
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
                  enabled: true,
                  timezone: 'America/Sao_Paulo',
                  slot_duration_minutes: 60,
                  slot_interval_minutes: 30,
                  minimum_notice_minutes: 120,
                  maximum_advance_days: 30,
                  buffer_before_minutes: 0,
                  buffer_after_minutes: 0,
                },
                error: null,
              }),
            }),
          }),
          upsert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  profile_id: profileId,
                  enabled: true,
                  timezone: 'America/Sao_Paulo',
                  slot_duration_minutes: 60,
                  slot_interval_minutes: 30,
                  minimum_notice_minutes: 120,
                  maximum_advance_days: 30,
                  buffer_before_minutes: 0,
                  buffer_after_minutes: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
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
                    order: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: {
                  id: 'ex-1',
                  profile_id: profileId,
                  exception_date: '2026-09-08',
                  exception_type: 'CLOSED_DAY',
                  start_time: null,
                  end_time: null,
                  location_id: null,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: async () => ({ error: null, count: 1 }),
            }),
          }),
        }
      }
      if (table === 'professional_weekly_availability') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({
                  data: [
                    {
                      id: 'rule-1',
                      profile_id: profileId,
                      day_of_week: 1,
                      start_time: '09:00',
                      end_time: '18:00',
                      location_id: validLocationId,
                      created_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
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
      rpc: async () => ({ data: null, error: null }),
    } as any)
  })

  it('allows owner ADVERTISER to save settings for her own profile', async () => {
    vi.mocked(requireAccount).mockResolvedValue({
      id: accountId,
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    const res = await saveAvailabilitySettingsAction(profileId, { enabled: false })
    expect(res.success).toBe(true)
  })

  it('denies another ADVERTISER from modifying another profile (profile substitution attack)', async () => {
    vi.mocked(requireAccount).mockResolvedValue({
      id: accountId,
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    const res = await saveAvailabilitySettingsAction(otherProfileId, { enabled: false })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Não autorizado')
  })

  it('allows ADMIN to manage availability settings', async () => {
    vi.mocked(requireAccount).mockResolvedValue({
      id: 'admin-id',
      role: 'ADMIN',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    const res = await saveAvailabilitySettingsAction(profileId, { enabled: true })
    expect(res.success).toBe(true)
  })

  it('denies CLIENT role from modifying professional availability', async () => {
    vi.mocked(requireAccount).mockResolvedValue({
      id: 'client-id',
      role: 'CLIENT',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    const res = await saveAvailabilitySettingsAction(profileId, { enabled: true })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Não autorizado')
  })

  it('denies anonymous callers (requireAccount rejects)', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('Redirect to /login'))

    const res = await saveAvailabilitySettingsAction(profileId, { enabled: true })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Redirect to /login')
  })

  it('rejects location substitution in weekly schedule rules', async () => {
    vi.mocked(requireAccount).mockResolvedValue({
      id: accountId,
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    // Attempt to set a schedule rule with an unowned location ID
    const res = await saveWeeklyScheduleAction(profileId, [
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        locationId: unownedLocationId,
      },
    ])

    expect(res.success).toBe(false)
    expect(res.error).toContain('Região de atendimento não associada')
  })

  it('rejects location substitution in exception creation', async () => {
    vi.mocked(requireAccount).mockResolvedValue({
      id: accountId,
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    // Attempt to create exception with unowned location ID
    const res = await createAvailabilityExceptionAction(profileId, {
      exceptionDate: '2026-09-10',
      exceptionType: 'CLOSED_DAY',
      locationId: unownedLocationId,
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Região de atendimento não associada')
  })

  it('accepts location belonging to the profile active service areas', async () => {
    vi.mocked(requireAccount).mockResolvedValue({
      id: accountId,
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    const res = await saveWeeklyScheduleAction(profileId, [
      {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '18:00',
        locationId: validLocationId,
      },
    ])

    expect(res.success).toBe(true)
  })
})
