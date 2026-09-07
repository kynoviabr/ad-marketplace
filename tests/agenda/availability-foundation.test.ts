import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  clipWindows,
  getDayOfWeekInTimezone,
  generateOpaqueSlotRef,
  hasOverlappingWindows,
  isValidIanaTimezone,
  localToIso,
  mergeOverlappingWindows,
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
  revalidateSlotAvailability,
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
  PublicAvailabilitySlot,
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

    it('merges overlapping or touching base windows into single continuous intervals', () => {
      const windows = [
        { startTime: '09:00', endTime: '14:00' },
        { startTime: '13:00', endTime: '18:00' },
        { startTime: '19:00', endTime: '21:00' },
      ]
      const merged = mergeOverlappingWindows(windows)
      expect(merged).toEqual([
        { startTime: '09:00', endTime: '18:00' },
        { startTime: '19:00', endTime: '21:00' },
      ])
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
  })

  describe('2. IANA Timezone Correctness & DST Transitions (AUDIT A)', () => {
    it('validates IANA timezone identifiers accurately', () => {
      expect(isValidIanaTimezone('America/Sao_Paulo')).toBe(true)
      expect(isValidIanaTimezone('America/New_York')).toBe(true)
      expect(isValidIanaTimezone('Europe/Berlin')).toBe(true)
      expect(isValidIanaTimezone('Asia/Tokyo')).toBe(true)
      expect(isValidIanaTimezone('UTC')).toBe(true)

      expect(isValidIanaTimezone('Foo/Bar')).toBe(false)
      expect(isValidIanaTimezone('America/Invalid')).toBe(false)
      expect(isValidIanaTimezone('')).toBe(false)
      expect(isValidIanaTimezone(null)).toBe(false)
      expect(isValidIanaTimezone(undefined)).toBe(false)
    })

    it('generates unambiguous ISO timestamps with America/Sao_Paulo offset (-03:00)', () => {
      const iso = localToIso('2026-09-10', '14:00', 'America/Sao_Paulo')
      expect(iso).toBe('2026-09-10T14:00:00-03:00')
      expect(new Date(iso!).toISOString()).toBe('2026-09-10T17:00:00.000Z')
    })

    it('resolves America/New_York standard and DST spring-forward transitions exactly', () => {
      // Standard time in NY (EST = UTC-5)
      const standard = localToIso('2026-01-15', '10:00', 'America/New_York')
      expect(standard).toBe('2026-01-15T10:00:00-05:00')
      expect(new Date(standard!).toISOString()).toBe('2026-01-15T15:00:00.000Z')

      // Daylight time in NY (EDT = UTC-4)
      const daylight = localToIso('2026-06-15', '10:00', 'America/New_York')
      expect(daylight).toBe('2026-06-15T10:00:00-04:00')
      expect(new Date(daylight!).toISOString()).toBe('2026-06-15T14:00:00.000Z')

      // Spring-forward transition date: 2026-03-08 (at 2am clocks jump to 3am)
      // 01:30 is before transition (EST = UTC-5)
      const preSpring = localToIso('2026-03-08', '01:30', 'America/New_York')
      expect(preSpring).toBe('2026-03-08T01:30:00-05:00')
      expect(new Date(preSpring!).toISOString()).toBe('2026-03-08T06:30:00.000Z')

      // 03:30 is after transition (EDT = UTC-4)
      const postSpring = localToIso('2026-03-08', '03:30', 'America/New_York')
      expect(postSpring).toBe('2026-03-08T03:30:00-04:00')
      expect(new Date(postSpring!).toISOString()).toBe('2026-03-08T07:30:00.000Z')
    })

    it('resolves Europe/Berlin standard and DST spring-forward transitions exactly', () => {
      // Standard time in Berlin (CET = UTC+1)
      const standard = localToIso('2026-01-15', '10:00', 'Europe/Berlin')
      expect(standard).toBe('2026-01-15T10:00:00+01:00')
      expect(new Date(standard!).toISOString()).toBe('2026-01-15T09:00:00.000Z')

      // Daylight time in Berlin (CEST = UTC+2)
      const daylight = localToIso('2026-06-15', '10:00', 'Europe/Berlin')
      expect(daylight).toBe('2026-06-15T10:00:00+02:00')
      expect(new Date(daylight!).toISOString()).toBe('2026-06-15T08:00:00.000Z')

      // Spring-forward transition date: 2026-03-29 (at 2am clocks jump to 3am)
      const preSpring = localToIso('2026-03-29', '01:30', 'Europe/Berlin')
      expect(preSpring).toBe('2026-03-29T01:30:00+01:00')
      expect(new Date(preSpring!).toISOString()).toBe('2026-03-29T00:30:00.000Z')

      const postSpring = localToIso('2026-03-29', '03:30', 'Europe/Berlin')
      expect(postSpring).toBe('2026-03-29T03:30:00+02:00')
      expect(new Date(postSpring!).toISOString()).toBe('2026-03-29T01:30:00.000Z')
    })

    it('handles positive UTC offsets like Asia/Tokyo (UTC+9)', () => {
      const tokyo = localToIso('2026-09-10', '14:00', 'Asia/Tokyo')
      expect(tokyo).toBe('2026-09-10T14:00:00+09:00')
      expect(new Date(tokyo!).toISOString()).toBe('2026-09-10T05:00:00.000Z')
    })

    it('safely handles leap day and year rollover', () => {
      // Leap day 2028-02-29
      const leap = localToIso('2028-02-29', '12:00', 'America/Sao_Paulo')
      expect(leap).toBe('2028-02-29T12:00:00-03:00')

      // Year rollover 2026-12-31 to 2027-01-01
      const nye = localToIso('2026-12-31', '23:30', 'America/Sao_Paulo')
      expect(nye).toBe('2026-12-31T23:30:00-03:00')
      expect(getDayOfWeekInTimezone('2026-12-31', 'America/Sao_Paulo')).toBe(4) // Thursday
      expect(getDayOfWeekInTimezone('2027-01-01', 'America/Sao_Paulo')).toBe(5) // Friday
    })

    it('falls back to America/Sao_Paulo if an invalid timezone is passed to localToIso', () => {
      const fallback = localToIso('2026-09-10', '14:00', 'Invalid/Timezone')
      expect(fallback).toBe('2026-09-10T14:00:00-03:00')
    })

    it('DST POLICY: skips nonexistent local wall-clock hour during spring-forward transition', () => {
      // In America/New_York on 2026-03-08, 02:00 skips to 03:00.
      // 02:30 does NOT exist on local clocks: returns null
      const nonexistent = localToIso('2026-03-08', '02:30', 'America/New_York')
      expect(nonexistent).toBeNull()

      // The slot generator automatically skips nonexistent hours without throwing or generating phantom slots
      const settings: AvailabilitySettings = {
        profileId: '11111111-1111-4111-a111-111111111111',
        enabled: true,
        timezone: 'America/New_York',
        slotDurationMinutes: 60,
        slotIntervalMinutes: 60,
        minimumNoticeMinutes: 0,
        maximumAdvanceDays: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      }
      const rules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 0, startTime: '01:00', endTime: '05:00', locationId: null },
      ]

      const slots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions: [],
        startDate: '2026-03-08', // Sunday (spring forward in NY)
        endDate: '2026-03-08',
        now: new Date('2026-03-07T12:00:00Z'),
      })

      // 01:00–02:00 cannot end at 02:00 because 02:00 does not exist.
      // 02:00 does not exist.
      // 03:00–04:00 and 04:00–05:00 exist.
      const times = slots.map((s) => s.localStartTime)
      expect(times).not.toContain('02:00')
      expect(times).toEqual(['03:00', '04:00'])
    })

    it('DST POLICY: deterministically resolves ambiguous local wall-clock hour during fall-back transition', () => {
      // In America/New_York on 2026-11-01, 01:00–02:00 repeats.
      // Deterministically resolves to the earlier occurrence (-04:00)
      const ambiguous = localToIso('2026-11-01', '01:30', 'America/New_York')
      expect(ambiguous).toBe('2026-11-01T01:30:00-04:00')
    })

    it('generates stable, opaque slot references without exposing raw UUIDs or PII', () => {
      const ref1 = generateOpaqueSlotRef('clara-lux', '2026-09-10T14:00:00-03:00', '2026-09-10T15:00:00-03:00')
      const ref2 = generateOpaqueSlotRef('clara-lux', '2026-09-10T14:00:00-03:00', '2026-09-10T15:00:00-03:00')
      const ref3 = generateOpaqueSlotRef('other-slug', '2026-09-10T14:00:00-03:00', '2026-09-10T15:00:00-03:00')

      // Stable and deterministic for identical inputs
      expect(ref1).toBe(ref2)
      // Different for different profile or slot
      expect(ref1).not.toBe(ref3)

      // Hex format (24 characters)
      expect(ref1).toMatch(/^[a-f0-9]{24}$/)

      // Contains ZERO raw UUIDs, ZERO account IDs, ZERO colons or raw timestamps
      expect(ref1).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      expect(ref1).not.toContain('clara-lux')
      expect(ref1).not.toContain(':')
    })
  })

  describe('3. Cross-Midnight Policy (AUDIT B)', () => {
    it('rejects cross-midnight single rules (start_time >= end_time) with controlled error in action', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'owner-account-id',
        role: 'ADVERTISER',
        status: 'ACTIVE',
      } as any)

      const mockFrom = vi.fn().mockImplementation((table: string) => {
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
      vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as any)

      const res = await saveWeeklyScheduleAction('target-profile-id', [
        { dayOfWeek: 1, startTime: '22:00', endTime: '02:00' },
      ])

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/Horário de início \(22:00\) deve ser anterior ao fim \(02:00\)/)
    })

    it('correctly models cross-midnight availability as two discrete daily intervals', () => {
      const settings: AvailabilitySettings = {
        profileId: '11111111-1111-4111-a111-111111111111',
        enabled: true,
        timezone: 'America/Sao_Paulo',
        slotDurationMinutes: 60,
        slotIntervalMinutes: 60,
        minimumNoticeMinutes: 0,
        maximumAdvanceDays: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      }

      // Day 1 (Monday, 2026-09-07): 22:00–23:59 (slot: 22:00–23:00)
      // Day 2 (Tuesday, 2026-09-08): 00:00–02:00 (slots: 00:00–01:00, 01:00–02:00)
      const splitRules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '22:00', endTime: '23:59', locationId: null },
        { profileId: settings.profileId, dayOfWeek: 2, startTime: '00:00', endTime: '02:00', locationId: null },
      ]

      const slots = generateAvailableSlots({
        settings,
        weeklyRules: splitRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-08',
        now: new Date('2026-09-07T12:00:00-03:00'),
      })

      expect(slots).toHaveLength(3)
      expect(slots[0].localDate).toBe('2026-09-07')
      expect(slots[0].localStartTime).toBe('22:00')
      expect(slots[1].localDate).toBe('2026-09-08')
      expect(slots[1].localStartTime).toBe('00:00')
      expect(slots[2].localDate).toBe('2026-09-08')
      expect(slots[2].localStartTime).toBe('01:00')
    })
  })

  describe('4. Global vs Location Semantics & Precedence (AUDIT C)', () => {
    const locMoema = '11111111-1111-4111-a111-111111111111'
    const locPinheiros = '22222222-2222-4222-a222-222222222222'

    const settings: AvailabilitySettings = {
      profileId: '99999999-9999-4999-a999-999999999999',
      enabled: true,
      timezone: 'America/Sao_Paulo',
      slotDurationMinutes: 60,
      slotIntervalMinutes: 60,
      minimumNoticeMinutes: 0,
      maximumAdvanceDays: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    }

    it('LOCATION OVERRIDE: Moema-specific schedule overrides global schedule for Moema query with ZERO duplicates', () => {
      // Global: Monday 09:00–18:00
      // Moema: Monday 14:00–20:00
      const rules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', locationId: null },
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '14:00', endTime: '20:00', locationId: locMoema },
      ]

      // Query Moema -> Must return ONLY Moema's 14:00–20:00 slots (6 slots: 14, 15, 16, 17, 18, 19)
      const moemaSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions: [],
        startDate: '2026-09-07', // Monday
        endDate: '2026-09-07',
        targetLocationId: locMoema,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      expect(moemaSlots).toHaveLength(6)
      expect(moemaSlots[0].localStartTime).toBe('14:00')
      expect(moemaSlots[5].localStartTime).toBe('19:00')
      // Ensure zero duplicates
      const startTimes = moemaSlots.map((s) => s.localStartTime)
      expect(new Set(startTimes).size).toBe(startTimes.length)

      // Query Pinheiros (has no custom schedule) -> falls back to Global 09:00–18:00 (9 slots)
      const pinheirosSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locPinheiros,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      expect(pinheirosSlots).toHaveLength(9)
      expect(pinheirosSlots[0].localStartTime).toBe('09:00')
      expect(pinheirosSlots[8].localStartTime).toBe('17:00')
    })

    it('location CLOSED_DAY overrides global weekly hours for that location', () => {
      const rules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', locationId: null },
      ]
      const exceptions: AvailabilityException[] = [
        {
          profileId: settings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'CLOSED_DAY',
          locationId: locMoema,
        },
      ]

      // Querying Moema -> CLOSED (0 slots)
      const moemaSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locMoema,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(moemaSlots).toEqual([])

      // Querying Pinheiros -> Still open with global hours
      const pinheirosSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locPinheiros,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(pinheirosSlots.length).toBeGreaterThan(0)
    })

    it('location CUSTOM_HOURS overrides global CLOSED_DAY for that location', () => {
      const rules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '09:00', endTime: '18:00', locationId: null },
      ]
      const exceptions: AvailabilityException[] = [
        // Globally closed on this date
        {
          profileId: settings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'CLOSED_DAY',
          locationId: null,
        },
        // BUT professional explicitly opens custom hours in Moema
        {
          profileId: settings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'CUSTOM_HOURS',
          startTime: '15:00',
          endTime: '18:00',
          locationId: locMoema,
        },
      ]

      // Moema -> Available during custom hours (3 slots: 15, 16, 17)
      const moemaSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locMoema,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(moemaSlots).toHaveLength(3)
      expect(moemaSlots[0].localStartTime).toBe('15:00')

      // Pinheiros -> Globally closed (0 slots)
      const pinheirosSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locPinheiros,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(pinheirosSlots).toEqual([])
    })

    it('global BLOCKED_INTERVAL subtracts from location-specific weekly hours', () => {
      const rules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '10:00', endTime: '18:00', locationId: locMoema },
      ]
      const exceptions: AvailabilityException[] = [
        {
          profileId: settings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'BLOCKED_INTERVAL',
          startTime: '12:00',
          endTime: '14:00',
          locationId: null, // Global block (e.g. personal lunch / doctor)
        },
      ]

      const slots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locMoema,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      // 10:00–18:00 with 12:00–14:00 blocked gives 10, 11, 14, 15, 16, 17 (6 slots)
      expect(slots).toHaveLength(6)
      const times = slots.map((s) => s.localStartTime)
      expect(times).toEqual(['10:00', '11:00', '14:00', '15:00', '16:00', '17:00'])
      expect(times).not.toContain('12:00')
      expect(times).not.toContain('13:00')
    })

    it('location BLOCKED_INTERVAL subtracts only from that location without affecting other locations', () => {
      const rules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '10:00', endTime: '16:00', locationId: null },
      ]
      const exceptions: AvailabilityException[] = [
        {
          profileId: settings.profileId,
          exceptionDate: '2026-09-07',
          exceptionType: 'BLOCKED_INTERVAL',
          startTime: '14:00',
          endTime: '16:00',
          locationId: locMoema, // Blocked only in Moema
        },
      ]

      // Moema has 14:00–16:00 blocked -> 10:00, 11:00, 12:00, 13:00 (4 slots)
      const moemaSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locMoema,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(moemaSlots).toHaveLength(4)

      // Pinheiros is NOT blocked -> 10:00, 11:00, 12:00, 13:00, 14:00, 15:00 (6 slots)
      const pinheirosSlots = generateAvailableSlots({
        settings,
        weeklyRules: rules,
        exceptions,
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        targetLocationId: locPinheiros,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })
      expect(pinheirosSlots).toHaveLength(6)
    })
  })

  describe('5. Exact Boundary Tests & Limits (AUDIT 14)', () => {
    const settings: AvailabilitySettings = {
      profileId: '11111111-1111-4111-a111-111111111111',
      enabled: true,
      timezone: 'America/Sao_Paulo',
      slotDurationMinutes: 60,
      slotIntervalMinutes: 60,
      minimumNoticeMinutes: 120, // 2 hours
      maximumAdvanceDays: 14, // 14 days
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    }

    const weeklyRules: WeeklyAvailabilityRule[] = [
      { profileId: settings.profileId, dayOfWeek: 1, startTime: '10:00', endTime: '14:00', locationId: null },
    ]

    it('notice exact boundary: slot start == now + notice is ALLOWED', () => {
      // Slot 10:00–11:00 starts at 10:00.
      // If now is exactly 08:00 (120 min prior), start == now + 120m -> ALLOWED
      const slots = generateAvailableSlots({
        settings,
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        now: new Date('2026-09-07T08:00:00-03:00'),
      })

      expect(slots[0].localStartTime).toBe('10:00')
    })

    it('notice exact boundary: slot start 1 minute before boundary is REJECTED', () => {
      // If now is 08:01, 10:00 slot is 119 min away (< 120 min notice) -> REJECTED
      const slots = generateAvailableSlots({
        settings,
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        now: new Date('2026-09-07T08:01:00-03:00'),
      })

      expect(slots[0].localStartTime).toBe('11:00')
    })

    it('maximum advance exact boundary: slots beyond max advance are REJECTED', () => {
      // 14 days advance max.
      // Querying 15 days out -> 0 slots
      const slots = generateAvailableSlots({
        settings,
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-28', // 21 days out
        endDate: '2026-09-28',
        now: new Date('2026-09-07T08:00:00-03:00'),
      })
      expect(slots).toEqual([])
    })

    it('rejects query ranges exceeding 90 days', () => {
      expect(() =>
        generateAvailableSlots({
          settings,
          weeklyRules,
          exceptions: [],
          startDate: '2026-01-01',
          endDate: '2026-05-01', // > 90 days
        })
      ).toThrow(/Date range exceeds maximum allowed limit of 90 days/)
    })
  })

  describe('6. Busy Interval Adapter Boundary (AUDIT 17)', () => {
    it('subtracts busy intervals from available inquiry slots', () => {
      const settings: AvailabilitySettings = {
        profileId: '11111111-1111-4111-a111-111111111111',
        enabled: true,
        timezone: 'America/Sao_Paulo',
        slotDurationMinutes: 60,
        slotIntervalMinutes: 60,
        minimumNoticeMinutes: 0,
        maximumAdvanceDays: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      }

      const weeklyRules: WeeklyAvailabilityRule[] = [
        { profileId: settings.profileId, dayOfWeek: 1, startTime: '10:00', endTime: '14:00', locationId: null },
      ]

      // Busy interval: 11:00 to 12:00
      const busyIntervals = [
        {
          startIso: '2026-09-07T11:00:00-03:00',
          endIso: '2026-09-07T12:00:00-03:00',
          source: 'INTERNAL_INQUIRY' as const,
        },
      ]

      const slots = generateAvailableSlots({
        settings,
        weeklyRules,
        exceptions: [],
        startDate: '2026-09-07',
        endDate: '2026-09-07',
        busyIntervals,
        now: new Date('2026-09-07T05:00:00-03:00'),
      })

      // 10:00, 12:00, 13:00 (11:00 is blocked by busy interval)
      expect(slots).toHaveLength(3)
      const times = slots.map((s) => s.localStartTime)
      expect(times).toEqual(['10:00', '12:00', '13:00'])
      expect(times).not.toContain('11:00')
    })
  })

  describe('7. Server Action Authority & Malicious Substitution (AUDIT 8, 11, 12)', () => {
    const mockFrom = vi.fn()
    const mockRpc = vi.fn()
    const mockAdmin = { from: mockFrom, rpc: mockRpc }

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)
    })

    it('rejects Advertiser A attempting to modify Profile B (malicious substitution)', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'advertiser-a-id',
        role: 'ADVERTISER',
        status: 'ACTIVE',
      } as any)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'profile-b-id', account_user_id: 'advertiser-b-id' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const res = await saveAvailabilitySettingsAction('profile-b-id', {
        slotDurationMinutes: 45,
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/você não possui permissão/)
    })

    it('rejects CLIENT role from modifying professional availability settings', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'client-user-id',
        role: 'CLIENT',
        status: 'ACTIVE',
      } as any)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'some-profile-id', account_user_id: 'other-id' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const res = await saveAvailabilitySettingsAction('some-profile-id', {
        slotDurationMinutes: 60,
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/você não possui permissão/)
    })

    it('rejects unauthenticated caller attempting to call server actions', async () => {
      vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT: /login'))

      await expect(
        saveAvailabilitySettingsAction('any-profile-id', { slotDurationMinutes: 60 })
      ).resolves.toEqual({
        success: false,
        error: 'NEXT_REDIRECT: /login',
      })
    })

    it('rejects invalid IANA timezones in saveAvailabilitySettingsAction', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'owner-id',
        role: 'ADVERTISER',
        status: 'ACTIVE',
      } as any)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'owner-profile-id', account_user_id: 'owner-id' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const res = await saveAvailabilitySettingsAction('owner-profile-id', {
        timezone: 'Foo/Bar',
      })

      expect(res.success).toBe(false)
      expect(res.error).toMatch(/Fuso horário inválido/)
    })

    it('rejects out-of-bounds settings values in saveAvailabilitySettingsAction', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'owner-id',
        role: 'ADVERTISER',
        status: 'ACTIVE',
      } as any)

      mockFrom.mockImplementation((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'owner-profile-id', account_user_id: 'owner-id' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      // duration > 480
      const r1 = await saveAvailabilitySettingsAction('owner-profile-id', { slotDurationMinutes: 500 })
      expect(r1.success).toBe(false)
      expect(r1.error).toMatch(/A duração do intervalo deve ser entre 1 e 480/)

      // interval > 240
      const r2 = await saveAvailabilitySettingsAction('owner-profile-id', { slotIntervalMinutes: 300 })
      expect(r2.success).toBe(false)
      expect(r2.error).toMatch(/A frequência entre intervalos deve ser entre 1 e 240/)

      // advance > 90
      const r3 = await saveAvailabilitySettingsAction('owner-profile-id', { maximumAdvanceDays: 100 })
      expect(r3.success).toBe(false)
      expect(r3.error).toMatch(/A antecedência máxima deve ser entre 1 e 90/)

      // buffer > 120
      const r4 = await saveAvailabilitySettingsAction('owner-profile-id', { bufferBeforeMinutes: 150 })
      expect(r4.success).toBe(false)
      expect(r4.error).toMatch(/O tempo de preparação anterior deve ser entre 0 e 120/)
    })
  })

  describe('8. Public Slot Privacy & Fail-Closed Publication Gate (AUDIT 9, 10)', () => {
    const mockFrom = vi.fn()
    const mockRpc = vi.fn()
    const mockAdmin = { from: mockFrom, rpc: mockRpc }

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)
    })

    it('public slot DTO does NOT expose private raw table rows, exception IDs, buffers, or account IDs', async () => {
      const profileId = '11111111-1111-4111-a111-111111111111'

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
                    data: { id: 'loc-moema-uuid', slug: 'moema', active: true },
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
                  maybeSingle: async () => ({
                    data: { profile_id: profileId, location_id: 'loc-moema-uuid' },
                    error: null,
                  }),
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
                    slot_interval_minutes: 60,
                    minimum_notice_minutes: 0,
                    maximum_advance_days: 30,
                    buffer_before_minutes: 15,
                    buffer_after_minutes: 15,
                    created_at: '2026-09-06T00:00:00Z',
                    updated_at: '2026-09-06T00:00:00Z',
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
                  order: async () => ({
                    data: [
                      {
                        id: 'private-rule-uuid-123',
                        profile_id: profileId,
                        day_of_week: 1,
                        start_time: '10:00',
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
          }
        }
        if (table === 'professional_availability_exceptions') {
          const queryBuilder: any = {
            gte: () => queryBuilder,
            lte: () => queryBuilder,
            order: () => ({
              order: async () => ({
                data: [],
                error: null,
              }),
            }),
          }
          return {
            select: () => ({
              eq: () => queryBuilder,
            }),
          }
        }
        return {}
      })

      const slots = await getPublicAvailableSlots({
        profileSlug: 'eligible-model',
        startDate: '2026-09-14',
        endDate: '2026-09-14',
        locationSlug: 'moema',
      })

      expect(slots.length).toBeGreaterThan(0)
      for (const slot of slots) {
        expect(slot).toHaveProperty('slotRef')
        expect(slot).toHaveProperty('startIso')
        expect(slot).toHaveProperty('endIso')
        expect(slot).toHaveProperty('localDate')
        expect(slot).toHaveProperty('localStartTime')
        expect(slot).toHaveProperty('localEndTime')
        expect(slot).toHaveProperty('timezone')
        expect(slot).toHaveProperty('locationSlug', 'moema')

        // Internal identifier rules: NO profileId, NO locationId, NO slotId embedding UUIDs
        expect((slot as any).profileId).toBeUndefined()
        expect((slot as any).locationId).toBeUndefined()
        expect((slot as any).slotId).toBeUndefined()

        // Privacy checks: must NEVER leak internal or configuration fields
        expect((slot as any).account_user_id).toBeUndefined()
        expect((slot as any).accountUserId).toBeUndefined()
        expect((slot as any).bufferBeforeMinutes).toBeUndefined()
        expect((slot as any).buffer_before_minutes).toBeUndefined()
        expect((slot as any).rules).toBeUndefined()
        expect((slot as any).exceptions).toBeUndefined()
        expect((slot as any).ruleId).toBeUndefined()
        expect((slot as any).settingsId).toBeUndefined()

        // Strict JSON serialization assertion: stringified output contains ZERO UUIDs
        const serialized = JSON.stringify(slot)
        expect(serialized).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
      }
    })

    it('revalidateSlotAvailability: canonical server revalidation enforces real availability', async () => {
      const profileId = '11111111-1111-4111-a111-111111111111'

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
                    created_at: '2026-09-06T00:00:00Z',
                    updated_at: '2026-09-06T00:00:00Z',
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
                  order: async () => ({
                    data: [
                      {
                        id: 'rule-1',
                        profile_id: profileId,
                        day_of_week: 1,
                        start_time: '20:00',
                        end_time: '22:00',
                        location_id: null,
                        created_at: '2026-09-06T00:00:00Z',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'professional_availability_exceptions') {
          const qb: any = {
            gte: () => qb,
            lte: () => qb,
            order: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }
          return { select: () => ({ eq: () => qb }) }
        }
        return {}
      })

      // Valid available slot: 2026-09-07 (Monday) 20:00–21:00
      const validCheck = await revalidateSlotAvailability({
        profileSlug: 'eligible-model',
        startIso: '2026-09-07T20:00:00-03:00',
        endIso: '2026-09-07T21:00:00-03:00',
      })
      expect(validCheck.available).toBe(true)
      expect(validCheck.slot?.localStartTime).toBe('20:00')

      // Non-existent / unavailable slot: 2026-09-07 23:00–24:00
      const invalidCheck = await revalidateSlotAvailability({
        profileSlug: 'eligible-model',
        startIso: '2026-09-07T23:00:00-03:00',
        endIso: '2026-09-08T00:00:00-03:00',
      })
      expect(invalidCheck.available).toBe(false)
      expect(invalidCheck.reason).toBe('SLOT_UNAVAILABLE')
    })

    it('fails closed when profile is not in v_publication_eligible_profiles', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'v_publication_eligible_profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        return {}
      })

      const slots = await getPublicAvailableSlots({
        profileSlug: 'ineligible-profile',
        startDate: '2026-09-07',
        endDate: '2026-09-07',
      })

      expect(slots).toEqual([])
    })
  })
})

