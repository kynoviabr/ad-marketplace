import { describe, it, expect } from 'vitest'
import { generateAvailableSlots } from '@/modules/agenda/engine'
import type { AvailabilitySettings, WeeklyAvailabilityRule } from '@/modules/agenda/types'

describe('PX4 — Upcoming Availability Preview Generation', () => {
  const profileId = '11111111-1111-4111-a111-111111111111'

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

  // Recurring rules: Mon through Fri, 10:00–12:00 (2 slots/day)
  const rules: WeeklyAvailabilityRule[] = [
    { id: '1', profileId, dayOfWeek: 1, startTime: '10:00', endTime: '12:00', locationId: null },
    { id: '2', profileId, dayOfWeek: 2, startTime: '10:00', endTime: '12:00', locationId: null },
    { id: '3', profileId, dayOfWeek: 3, startTime: '10:00', endTime: '12:00', locationId: null },
    { id: '4', profileId, dayOfWeek: 4, startTime: '10:00', endTime: '12:00', locationId: null },
    { id: '5', profileId, dayOfWeek: 5, startTime: '10:00', endTime: '12:00', locationId: null },
  ]

  it('generates chronologically sorted upcoming slots for preview', () => {
    // 2026-09-07 is Monday
    const slots = generateAvailableSlots({
      settings,
      weeklyRules: rules,
      exceptions: [],
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      now: new Date('2026-09-01T00:00:00Z'),
    })

    expect(slots.length).toBeGreaterThan(0)

    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].startIso >= slots[i - 1].startIso).toBe(true)
    }
  })

  it('preview is empty when availability is disabled', () => {
    const disabledSettings = { ...settings, enabled: false }
    const slots = generateAvailableSlots({
      settings: disabledSettings,
      weeklyRules: rules,
      exceptions: [],
      startDate: '2026-09-07',
      endDate: '2026-09-13',
      now: new Date('2026-09-01T00:00:00Z'),
    })

    expect(slots).toHaveLength(0)
  })

  it('guarantees zero duplicate slots in the preview window', () => {
    // Duplicate overlapping rule added
    const redundantRules: WeeklyAvailabilityRule[] = [
      ...rules,
      { id: '6', profileId, dayOfWeek: 1, startTime: '10:00', endTime: '12:00', locationId: null },
    ]

    const slots = generateAvailableSlots({
      settings,
      weeklyRules: redundantRules,
      exceptions: [],
      startDate: '2026-09-07',
      endDate: '2026-09-07',
      now: new Date('2026-09-01T00:00:00Z'),
    })

    const keys = slots.map((s) => `${s.localDate}:${s.localStartTime}`)
    const uniqueKeys = new Set(keys)
    expect(keys.length).toBe(uniqueKeys.size)
  })
})
