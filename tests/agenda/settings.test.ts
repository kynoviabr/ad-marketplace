import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveAvailabilitySettingsAction } from '@/modules/agenda/actions'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import type { AvailabilitySettings } from '@/modules/agenda/types'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(),
}))

describe('PX4 — Availability Settings Logic & Validation', () => {
  const profileId = '11111111-1111-4111-a111-111111111111'
  const accountId = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'

  let currentSettings: AvailabilitySettings

  beforeEach(() => {
    vi.clearAllMocks()
    currentSettings = {
      profileId,
      enabled: true,
      timezone: 'America/Sao_Paulo',
      slotDurationMinutes: 60,
      slotIntervalMinutes: 30,
      minimumNoticeMinutes: 120,
      maximumAdvanceDays: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    }

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
                  enabled: currentSettings.enabled,
                  timezone: currentSettings.timezone,
                  slot_duration_minutes: currentSettings.slotDurationMinutes,
                  slot_interval_minutes: currentSettings.slotIntervalMinutes,
                  minimum_notice_minutes: currentSettings.minimumNoticeMinutes,
                  maximum_advance_days: currentSettings.maximumAdvanceDays,
                  buffer_before_minutes: currentSettings.bufferBeforeMinutes,
                  buffer_after_minutes: currentSettings.bufferAfterMinutes,
                },
                error: null,
              }),
            }),
          }),
          upsert: (payload: any) => ({
            select: () => ({
              single: async () => {
                currentSettings = {
                  profileId,
                  enabled: payload.enabled,
                  timezone: payload.timezone,
                  slotDurationMinutes: payload.slot_duration_minutes,
                  slotIntervalMinutes: payload.slot_interval_minutes,
                  minimumNoticeMinutes: payload.minimum_notice_minutes,
                  maximumAdvanceDays: payload.maximum_advance_days,
                  bufferBeforeMinutes: payload.buffer_before_minutes,
                  bufferAfterMinutes: payload.buffer_after_minutes,
                }
                return {
                  data: {
                    profile_id: profileId,
                    enabled: currentSettings.enabled,
                    timezone: currentSettings.timezone,
                    slot_duration_minutes: currentSettings.slotDurationMinutes,
                    slot_interval_minutes: currentSettings.slotIntervalMinutes,
                    minimum_notice_minutes: currentSettings.minimumNoticeMinutes,
                    maximum_advance_days: currentSettings.maximumAdvanceDays,
                    buffer_before_minutes: currentSettings.bufferBeforeMinutes,
                    buffer_after_minutes: currentSettings.bufferAfterMinutes,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }
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

  it('updates master enabled/disabled toggle cleanly without clearing other values', async () => {
    const res = await saveAvailabilitySettingsAction(profileId, { enabled: false })
    expect(res.success).toBe(true)
    expect(res.data?.enabled).toBe(false)
    // Preserves other fields
    expect(res.data?.slotDurationMinutes).toBe(60)
    expect(res.data?.timezone).toBe('America/Sao_Paulo')
  })

  it('validates duration bounds (1..480 minutes)', async () => {
    const resUnder = await saveAvailabilitySettingsAction(profileId, { slotDurationMinutes: 0 })
    expect(resUnder.success).toBe(false)
    expect(resUnder.error).toContain('entre 1 e 480')

    const resOver = await saveAvailabilitySettingsAction(profileId, { slotDurationMinutes: 500 })
    expect(resOver.success).toBe(false)
    expect(resOver.error).toContain('entre 1 e 480')

    const resValid = await saveAvailabilitySettingsAction(profileId, { slotDurationMinutes: 90 })
    expect(resValid.success).toBe(true)
    expect(resValid.data?.slotDurationMinutes).toBe(90)
  })

  it('validates interval bounds (1..240 minutes)', async () => {
    const resUnder = await saveAvailabilitySettingsAction(profileId, { slotIntervalMinutes: 0 })
    expect(resUnder.success).toBe(false)

    const resValid = await saveAvailabilitySettingsAction(profileId, { slotIntervalMinutes: 45 })
    expect(resValid.success).toBe(true)
    expect(resValid.data?.slotIntervalMinutes).toBe(45)
  })

  it('validates maximum advance days bounds (1..90 days)', async () => {
    const resOver = await saveAvailabilitySettingsAction(profileId, { maximumAdvanceDays: 91 })
    expect(resOver.success).toBe(false)
    expect(resOver.error).toContain('entre 1 e 90')

    const resValid = await saveAvailabilitySettingsAction(profileId, { maximumAdvanceDays: 60 })
    expect(resValid.success).toBe(true)
    expect(resValid.data?.maximumAdvanceDays).toBe(60)
  })

  it('validates buffer bounds (0..120 minutes)', async () => {
    const resOver = await saveAvailabilitySettingsAction(profileId, { bufferBeforeMinutes: 125 })
    expect(resOver.success).toBe(false)
    expect(resOver.error).toContain('entre 0 e 120')

    const resValid = await saveAvailabilitySettingsAction(profileId, {
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 30,
    })
    expect(resValid.success).toBe(true)
    expect(resValid.data?.bufferBeforeMinutes).toBe(15)
    expect(resValid.data?.bufferAfterMinutes).toBe(30)
  })

  it('validates IANA timezone identifiers', async () => {
    const resInvalid = await saveAvailabilitySettingsAction(profileId, { timezone: 'Fake/Timezone' })
    expect(resInvalid.success).toBe(false)
    expect(resInvalid.error).toContain('Fuso horário inválido')

    const resValid = await saveAvailabilitySettingsAction(profileId, { timezone: 'America/Sao_Paulo' })
    expect(resValid.success).toBe(true)
  })
})
