import { describe, it, expect, afterAll } from 'vitest'
import { getTestSupabaseAdmin } from '@/tests/helpers/supabase-test-client'
import {
  getAvailabilitySettings,
  updateAvailabilitySettings,
  getWeeklyAvailability,
  saveWeeklyAvailability,
  getAvailabilityExceptions,
  createAvailabilityException,
  deleteAvailabilityException,
  getProfessionalAvailabilityDashboardDTO,
} from '@/modules/agenda/dal'
import { getLocalDateInTimezone } from '@/modules/agenda/engine'

describe('PX4 — Live Supabase DEV Runtime Integration', () => {
  const admin = getTestSupabaseAdmin()
  let testProfileId: string
  let initialWeeklyRules: any[] = []
  let initialExceptions: any[] = []
  let initialSettings: any = null
  let createdExceptionIds: string[] = []

  it('connects to DEV and resolves an existing professional profile', async () => {
    const { data: profile, error } = await admin
      .from('professional_profiles')
      .select('id, slug')
      .limit(1)
      .maybeSingle()

    expect(error).toBeNull()
    expect(profile).not.toBeNull()
    testProfileId = profile!.id

    // Snapshot initial state
    initialSettings = await getAvailabilitySettings(testProfileId)
    initialWeeklyRules = await getWeeklyAvailability(testProfileId)
    initialExceptions = await getAvailabilityExceptions(testProfileId)
  })

  it('updates and persists settings in DEV Supabase', async () => {
    const updated = await updateAvailabilitySettings(testProfileId, {
      enabled: true,
      slotDurationMinutes: 60,
      slotIntervalMinutes: 30,
      minimumNoticeMinutes: 120,
      maximumAdvanceDays: 14,
    })

    expect(updated.enabled).toBe(true)
    expect(updated.slotDurationMinutes).toBe(60)
    expect(updated.slotIntervalMinutes).toBe(30)
  })

  it('atomically saves weekly availability rules in DEV via RPC', async () => {
    const testRules = [
      { dayOfWeek: 1 as const, startTime: '10:00', endTime: '13:00', locationId: null },
      { dayOfWeek: 1 as const, startTime: '14:00', endTime: '18:00', locationId: null },
    ]

    const saved = await saveWeeklyAvailability(testProfileId, testRules)
    expect(saved).toHaveLength(2)
    expect(saved[0].startTime).toBe('10:00')
    expect(saved[1].startTime).toBe('14:00')
  })

  it('creates and verifies CLOSED_DAY on today in DEV (Quick Action simulation)', async () => {
    const todayStr = getLocalDateInTimezone(new Date(), 'America/Sao_Paulo')

    const ex = await createAvailabilityException({
      profileId: testProfileId,
      exceptionDate: todayStr,
      exceptionType: 'CLOSED_DAY',
      locationId: null,
    })

    expect(ex.id).toBeDefined()
    expect(ex.exceptionDate).toBe(todayStr)
    expect(ex.exceptionType).toBe('CLOSED_DAY')
    createdExceptionIds.push(ex.id!)
  })

  it('creates and verifies BLOCKED_INTERVAL in DEV', async () => {
    const ex = await createAvailabilityException({
      profileId: testProfileId,
      exceptionDate: '2026-11-25',
      exceptionType: 'BLOCKED_INTERVAL',
      startTime: '14:00',
      endTime: '16:00',
    })

    expect(ex.id).toBeDefined()
    expect(ex.startTime).toBe('14:00')
    expect(ex.endTime).toBe('16:00')
    createdExceptionIds.push(ex.id!)
  })

  it('retrieves assembled Dashboard DTO and verifies preview generation', async () => {
    const dto = await getProfessionalAvailabilityDashboardDTO(testProfileId)
    expect(dto.profileId).toBe(testProfileId)
    expect(dto.settings.enabled).toBe(true)
    expect(dto.isUnavailableToday).toBe(true) // because we created CLOSED_DAY on today
    expect(Array.isArray(dto.previewSlots)).toBe(true)
  })

  afterAll(async () => {
    if (!testProfileId) return

    // Cleanup created exceptions
    for (const id of createdExceptionIds) {
      await deleteAvailabilityException(id, testProfileId)
    }

    // Restore original weekly availability
    await saveWeeklyAvailability(
      testProfileId,
      initialWeeklyRules.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        locationId: r.locationId,
      }))
    )

    // Restore original settings
    if (initialSettings) {
      await updateAvailabilitySettings(testProfileId, {
        enabled: initialSettings.enabled,
        timezone: initialSettings.timezone,
        slotDurationMinutes: initialSettings.slotDurationMinutes,
        slotIntervalMinutes: initialSettings.slotIntervalMinutes,
        minimumNoticeMinutes: initialSettings.minimumNoticeMinutes,
        maximumAdvanceDays: initialSettings.maximumAdvanceDays,
        bufferBeforeMinutes: initialSettings.bufferBeforeMinutes,
        bufferAfterMinutes: initialSettings.bufferAfterMinutes,
      })
    }

    // Verify cleanup: createdExceptionIds are completely gone
    const finalExceptions = await getAvailabilityExceptions(testProfileId)
    const remainingTestExceptions = finalExceptions.filter((e) =>
      createdExceptionIds.includes(e.id!)
    )
    expect(remainingTestExceptions).toHaveLength(0)
  })
})
