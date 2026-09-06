import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSaoPauloDateStr } from '@/modules/analytics/aggregation'
import type {
  AnalyticsPeriodDays,
  ProfessionalBenchmarkDTO,
  ComparisonBand,
  BenchmarkMetric,
} from './types'

export const MIN_COHORT_PROFILES = 5
export const MIN_COHORT_AGGREGATE_IMPRESSIONS = 25
export const MIN_CONTRIBUTING_PROFILES_FOR_RATE = 3

/**
 * Calculates the mathematical median of an array of numbers.
 * Returns null if the array is empty.
 */
export function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[mid]
  }
  return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1))
}

/**
 * Categorizes a metric into qualitative comparison bands relative to a cohort median.
 */
export function determineComparisonBand(
  professionalValue: number,
  cohortMedian: number | null,
  isRate: boolean
): ComparisonBand {
  if (cohortMedian === null || isNaN(cohortMedian)) {
    return 'INSUFFICIENT_DATA'
  }

  // Tolerance margin: 10% of median or 1.5 percentage points / 2 units
  const margin = isRate
    ? Math.max(cohortMedian * 0.1, 1.5)
    : Math.max(cohortMedian * 0.1, 2)

  if (professionalValue > cohortMedian + margin) {
    return 'ABOVE_COHORT'
  }
  if (professionalValue < cohortMedian - margin) {
    return 'BELOW_COHORT'
  }
  return 'NEAR_COHORT'
}

function shiftCalendarDateStr(dateStr: string, diffDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + diffDays)
  return dt.toISOString().slice(0, 10)
}

export interface GetProfessionalBenchmarkParams {
  profileId: string
  accountId: string
  periodDays?: AnalyticsPeriodDays
}

/**
 * Computes privacy-safe cohort benchmarks for a professional profile.
 *
 * Invariants & Guarantees:
 * - Server-authorized: strictly verifies caller owns profileId.
 * - Target profile is explicitly EXCLUDED from cohort median calculation to eliminate bias.
 * - Strict cohort privacy threshold: requires >= 5 distinct eligible competitor profiles.
 * - Minimum activity threshold: requires >= 25 aggregate cohort impressions.
 * - Robust statistic: uses MEDIAN (never skewed mean).
 * - Zero competitor data exposure: NO competitor names, slugs, IDs, ranks, or individual rows.
 * - Zero raw event scans: relies exclusively on pre-aggregated `profile_daily_metrics`.
 */
