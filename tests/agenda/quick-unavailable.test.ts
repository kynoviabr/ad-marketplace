import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  setUnavailableTodayAction,
  restoreTodayAvailabilityAction,
} from '@/modules/agenda/actions'
import { generateAvailableSlots, getLocalDateInTimezone } from '@/modules/agenda/engine'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import type { AvailabilityException, AvailabilitySettings, WeeklyAvailabilityRule } from '@/modules/agenda/types'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(),
}))

describe('PX4 — Quick Action: Indisponível Hoje', () => {
  const profileId = '11111111-1111-4111-a111-111111111111'
  const accountId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'

  let storedExceptions: AvailabilityException[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    storedExceptions = []

    vi.mocked(requireAccount).mockResolvedValue({
      id: accountId,
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
    } as any)

    const mockFrom = vi.fn((table: string) => {
      if (table === 'professional_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: profileId, account_user_id: accountId }, error: null }),
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
      if (table === 'professional_availability_exceptions') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  order: () => ({
                    order: async () => ({ data: storedExceptions, error: null }),
                  }),
                }),
              }),
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const insertedRow = {
                  id: `ex-${storedExceptions.length + 1}`,
                  profile_id: payload.profile_id,
                  exception_date: payload.exception_date,
                  exception_type: payload.exception_type,
                  start_time: payload.start_time,
                  end_time: payload.end_time,
                  location_id: payload.location_id,
                  created_at: new Date().toISOString(),
                }
                storedExceptions.push(insertedRow as any)
                return { data: insertedRow, error: null }
              },
            }),
          }),
          delete: () => ({
            eq: (_c1: string, id: string) => ({
              eq: async () => {
                storedExceptions = storedExceptions.filter((e: any) => e.id !== id)
                return { error: null, count: 1 }
              },
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

  it('marks today as unavailable by creating a CLOSED_DAY exception in canonical timezone', async () => {
    const todayStr = getLocalDateInTimezone(new Date(), 'America/Sao_Paulo')

    const res = await setUnavailableTodayAction(profileId)
    expect(res.success).toBe(true)
    expect(res.data?.exceptionType).toBe('CLOSED_DAY')
    expect(res.data?.exceptionDate).toBe(todayStr)
    expect(res.data?.locationId).toBeNull()

    expect(storedExceptions).toHaveLength(1)
  })

  it('is strictly idempotent on repeated clicks', async () => {
    // Click 1
    const res1 = await setUnavailableTodayAction(profileId)
    expect(res1.success).toBe(true)
    expect(storedExceptions).toHaveLength(1)

    // Click 2
    const res2 = await setUnavailableTodayAction(profileId)
    expect(res2.success).toBe(true)
    // No duplicate row created
    expect(storedExceptions).toHaveLength(1)
  })

  it('restores availability by removing today CLOSED_DAY exception', async () => {
    await setUnavailableTodayAction(profileId)
    expect(storedExceptions).toHaveLength(1)

    const restoreRes = await restoreTodayAvailabilityAction(profileId)
    expect(restoreRes.success).toBe(true)
    expect(storedExceptions).toHaveLength(0)
  })

  it('when today is closed, today slots become empty while tomorrow remains active', () => {
    const todayStr = '2026-09-07' // Monday
    const tomorrowStr = '2026-09-08' // Tuesday

    const settings: AvailabilitySettings = {
      profileId,
      enabled: true,
      timezone: 'America/Sao_Paulo',
      slotDurationMinutes: 60,
      slotIntervalMinutes: 60,
      minimumNoticeMinutes: 0,
      maximumAdvanceDays: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    }

    const rules: WeeklyAvailabilityRule[] = [
      { id: 'r1', profileId, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', locationId: null }, // Mon
      { id: 'r2', profileId, dayOfWeek: 2, startTime: '09:00', endTime: '18:00', locationId: null }, // Tue
    ]

    const exceptions: AvailabilityException[] = [
      { id: 'ex-1', profileId, exceptionDate: todayStr, exceptionType: 'CLOSED_DAY', locationId: null },
    ]

    const slots = generateAvailableSlots({
      settings,
      weeklyRules: rules,
      exceptions,
      startDate: todayStr,
      endDate: tomorrowStr,
      now: new Date('2026-09-01T00:00:00Z'),
    })

    const todaySlots = slots.filter((s) => s.localDate === todayStr)
    const tomorrowSlots = slots.filter((s) => s.localDate === tomorrowStr)

    // Today is completely empty due to CLOSED_DAY
    expect(todaySlots).toHaveLength(0)
    // Tomorrow is unaffected and has slots
    expect(tomorrowSlots.length).toBeGreaterThan(0)
  })
})
