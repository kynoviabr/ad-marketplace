/**
 * Analytics Server Actions — FASE 09
 *
 * Guarded server actions for advertiser and admin analytics surfaces.
 */

'use server'

import { requireAccount } from '@/modules/auth/dal'
import { requireAdmin } from '@/modules/moderation/guards'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getAdvertiserMetrics, getAdminPlatformMetrics } from './dal'
import { aggregateDailyMetrics } from './aggregation'
import type {
  AdvertiserMetricsSummaryDTO,
  AdminPlatformMetricsDTO,
  AnalyticsActionResult,
} from './types'

/**
 * Retrieves aggregate metrics for the authenticated advertiser's profile.
 */
export async function getAdvertiserMetricsAction(
  days: 7 | 30 | 90 = 30
): Promise<AnalyticsActionResult<AdvertiserMetricsSummaryDTO>> {
  try {
    const account = await requireAccount()
    const profile = await getProfileByAccountUserId(account.id)

    if (!profile) {
      return { success: false, error: 'Perfil profissional não encontrado' }
    }

    const data = await getAdvertiserMetrics(profile.id, days)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao carregar métricas do anunciante' }
  }
}

/**
 * Retrieves platform-wide Surface A analytics for admin users.
 */
export async function getAdminPlatformMetricsAction(
  days = 30
): Promise<AnalyticsActionResult<AdminPlatformMetricsDTO>> {
  try {
    await requireAdmin()
    const data = await getAdminPlatformMetrics(days)
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Acesso negado ou erro ao carregar métricas' }
  }
}

/**
 * Triggers deterministic daily aggregation for a specific date (or yesterday).
 * Admin-only operation.
 */
export async function triggerDailyAggregationAction(
  targetDate?: string
): Promise<AnalyticsActionResult<{ processedDate: string; summary: string }>> {
  try {
    await requireAdmin()
    const result = await aggregateDailyMetrics(targetDate)
    return {
      success: true,
      data: {
        processedDate: result.metricDate,
        summary: `Processados ${result.profilesProcessed} perfis, ${result.platformSearches} buscas, ${result.platformImpressions} impressões e ${result.platformClicks} cliques.`,
      },
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao executar agregação diária' }
  }
}
