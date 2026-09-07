'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import { logger } from '@/modules/observability/logger'
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getAvailabilityExceptions,
  getAvailabilitySettings,
  saveWeeklyAvailability,
  updateAvailabilitySettings,
} from './dal'
import { getLocalDateInTimezone, isValidIanaTimezone } from './engine'
import { assertProfileOwnership } from '@/modules/profiles/guards'
import type { AvailabilityException, AvailabilitySettings, DayOfWeek, WeeklyAvailabilityRule } from './types'

export interface AgendaActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Asserts that a specified locationId belongs to the professional profile's active service areas.
 */
async function assertLocationOwnership(profileId: string, locationId: string | null | undefined): Promise<void> {
  if (!locationId) return
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('professional_profile_locations')
    .select('location_id')
    .eq('profile_id', profileId)
    .eq('location_id', locationId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Região de atendimento não associada ao seu perfil.')
  }
}

/**
 * Updates availability settings for the caller's professional profile.
 */
export async function saveAvailabilitySettingsAction(
  profileId: string,
  settings: Partial<Omit<AvailabilitySettings, 'profileId' | 'createdAt' | 'updatedAt'>>
): Promise<AgendaActionResult<AvailabilitySettings>> {
  try {
    await assertProfileOwnership(profileId)

    if (settings.slotDurationMinutes !== undefined && (settings.slotDurationMinutes <= 0 || settings.slotDurationMinutes > 480)) {
      return { success: false, error: 'A duração do intervalo deve ser entre 1 e 480 minutos.' }
    }

    if (settings.slotIntervalMinutes !== undefined && (settings.slotIntervalMinutes <= 0 || settings.slotIntervalMinutes > 240)) {
      return { success: false, error: 'A frequência entre intervalos deve ser entre 1 e 240 minutos.' }
    }

    if (settings.minimumNoticeMinutes !== undefined && (settings.minimumNoticeMinutes < 0 || settings.minimumNoticeMinutes > 10080)) {
      return { success: false, error: 'A antecedência mínima não pode exceder 7 dias.' }
    }

    if (settings.maximumAdvanceDays !== undefined && (settings.maximumAdvanceDays <= 0 || settings.maximumAdvanceDays > 90)) {
      return { success: false, error: 'A antecedência máxima deve ser entre 1 e 90 dias.' }
    }

    if (settings.bufferBeforeMinutes !== undefined && (settings.bufferBeforeMinutes < 0 || settings.bufferBeforeMinutes > 120)) {
      return { success: false, error: 'O tempo de preparação anterior deve ser entre 0 e 120 minutos.' }
    }

    if (settings.bufferAfterMinutes !== undefined && (settings.bufferAfterMinutes < 0 || settings.bufferAfterMinutes > 120)) {
      return { success: false, error: 'O tempo de preparação posterior deve ser entre 0 e 120 minutos.' }
    }

    if (settings.timezone !== undefined && !isValidIanaTimezone(settings.timezone)) {
      return { success: false, error: 'Fuso horário inválido. Forneça um identificador IANA válido.' }
    }

    const updated = await updateAvailabilitySettings(profileId, settings)
    return { success: true, data: updated }
  } catch (err: unknown) {
    logger.error('agenda.availability.settings_save_failed', {
      subsystem: 'AGENDA',
      metadata: { profileId },
      error: err,
    })
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar configurações de disponibilidade.'
    return { success: false, error: msg }
  }
}

/**
 * Atomically replaces the recurring weekly schedule rules for the profile.
 */
export async function saveWeeklyScheduleAction(
  profileId: string,
  rules: Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string; locationId?: string | null }>
): Promise<AgendaActionResult<WeeklyAvailabilityRule[]>> {
  try {
    await assertProfileOwnership(profileId)

    // Validate that all referenced locationIds belong to this profile's active service areas
    const locationIds = Array.from(new Set(rules.map((r) => r.locationId).filter(Boolean))) as string[]
    for (const locId of locationIds) {
      await assertLocationOwnership(profileId, locId)
    }

    for (const rule of rules) {
      if (rule.dayOfWeek < 0 || rule.dayOfWeek > 6) {
        return { success: false, error: 'Dia da semana inválido.' }
      }
      if (!rule.startTime || !rule.endTime || rule.startTime >= rule.endTime) {
        return { success: false, error: `Horário de início (${rule.startTime}) deve ser anterior ao fim (${rule.endTime}).` }
      }
    }

    const saved = await saveWeeklyAvailability(profileId, rules)
    return { success: true, data: saved }
  } catch (err: unknown) {
    logger.error('agenda.availability.weekly_save_failed', {
      subsystem: 'AGENDA',
      metadata: { profileId, ruleCount: rules.length },
      error: err,
    })
    const msg = err instanceof Error ? err.message : 'Erro ao salvar horários da semana.'
    return { success: false, error: msg }
  }
}

