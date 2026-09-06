import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  clipWindows,
  getDayOfWeekInTimezone,
  hasOverlappingWindows,
  localToIso,
  minutesToTime,
  timeToMinutes,
  generateAvailableSlots,
} from '@/modules/agenda/engine'
import {
  DEFAULT_AVAILABILITY_SETTINGS,
  getAvailabilitySettings,
  updateAvailabilitySettings,
  getWeeklyAvailability,
  saveWeeklyAvailability,
  getAvailabilityExceptions,
  createAvailabilityException,
  deleteAvailabilityException,
  getPublicAvailableSlots,
} from '@/modules/agenda/dal'
import {
  saveAvailabilitySettingsAction,
  saveWeeklyScheduleAction,
  createAvailabilityExceptionAction,
  deleteAvailabilityExceptionAction,
} from '@/modules/agenda/actions'
import type {
  AvailabilityException,
  AvailabilitySettings,
  WeeklyAvailabilityRule,
} from '@/modules/agenda/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(),
}))

describe('PX3 — Professional Availability & Agenda Foundation', () => {
  describe('1. Pure Engine Units — Math, Clocks, Windows & Precedence', () => {
    it('correctly converts time strings to minutes and back', () => {
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('09:30')).toBe(570)
      expect(timeToMinutes('14:45')).toBe(885)
      expect(timeToMinutes('23:59')).toBe(1439)

      expect(minutesToTime(0)).toBe('00:00')
      expect(minutesToTime(570)).toBe('09:30')
      expect(minutesToTime(885)).toBe('14:45')
      expect(minutesToTime(1439)).toBe('23:59')

      expect(() => timeToMinutes('invalid')).toThrow()
      expect(() => timeToMinutes('25:00')).toThrow()
    })

    it('detects overlapping windows accurately', () => {
      const nonOverlapping = [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '13:00', endTime: '17:00' },
        { startTime: '18:00', endTime: '20:00' },
      ]
      expect(hasOverlappingWindows(nonOverlapping)).toBe(false)

      const overlapping = [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '11:30', endTime: '14:00' },
      ]
      expect(hasOverlappingWindows(overlapping)).toBe(true)

      const touching = [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '12:00', endTime: '15:00' },
      ]
      expect(hasOverlappingWindows(touching)).toBe(false)
    })

    it('clips base windows with blocked intervals correctly', () => {
      const base = [{ startTime: '09:00', endTime: '18:00' }]

      // 1. Block punches hole in middle
      const hole = clipWindows(base, [{ startTime: '12:00', endTime: '13:00' }])
      expect(hole).toEqual([
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '13:00', endTime: '18:00' },
      ])

      // 2. Block cuts start
      const startCut = clipWindows(base, [{ startTime: '08:30', endTime: '10:00' }])
      expect(startCut).toEqual([{ startTime: '10:00', endTime: '18:00' }])

      // 3. Block cuts end
      const endCut = clipWindows(base, [{ startTime: '17:00', endTime: '19:00' }])
      expect(endCut).toEqual([{ startTime: '09:00', endTime: '17:00' }])

      // 4. Block completely engulfs window
      const fullBlock = clipWindows(base, [{ startTime: '08:00', endTime: '19:00' }])
      expect(fullBlock).toEqual([])

      // 5. Multiple blocked intervals
      const multi = clipWindows(base, [
        { startTime: '11:00', endTime: '12:00' },
        { startTime: '15:00', endTime: '16:00' },
      ])
      expect(multi).toEqual([
        { startTime: '09:00', endTime: '11:00' },
        { startTime: '12:00', endTime: '15:00' },
        { startTime: '16:00', endTime: '18:00' },
      ])
    })

    it('generates unambiguous ISO timestamps with America/Sao_Paulo offset', () => {
      const iso = localToIso('2026-09-10', '14:00', 'America/Sao_Paulo')
      expect(iso).toBe('2026-09-10T14:00:00-03:00')
      expect(new Date(iso).toISOString()).toBe('2026-09-10T17:00:00.000Z')
    })

    it('computes day of week in target timezone deterministically', () => {
      // 2026-09-06 is Sunday (0)
      expect(getDayOfWeekInTimezone('2026-09-06', 'America/Sao_Paulo')).toBe(0)
      // 2026-09-07 is Monday (1)
      expect(getDayOfWeekInTimezone('2026-09-07', 'America/Sao_Paulo')).toBe(1)
      // 2026-09-10 is Thursday (4)
      expect(getDayOfWeekInTimezone('2026-09-10', 'America/Sao_Paulo')).toBe(4)
    })
  })

  describe('2. Pure Slot Generation & Precedence Engine', () => {
    const defaultSettings: AvailabilitySettings = {
      profileId: '11111111-1111-4111-a111-111111111111',
      enabled: true,
      timezone: 'America/Sao_Paulo',
      slotDurationMinutes: 60,
      slotIntervalMinutes: 60,
      minimumNoticeMinutes: 120, // 2 hours
      maximumAdvanceDays: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    }

    // Monday schedule: 09:00 - 13:00 (4 x 60m slots: 09:00, 10:00, 11:00, 12:00)
    const weeklyRules: WeeklyAvailabilityRule[] = [
      {
        profileId: defaultSettings.profileId,
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '13:00',
        locationId: null,
      },
    ]

    it('returns empty array when availability is disabled', () => {
      const slots = generateAvailableSlots({
        settings: { ...defaultSettings, enabled: false },
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-07', // Monday
        endDate: '2026-09-07',
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(slots).toEqual([])
    })

    it('generates standard weekly slots when no exceptions exist', () => {
      const slots = generateAvailableSlots({
        settings: defaultSettings,
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        now: new Date('2026-09-07T05:00:00-03:00'), // 4 hours before 09:00 -> notice satisfied
      })

      expect(slots).toHaveLength(4)
      expect(slots[0].localStartTime).toBe('09:00')
      expect(slots[0].localEndTime).toBe('10:00')
      expect(slots[1].localStartTime).toBe('10:00')
      expect(slots[2].localStartTime).toBe('11:00')
      expect(slots[3].localStartTime).toBe('12:00')
      expect(slots[3].localEndTime).toBe('13:00')
    })

    it('respects minimum notice window and filters out imminent slots', () => {
      // Current time is 08:30 on Monday. Minimum notice is 120m (2 hours).
      // First available slot must start at >= 10:30.
      // 09:00 is too soon; 10:00 is too soon (< 120m); 11:00 and 12:00 are available!
      const slots = generateAvailableSlots({
        settings: defaultSettings,
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        now: new Date('2026-09-07T08:30:00-03:00'),
      })

      expect(slots).toHaveLength(2)
      expect(slots[0].localStartTime).toBe('11:00')
      expect(slots[1].localStartTime).toBe('12:00')
    })

    it('respects maximum advance window', () => {
      // 5 days advance max; query is 10 days out
      const slots = generateAvailableSlots({
        settings: { ...defaultSettings, maximumAdvanceDays: 5 },
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-21', // 14 days later
        endDate: '2026-09-21',
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      expect(slots).toEqual([])
    })

    it('CLOSED_DAY exception takes absolute precedence and returns 0 slots', () => {
      const exceptions: AvailabilityException[] = [
        {
          profileId: defaultSettings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'CLOSED_DAY',
          locationId: null,
        },
      ]

      const slots = generateAvailableSlots({
        settings: defaultSettings,
        weeklyRules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      expect(slots).toEqual([])
    })

    it('CUSTOM_HOURS exception completely replaces weekly rules for that date', () => {
      const exceptions: AvailabilityException[] = [
        {
          profileId: defaultSettings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'CUSTOM_HOURS',
          startTime: '14:00',
          endTime: '16:00',
          locationId: null,
        },
      ]

      const slots = generateAvailableSlots({
        settings: defaultSettings,
        weeklyRules, // regular is 09:00-13:00
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      // Replaces 09:00-13:00 with 14:00-16:00 (2 x 60m slots: 14:00, 15:00)
      expect(slots).toHaveLength(2)
      expect(slots[0].localStartTime).toBe('14:00')
      expect(slots[1].localStartTime).toBe('15:00')
    })

    it('BLOCKED_INTERVAL exception subtracts time from weekly schedule', () => {
      const exceptions: AvailabilityException[] = [
        {
          profileId: defaultSettings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'BLOCKED_INTERVAL',
          startTime: '10:00',
          endTime: '12:00',
          locationId: null,
        },
      ]

      const slots = generateAvailableSlots({
        settings: defaultSettings,
        weeklyRules, // regular is 09:00-13:00
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      // 09:00-13:00 with 10:00-12:00 blocked leaves:
      // 09:00-10:00 (1 slot: 09:00)
      // 12:00-13:00 (1 slot: 12:00)
      expect(slots).toHaveLength(2)
      expect(slots[0].localStartTime).toBe('09:00')
      expect(slots[1].localStartTime).toBe('12:00')
    })

    it('respects location scoping for multi-area rules and exceptions', () => {
      const locA = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
      const locB = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'

      const multiLocRules: WeeklyAvailabilityRule[] = [
        {
          profileId: defaultSettings.profileId,
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '12:00',
          locationId: locA,
        },
        {
          profileId: defaultSettings.profileId,
          dayOfWeek: 1,
          startTime: '14:00',
          endTime: '18:00',
          locationId: locB,
        },
      ]

      // Querying locA
      const slotsA = generateAvailableSlots({
        settings: defaultSettings,
        weeklyRules: multiLocRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locA,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(slotsA).toHaveLength(3) // 09:00, 10:00, 11:00
      expect(slotsA.every((s) => s.locationId === locA)).toBe(true)

      // Querying locB
      const slotsB = generateAvailableSlots({
        settings: defaultSettings,
        weeklyRules: multiLocRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locB,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(slotsB).toHaveLength(4) // 14:00, 15:00, 16:00, 17:00
      expect(slotsB.every((s) => s.locationId === locB)).toBe(true)
    })
  })

  describe('3. DAL & Public Query Security (Fail-Closed)', () => {
    const mockFrom = vi.fn()
    const mockRpc = vi.fn()
    const mockAdmin = { from: mockFrom, rpc: mockRpc }

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)
    })

    it('returns default availability settings when no DB row exists', async () => {
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      })

      const settings = await getAvailabilitySettings('profile-uuid')
      expect(settings.profileId).toBe('profile-uuid')
      expect(settings.enabled).toBe(true)
      expect(settings.slotDurationMinutes).toBe(DEFAULT_AVAILABILITY_SETTINGS.slotDurationMinutes)
    })

    it('validates overlapping windows before calling weekly availability RPC', async () => {
      const invalidRules = [
        { dayOfWeek: 1 as const, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1 as const, startTime: '11:00', endTime: '14:00' },
      ]

      await expect(saveWeeklyAvailability('profile-uuid', invalidRules)).rejects.toThrow(
        /Overlapping windows detected/
      )
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('calls save_professional_weekly_availability RPC on valid schedule', async () => {
      mockRpc.mockResolvedValue({ error: null })
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: async () => ({
                data: [
                  {
                    id: 'rule-1',
                    profile_id: 'profile-uuid',
                    day_of_week: 1,
                    start_time: '09:00',
                    end_time: '12:00',
                    location_id: null,
                    created_at: '2026-09-06T00:00:00Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await saveWeeklyAvailability('profile-uuid', [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      ])

      expect(mockRpc).toHaveBeenCalledWith('save_professional_weekly_availability', {
        p_profile_id: 'profile-uuid',
        p_rules: [
          { day_of_week: 1, start_time: '09:00', end_time: '12:00', location_id: null },
        ],
      })
      expect(result).toHaveLength(1)
    })

    it('fails closed on public slot inquiry when profile is not publication-eligible', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }), // NOT in view
              }),
            }),
          }
        }
        return {}
      })

      const slots = await getPublicAvailableSlots({
        profileSlug: 'unverified-slug',
        startDate: '2026-09-07',
        endDate: '2026-09-07',
      })

      expect(slots).toEqual([])
    })

    it('fails closed when requested location is not associated with the profile', async () => {
      const profileId = '11111111-1111-4111-a111-111111111111'
      const locId = '22222222-2222-4222-a222-222222222222'

      mockFrom.mockImplementation((table: string) => {
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { profile_id: profileId, profile_status: 'ACTIVE' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'marketplace_locations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: locId, active: true },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'professional_profile_locations') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }), // Location NOT tied to profile
                }),
              }),
            }),
          }
        }
        return {}
      })

      const slots = await getPublicAvailableSlots({
        profileSlug: 'valid-slug',
        locationSlug: 'unauthorized-location',
        startDate: '2026-09-07',
        endDate: '2026-09-07',
      })

      expect(slots).toEqual([])
    })
  })

  describe('4. Server Actions & Ownership Authorization Boundary', () => {
    const mockFrom = vi.fn()
    const mockRpc = vi.fn()
    const mockAdmin = { from: mockFrom, rpc: mockRpc }

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)
    })

    it('rejects saveAvailabilitySettingsAction when caller does not own the profile', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'attacker-account-id',
        role: 'ADVERTISER',
        status: 'ACTIVE',
      } as any)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'target-profile-id', account_user_id: 'real-owner-account-id' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const res = await saveAvailabilitySettingsAction('target-profile-id', {
        slotDurationMinutes: 60,
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/você não possui permissão/)
    })

    it('allows ADMIN to manage availability settings for any profile', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'admin-account-id',
        role: 'ADMIN',
        status: 'ACTIVE',
      } as any)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'professional_availability_settings') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    profile_id: 'target-profile-id',
                    enabled: true,
                    timezone: 'America/Sao_Paulo',
                    slot_duration_minutes: 60,
                    slot_interval_minutes: 30,
                    minimum_notice_minutes: 120,
                    maximum_advance_days: 30,
                    buffer_before_minutes: 0,
                    buffer_after_minutes: 0,
                    created_at: '2026-09-06T00:00:00Z',
                    updated_at: '2026-09-06T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
            upsert: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    profile_id: 'target-profile-id',
                    enabled: true,
                    timezone: 'America/Sao_Paulo',
                    slot_duration_minutes: 45,
                    slot_interval_minutes: 30,
                    minimum_notice_minutes: 120,
                    maximum_advance_days: 30,
                    buffer_before_minutes: 0,
                    buffer_after_minutes: 0,
                    created_at: '2026-09-06T00:00:00Z',
                    updated_at: '2026-09-06T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const res = await saveAvailabilitySettingsAction('target-profile-id', {
        slotDurationMinutes: 45,
      })

      expect(res.success).toBe(true)
      expect(res.data?.slotDurationMinutes).toBe(45)
    })

    it('validates exception rules in createAvailabilityExceptionAction', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'owner-account-id',
        role: 'ADVERTISER',
        status: 'ACTIVE',
      } as any)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'target-profile-id', account_user_id: 'owner-account-id' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      // Invalid date format
      const res1 = await createAvailabilityExceptionAction('target-profile-id', {
        exceptionDate: '07-09-2026',
        exceptionType: 'CLOSED_DAY',
      })
      expect(res1.success).toBe(false)
      expect(res1.error).toMatch(/Data da exceção inválida/)

      // CLOSED_DAY with times specified
      const res2 = await createAvailabilityExceptionAction('target-profile-id', {
        exceptionDate: '2026-09-07',
        exceptionType: 'CLOSED_DAY',
        startTime: '10:00',
        endTime: '12:00',
      })
      expect(res2.success).toBe(false)
      expect(res2.error).toMatch(/Dias fechados não devem conter horários/)

      // BLOCKED_INTERVAL with start >= end
      const res3 = await createAvailabilityExceptionAction('target-profile-id', {
        exceptionDate: '2026-09-07',
        exceptionType: 'BLOCKED_INTERVAL',
        startTime: '14:00',
        endTime: '12:00',
      })
      expect(res3.success).toBe(false)
      expect(res3.error).toMatch(/Horário de início deve ser anterior/)
    })
  })
})
