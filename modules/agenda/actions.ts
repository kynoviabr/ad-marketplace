'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import {
  createAvailabilityException,
  deleteAvailabilityException,
  saveWeeklyAvailability,
  updateAvailabilitySettings,
} from './dal'
import type { AvailabilityException, AvailabilitySettings, DayOfWeek, WeeklyAvailabilityRule } from './types'

export interface AgendaActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Asserts that the authenticated caller owns the target professional profile,
 * or possesses the ADMIN role. Throws or returns an error otherwise.
 */
async function assertProfileOwnership(profileId: string): Promise<{ accountId: string; isAdmin: boolean }> {
  const account = await requireAccount()
  const isAdmin = account.role === 'ADMIN'

  if (isAdmin) {
    return { accountId: account.id, isAdmin: true }
  }

  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('professional_profiles')
    .select('id, account_user_id')
    .eq('id', profileId)
    .maybeSingle()

  if (error || !profile || profile.account_user_id !== account.id) {
    throw new Error('Não autorizado: você não possui permissão para gerenciar esta agenda.')
  }

  return { accountId: account.id, isAdmin: false }
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

    const updated = await updateAvailabilitySettings(profileId, settings)
    return { success: true, data: updated }
  } catch (err: unknown) {
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