/**
 * Creates an exception (closed day, blocked interval, or custom hours).
 */
export async function createAvailabilityExceptionAction(
  profileId: string,
  exceptionInput: {
    exceptionDate: string
    exceptionType: AvailabilityException['exceptionType']
    startTime?: string | null
    endTime?: string | null
    locationId?: string | null
  }
): Promise<AgendaActionResult<AvailabilityException>> {
  try {
    await assertProfileOwnership(profileId)

    if (exceptionInput.locationId) {
      await assertLocationOwnership(profileId, exceptionInput.locationId)
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(exceptionInput.exceptionDate)) {
      return { success: false, error: 'Data da exceção inválida (formato esperado: YYYY-MM-DD).' }
    }

    if (exceptionInput.exceptionType === 'CLOSED_DAY') {
      if (exceptionInput.startTime || exceptionInput.endTime) {
        return { success: false, error: 'Dias fechados não devem conter horários de início e fim.' }
      }
    } else {
      if (!exceptionInput.startTime || !exceptionInput.endTime || exceptionInput.startTime >= exceptionInput.endTime) {
        return { success: false, error: 'Horário de início deve ser anterior ao horário de término.' }
      }
    }

    const created = await createAvailabilityException({
      profileId,
      exceptionDate: exceptionInput.exceptionDate,
      exceptionType: exceptionInput.exceptionType,
      startTime: exceptionInput.startTime,
      endTime: exceptionInput.endTime,
      locationId: exceptionInput.locationId,
    })

    return { success: true, data: created }
  } catch (err: unknown) {
    logger.error('agenda.availability.exception_save_failed', {
      subsystem: 'AGENDA',
      metadata: { profileId, exceptionType: exceptionInput.exceptionType },
      error: err,
    })
    const msg = err instanceof Error ? err.message : 'Erro ao criar exceção de disponibilidade.'
    return { success: false, error: msg }
  }
}

/**
 * Deletes an availability exception.
 */
export async function deleteAvailabilityExceptionAction(
  profileId: string,
  exceptionId: string
): Promise<AgendaActionResult<void>> {
  try {
    await assertProfileOwnership(profileId)
    const deleted = await deleteAvailabilityException(exceptionId, profileId)
    if (!deleted) {
      return { success: false, error: 'Exceção não encontrada ou já removida.' }
    }
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao remover exceção.'
    return { success: false, error: msg }
  }
}

/**
 * Quick Action: Marks TODAY as unavailable (CLOSED_DAY) in the professional's timezone.
 * Idempotent: if a CLOSED_DAY already exists for today, returns existing exception without error.
 */
export async function setUnavailableTodayAction(
  profileId: string
): Promise<AgendaActionResult<AvailabilityException>> {
  try {
    await assertProfileOwnership(profileId)
    const settings = await getAvailabilitySettings(profileId)
    const todayDate = getLocalDateInTimezone(new Date(), settings.timezone)

    const existingExceptions = await getAvailabilityExceptions(profileId, todayDate, todayDate)
    const existingClosedDay = existingExceptions.find(
      (ex) => ex.exceptionDate === todayDate && ex.exceptionType === 'CLOSED_DAY' && !ex.locationId
    )

    if (existingClosedDay) {
      return { success: true, data: existingClosedDay }
    }

    const created = await createAvailabilityException({
      profileId,
      exceptionDate: todayDate,
      exceptionType: 'CLOSED_DAY',
      locationId: null,
    })

    return { success: true, data: created }
  } catch (err: unknown) {
    logger.error('agenda.availability.quick_unavailable_failed', {
      subsystem: 'AGENDA',
      metadata: { profileId },
      error: err,
    })
    const msg = err instanceof Error ? err.message : 'Erro ao marcar hoje como indisponível.'
    return { success: false, error: msg }
  }
}

/**
 * Quick Action: Restores TODAY's availability by removing any global CLOSED_DAY exception for today.
 */
export async function restoreTodayAvailabilityAction(
  profileId: string
): Promise<AgendaActionResult<void>> {
  try {
    await assertProfileOwnership(profileId)
    const settings = await getAvailabilitySettings(profileId)
    const todayDate = getLocalDateInTimezone(new Date(), settings.timezone)

    const existingExceptions = await getAvailabilityExceptions(profileId, todayDate, todayDate)
    const todayClosedDays = existingExceptions.filter(
      (ex) => ex.exceptionDate === todayDate && ex.exceptionType === 'CLOSED_DAY' && !ex.locationId
    )

    for (const ex of todayClosedDays) {
      if (ex.id) {
        await deleteAvailabilityException(ex.id, profileId)
      }
    }

    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao restaurar disponibilidade de hoje.'
    return { success: false, error: msg }
  }
}
