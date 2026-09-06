import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveWeeklyScheduleAction } from '@/modules/agenda/actions'
import { hasOverlappingWindows, generateAvailableSlots } from '@/modules/agenda/engine'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import type { AvailabilitySettings, WeeklyAvailabilityRule } from '@/modules/agenda/types'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(),
}))

describe('PX4 — Weekly Schedule Editor Logic & Invariants', () => {
  const profileId = '11111111-1111-4111-a111-111111111111'
  const accountId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
  const locationMoema = 'loc-moema-uuid'

  let savedPayload: any = null

  beforeEach(() => {
    vi.clearAllMocks()
    savedPayload = null

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
      if (table === 'professional_profile_locations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { profile_id: profileId, location_id: locationMoema }, error: null }),
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
                order: async () => ({ data: savedPayload || [], error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
      rpc: vi.fn(async (_fn: string, args: any) => {
        savedPayload = args.p_rules
        return { error: null }
      }),
    } as any)
  })

  it('saves a single window for a day', async () => {
    const res = await saveWeeklyScheduleAction(profileId, [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', locationId: null },
    ])

    expect(res.success).toBe(true)
    expect(savedPayload).toHaveLength(1)
    expect(savedPayload[0]).toMatchObject({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '18:00',
      location_id: null,
    })
  })

  it('saves multiple non-overlapping windows for the same day', async () => {
    const res = await saveWeeklyScheduleAction(profileId, [
      { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', locationId: null },
      { dayOfWeek: 1, startTime: '14:00', endTime: '20:00', locationId: null },
    ])

    expect(res.success).toBe(true)
    expect(savedPayload).toHaveLength(2)
  })

  it('allows disabling a day by omitting rules for that day', async () => {
    // Week with Monday only; Sunday is omitted (disabled/closed)
    const res = await saveWeeklyScheduleAction(profileId, [
      { dayOfWeek: 1, startTime: '10:00', endTime: '16:00', locationId: null },
    ])

    expect(res.success).toBe(true)
    expect(savedPayload.some((r: any) => r.day_of_week === 0)).toBe(false)
  })

  it('rejects invalid time window where startTime >= endTime', async () => {
    const res = await saveWeeklyScheduleAction(profileId, [
      { dayOfWeek: 1, startTime: '18:00', endTime: '09:00', locationId: null },
    ])

    expect(res.success).toBe(false)
    expect(res.error).toContain('Horário de início (18:00) deve ser anterior ao fim (09:00)')
  })

  it('detects cross-midnight single interval as invalid and instructs split', async () => {
    // If a user enters 22:00–02:00 in a single window, 22:00 >= 02:00
    const res = await saveWeeklyScheduleAction(profileId, [
      { dayOfWeek: 5, startTime: '22:00', endTime: '02:00', locationId: null },
    ])

    expect(res.success).toBe(false)
    expect(res.error).toContain('anterior ao fim')
  })

  it('detects overlapping windows in the same effective scope', () => {
    const overlaps = hasOverlappingWindows([
      { startTime: '09:00', endTime: '13:00' },
      { startTime: '12:00', endTime: '17:00' },
    ])
    expect(overlaps).toBe(true)

    const nonOverlaps = hasOverlappingWindows([
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '13:00', endTime: '17:00' },
    ])
    expect(nonOverlaps).toBe(false)
  })

  it('location-specific schedule correctly overrides global schedule for that location', () => {
    const baseSettings: AvailabilitySettings = {
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
      // Global Monday: 09:00–12:00 (3 slots)
      { id: '1', profileId, dayOfWeek: 1, startTime: '09:00', endTime: '12:00', locationId: null },
      // Moema Monday: 14:00–16:00 (2 slots) — overrides global in Moema!
      { id: '2', profileId, dayOfWeek: 1, startTime: '14:00', endTime: '16:00', locationId: locationMoema },
    ]

    // Query specifically for Moema on 2026-09-07 (Monday)
    const moemaSlots = generateAvailableSlots({
      settings: baseSettings,
      weeklyRules: rules,
      exceptions: [],
      startDate: '2026-09-07',
      endDate: '2026-09-07',
      targetLocationId: locationMoema,
      now: new Date('2026-09-01T00:00:00Z'),
    })

    // Should only yield Moema specific slots (14:00 and 15:00), not the global 09:00-12:00 slots
    expect(moemaSlots).toHaveLength(2)
    expect(moemaSlots[0].localStartTime).toBe('14:00')
    expect(moemaSlots[1].localStartTime).toBe('15:00')

    // Query for all/global (no location target): yields global slots
    const globalSlots = generateAvailableSlots({
      settings: baseSettings,
      weeklyRules: rules,
      exceptions: [],
      startDate: '2026-09-07',
      endDate: '2026-09-07',
      targetLocationId: null,
      now: new Date('2026-09-01T00:00:00Z'),
    })

    expect(globalSlots.some((s) => s.localStartTime === '09:00')).toBe(true)
  })
})