export async function getProfessionalBenchmark(
  params: GetProfessionalBenchmarkParams
): Promise<ProfessionalBenchmarkDTO> {
  const admin = createAdminClient()

  // 1. Authoritative ownership verification
  const { data: profile, error: profErr } = await admin
    .from('professional_profiles')
    .select('id, slug, account_user_id, status')
    .eq('id', params.profileId)
    .maybeSingle()

  if (profErr || !profile) {
    throw new Error('Profile not found')
  }

  if (profile.account_user_id !== params.accountId) {
    throw new Error('Forbidden: Professional does not own this profile')
  }

  const days: AnalyticsPeriodDays =
    params.periodDays === 7 || params.periodDays === 90 ? params.periodDays : 30

  // 2. Define canonical date boundaries in America/Sao_Paulo
  const todayStr = getSaoPauloDateStr(new Date())
  const currentEndDate = todayStr
  const currentStartDate = shiftCalendarDateStr(currentEndDate, -(days - 1))

  // 3. Query target profile's own metrics in this period
  const { data: ownRows } = await admin
    .from('profile_daily_metrics')
    .select('impressions_total, views_total, whatsapp_clicks, phone_clicks, telegram_clicks')
    .eq('profile_id', params.profileId)
    .gte('metric_date', currentStartDate)
    .lte('metric_date', currentEndDate)

  let ownImpressions = 0
  let ownViews = 0
  let ownContacts = 0

  for (const r of ownRows || []) {
    ownImpressions += r.impressions_total || 0
    ownViews += r.views_total || 0
    ownContacts +=
      (r.whatsapp_clicks || 0) + (r.phone_clicks || 0) + (r.telegram_clicks || 0)
  }

  const ownOpenRate =
    ownImpressions > 0 ? Number(((ownViews / ownImpressions) * 100).toFixed(1)) : 0
  const ownContactRate =
    ownViews > 0 ? Number(((ownContacts / ownViews) * 100).toFixed(1)) : 0

  // 4. Query canonical publication-eligible profiles (EXCLUDING target profile)
  const { data: eligibleRows, error: eligErr } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id')
    .neq('profile_id', params.profileId)

  if (eligErr) {
    console.error('[analytics:benchmark] Error fetching eligible cohort:', eligErr.message)
  }

  const eligibleCohortIds = Array.from(
    new Set((eligibleRows || []).map((r: any) => r.profile_id).filter(Boolean))
  )

  const defaultEmptyMetric = (val: number): BenchmarkMetric => ({
    professionalValue: val,
    cohortMedian: null,
    comparisonBand: 'INSUFFICIENT_DATA',
  })

  // 5. Cohort Privacy Threshold Guard: Minimum 5 distinct active profiles
  if (eligibleCohortIds.length < MIN_COHORT_PROFILES) {
    return {
      status: 'INSUFFICIENT_COHORT',
      periodDays: days,
      cohortClass: 'CITY_ACTIVE_PROFILES',
      openRate: defaultEmptyMetric(ownOpenRate),
      contactRate: defaultEmptyMetric(ownContactRate),
      visibility: defaultEmptyMetric(ownImpressions),
      eligibleCohortSize: eligibleCohortIds.length,
      qualifyingCohortSize: 0,
      reason: 'INSUFFICIENT_COHORT',
    }
  }

  // 6. Query aggregate metrics for eligible cohort across the period
  const { data: cohortMetricsRows, error: cohortErr } = await admin
    .from('profile_daily_metrics')
    .select('profile_id, impressions_total, views_total, whatsapp_clicks, phone_clicks, telegram_clicks')
    .in('profile_id', eligibleCohortIds)
    .gte('metric_date', currentStartDate)
    .lte('metric_date', currentEndDate)

  if (cohortErr) {
    console.error('[analytics:benchmark] Error fetching cohort metrics:', cohortErr.message)
  }

  // Group metrics by profile_id
  const cohortMap = new Map<
    string,
    { impressions: number; views: number; contacts: number }
  >()

  // Initialize all eligible cohort profiles with 0
  for (const pid of eligibleCohortIds) {
    cohortMap.set(pid, { impressions: 0, views: 0, contacts: 0 })
  }

  for (const r of cohortMetricsRows || []) {
    const entry = cohortMap.get(r.profile_id)
    if (entry) {
      entry.impressions += r.impressions_total || 0
      entry.views += r.views_total || 0
      entry.contacts +=
        (r.whatsapp_clicks || 0) + (r.phone_clicks || 0) + (r.telegram_clicks || 0)
    }
  }

  const cohortProfiles = Array.from(cohortMap.values())
  const totalCohortImpressions = cohortProfiles.reduce(
    (acc, p) => acc + p.impressions,
    0
  )

  // Minimum aggregate activity threshold
  if (totalCohortImpressions < MIN_COHORT_AGGREGATE_IMPRESSIONS) {
    return {
      status: 'INSUFFICIENT_COHORT',
      periodDays: days,
      cohortClass: 'CITY_ACTIVE_PROFILES',
      openRate: defaultEmptyMetric(ownOpenRate),
      contactRate: defaultEmptyMetric(ownContactRate),
      visibility: defaultEmptyMetric(ownImpressions),
      eligibleCohortSize: eligibleCohortIds.length,
      qualifyingCohortSize: cohortProfiles.filter((p) => p.impressions > 0).length,
      reason: 'INSUFFICIENT_COHORT',
    }
  }

  // 7. Calculate cohort medians
  const visibilityValues = cohortProfiles.map((p) => p.impressions)
  const visibilityMedian = calculateMedian(visibilityValues)

  const openRateProfiles = cohortProfiles.filter((p) => p.impressions > 0)
  const openRateValues = openRateProfiles.map((p) =>
    Number(((p.views / p.impressions) * 100).toFixed(1))
  )
  const openRateMedian =
    openRateProfiles.length >= MIN_CONTRIBUTING_PROFILES_FOR_RATE
      ? calculateMedian(openRateValues)
      : null

  const contactRateProfiles = cohortProfiles.filter((p) => p.views > 0)
  const contactRateValues = contactRateProfiles.map((p) =>
    Number(((p.contacts / p.views) * 100).toFixed(1))
  )
  const contactRateMedian =
    contactRateProfiles.length >= MIN_CONTRIBUTING_PROFILES_FOR_RATE
      ? calculateMedian(contactRateValues)
      : null

  // 8. Target profile data state guard
  if (ownImpressions === 0) {
    return {
      status: 'INSUFFICIENT_DATA',
      periodDays: days,
      cohortClass: 'CITY_ACTIVE_PROFILES',
      openRate: {
        professionalValue: ownOpenRate,
        cohortMedian: openRateMedian,
        comparisonBand: 'INSUFFICIENT_DATA',
      },
      contactRate: {
        professionalValue: ownContactRate,
        cohortMedian: contactRateMedian,
        comparisonBand: 'INSUFFICIENT_DATA',
      },
      visibility: {
        professionalValue: ownImpressions,
        cohortMedian: visibilityMedian,
        comparisonBand: 'INSUFFICIENT_DATA',
      },
      eligibleCohortSize: eligibleCohortIds.length,
      qualifyingCohortSize: openRateProfiles.length,
      reason: 'INSUFFICIENT_DATA',
    }
  }

  // 9. Return Available Benchmark
  return {
    status: 'AVAILABLE',
    periodDays: days,
    cohortClass: 'CITY_ACTIVE_PROFILES',
    openRate: {
      professionalValue: ownOpenRate,
      cohortMedian: openRateMedian,
      comparisonBand: determineComparisonBand(ownOpenRate, openRateMedian, true),
    },
    contactRate: {
      professionalValue: ownContactRate,
      cohortMedian: contactRateMedian,
      comparisonBand: determineComparisonBand(ownContactRate, contactRateMedian, true),
    },
    visibility: {
      professionalValue: ownImpressions,
      cohortMedian: visibilityMedian,
      comparisonBand: determineComparisonBand(ownImpressions, visibilityMedian, false),
    },
    eligibleCohortSize: eligibleCohortIds.length,
    qualifyingCohortSize: openRateProfiles.length,
    reason: 'OK',
  }
}
