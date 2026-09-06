import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createAvailabilityExceptionAction,
  deleteAvailabilityExceptionAction,
} from '@/modules/agenda/actions'
import { generateAvailableSlots } from '@/modules/agenda/engine'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import type { AvailabilityException, AvailabilitySettings, WeeklyAvailabilityRule } from '@/modules/agenda/types'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(),
}))

describe('PX4 — Exception Management & Semantics', () => {
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
      if (table === 'professional_profile_locations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { profile_id: profileId, location_id: 'loc-1' }, error: null }),
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
                const initialLen = storedExceptions.length
                storedExceptions = storedExceptions.filter((e) => e.id !== id)
                return { error: null, count: initialLen - storedExceptions.length }
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

  it('creates CLOSED_DAY without times', async () => {
    const res = await createAvailabilityExceptionAction(profileId, {
      exceptionDate: '2026-09-15',
      exceptionType: 'CLOSED_DAY',
    })

    expect(res.success).toBe(true)
    expect(res.data?.exceptionType).toBe('CLOSED_DAY')
    expect(res.data?.startTime).toBeNull()
    expect(res.data?.endTime).toBeNull()
  })

  it('rejects CLOSED_DAY if times are erroneously provided', async () => {
    const res = await createAvailabilityExceptionAction(profileId, {
      exceptionDate: '2026-09-15',
      exceptionType: 'CLOSED_DAY',
      startTime: '09:00',
      endTime: '12:00',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Dias fechados não devem conter horários')
  })

  it('creates BLOCKED_INTERVAL with valid start and end times', async () => {
    const res = await createAvailabilityExceptionAction(profileId, {
      exceptionDate: '2026-09-16',
      exceptionType: 'BLOCKED_INTERVAL',
      startTime: '13:00',
      endTime: '15:00',
    })

    expect(res.success).toBe(true)
    expect(res.data?.startTime).toBe('13:00')
    expect(res.data?.endTime).toBe('15:00')
  })

  it('creates CUSTOM_HOURS with valid start and end times', async () => {
    const res = await createAvailabilityExceptionAction(profileId, {
      exceptionDate: '2026-09-17',
      exceptionType: 'CUSTOM_HOURS',
      startTime: '10:00',
      endTime: '14:00',
    })

    expect(res.success).toBe(true)
    expect(res.data?.startTime).toBe('10:00')
    expect(res.data?.endTime).toBe('14:00')
  })

  it('rejects invalid interval where startTime >= endTime', async () => {
    const res = await createAvailabilityExceptionAction(profileId, {
      exceptionDate: '2026-09-16',
      exceptionType: 'BLOCKED_INTERVAL',
      startTime: '15:00',
      endTime: '13:00',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('anterior ao horário de término')
  })

  it('deletes an upcoming exception with server authorization', async () => {
    storedExceptions.push({
      id: 'ex-delete-me',
      profile_id: profileId,
      exception_date: '2026-09-20',
      exception_type: 'CLOSED_DAY',
      start_time: null,
      end_time: null,
      location_id: null,
      created_at: new Date().toISOString(),
    } as any)

    const delRes = await deleteAvailabilityExceptionAction(profileId, 'ex-delete-me')
    expect(delRes.success).toBe(true)
    expect(storedExceptions).toHaveLength(0)
  })

  it('custom hours replace standard weekly hours on that date', () => {
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

    // Standard Monday: 09:00–12:00 (3 slots)
    const rules: WeeklyAvailabilityRule[] = [
      { id: 'r1', profileId, dayOfWeek: 1, startTime: '09:00', endTime: '12:00', locationId: null },
    ]

    // Custom hours on Monday 2026-09-07: 15:00–17:00 (2 slots)
    const exceptions: AvailabilityException[] = [
      { id: 'ex-1', profileId, exceptionDate: '2026-09-07', exceptionType: 'CUSTOM_HOURS', startTime: '15:00', endTime: '17:00' },
    ]

    const slots = generateAvailableSlots({
      settings,
      weeklyRules: rules,
      exceptions,
      startDate: '2026-09-07',
      endDate: '2026-09-07',
      now: new Date('2026-09-01T00:00:00Z'),
    })

    // Standard 09:00-12:00 slots must NOT be generated; ONLY custom hours 15:00 and 16:00
    expect(slots).toHaveLength(2)
    expect(slots[0].localStartTime).toBe('15:00')
    expect(slots[1].localStartTime).toBe('16:00')
  })

  it('blocked interval removes candidate slots intersecting with it', () => {
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

    // Standard Monday: 09:00–14:00 (5 slots: 09, 10, 11, 12, 13)
    const rules: WeeklyAvailabilityRule[] = [
      { id: 'r1', profileId, dayOfWeek: 1, startTime: '09:00', endTime: '14:00', locationId: null },
    ]

    // Block 11:00–13:00
    const exceptions: AvailabilityException[] = [
      { id: 'ex-1', profileId, exceptionDate: '2026-09-07', exceptionType: 'BLOCKED_INTERVAL', startTime: '11:00', endTime: '13:00' },
    ]

    const slots = generateAvailableSlots({
      settings,
      weeklyRules: rules,
      exceptions,
      startDate: '2026-09-07',
      endDate: '2026-09-07',
      now: new Date('2026-09-01T00:00:00Z'),
    })

    const times = slots.map((s) => s.localStartTime)
    // 09:00, 10:00, 13:00 remain; 11:00 and 12:00 are blocked
    expect(times).toEqual(['09:00', '10:00', '13:00'])
  })
})
