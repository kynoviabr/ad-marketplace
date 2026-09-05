/**
 * Funnel and Metrics Calculation Helpers — PX2A
 *
 * Pure, side-effect-free calculation functions for:
 * - Safe zero-baseline comparison math (prevents NaN / Infinity)
 * - Funnel conversion rate computation
 * - Hourly and day-of-week peak time distribution
 * - Location breakdown rollups
 */

import type {
  MetricComparison,
  HourlyDistributionItem,
  DayOfWeekDistributionItem,
  PeakTimesMetric,
  TopLocationMetric,
  ProfileDailyMetric,
} from './types'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

/**
 * Calculates comparative statistics between current and previous periods.
 * Zero-safe handling:
 * - If previous === 0 and current === 0 -> delta = 0, percentageChange = 0, isNewBaseline = true
 * - If previous === 0 and current > 0 -> delta = current, percentageChange = null, isNewBaseline = true
 * - If previous > 0 -> delta = current - previous, percentageChange = round(((current - previous) / previous) * 100, 1), isNewBaseline = false
 */
export function calculateMetricComparison(current: number, previous: number): MetricComparison {
  const safeCurrent = Math.max(0, Math.round(current || 0))
  const safePrevious = Math.max(0, Math.round(previous || 0))
  const delta = safeCurrent - safePrevious

  if (safePrevious === 0) {
    return {
      current: safeCurrent,
      previous: safePrevious,
      delta,
      percentageChange: safeCurrent === 0 ? 0 : null,
      isNewBaseline: true,
    }
  }

  const rawChange = ((safeCurrent - safePrevious) / safePrevious) * 100
  const percentageChange = Number(rawChange.toFixed(1))

  return {
    current: safeCurrent,
    previous: safePrevious,
    delta,
    percentageChange,
    isNewBaseline: false,
  }
}

/**
 * Computes a safe conversion rate percentage (0..100) rounded to 2 decimal places.
 * If denominator is 0 or negative, returns 0 (never NaN or Infinity).
 */
export function calculateSafeRate(numerator: number, denominator: number): number {
  const safeNum = Math.max(0, numerator || 0)
  const safeDenom = Math.max(0, denominator || 0)
  if (safeDenom === 0) return 0
  return Number(((safeNum / safeDenom) * 100).toFixed(2))
}

/**
 * Formats a 2-digit hour label (e.g. 0 -> "00:00", 14 -> "14:00").
 */
export function formatHourLabel(hour: number): string {
  const padded = String(Math.max(0, Math.min(23, Math.floor(hour)))).padStart(2, '0')
  return `${padded}:00`
}

/**
 * Aggregates peak times across an array of daily metrics.
 * Produces:
 * - 24-hour distribution (00:00 to 23:00)
 * - 7-day of week distribution (Dom to Sáb)
 * - Best hour of day (by highest contacts, breaking ties by views, then impressions)
 * - Best day of week (by highest contacts, breaking ties by views, then impressions)
 */
export function calculatePeakTimes(metrics: ProfileDailyMetric[]): PeakTimesMetric {
  // 1. Initialize 24 hourly buckets
  const hourlyMap = new Map<number, { impressions: number; views: number; contacts: number }>()
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, { impressions: 0, views: 0, contacts: 0 })
  }

  // 2. Initialize 7 day of week buckets (0 = Sunday)
  const dayOfWeekMap = new Map<number, { impressions: number; views: number; contacts: number }>()
  for (let d = 0; d < 7; d++) {
    dayOfWeekMap.set(d, { impressions: 0, views: 0, contacts: 0 })
  }

  for (const m of metrics) {
    const totalContacts = (m.whatsapp_clicks || 0) + (m.phone_clicks || 0) + (m.telegram_clicks || 0)
    const views = m.views_total || 0
    const impressions = m.impressions_total || 0

    // Day of week: metric_date is YYYY-MM-DD
    // Parse as calendar date in UTC to extract day of week accurately
    const [year, month, day] = m.metric_date.split('-').map(Number)
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    const dow = dateObj.getUTCDay()

    const dowEntry = dayOfWeekMap.get(dow)
    if (dowEntry) {
      dowEntry.impressions += impressions
      dowEntry.views += views
      dowEntry.contacts += totalContacts
    }

    // Hourly breakdown
    if (m.hourly_breakdown && typeof m.hourly_breakdown === 'object') {
      for (const [hourKey, hMetrics] of Object.entries(m.hourly_breakdown)) {
        const hourNum = parseInt(hourKey, 10)
        if (!isNaN(hourNum) && hourNum >= 0 && hourNum < 24) {
          const entry = hourlyMap.get(hourNum)
          if (entry) {
            entry.impressions += hMetrics.impressions || 0
            entry.views += hMetrics.views || 0
            entry.contacts += hMetrics.contacts || 0
          }
        }
      }
    }
  }

  // Build hourlyDistribution array
  const hourlyDistribution: HourlyDistributionItem[] = []
  let bestHour: { hour: number; label: string; contacts: number; score: number } | null = null

  for (let h = 0; h < 24; h++) {
    const entry = hourlyMap.get(h)!
    hourlyDistribution.push({
      hour: h,
      label: formatHourLabel(h),
      impressions: entry.impressions,
      views: entry.views,
      contacts: entry.contacts,
    })

    const score = entry.contacts * 10000 + entry.views * 10 + entry.impressions * 0.01
    if (score > 0 && (!bestHour || score > bestHour.score)) {
      bestHour = {
        hour: h,
        label: formatHourLabel(h),
        contacts: entry.contacts,
        score,
      }
    }
  }

  // Build dayOfWeekDistribution array
  const dayOfWeekDistribution: DayOfWeekDistributionItem[] = []
  let bestDay: { dayOfWeek: number; dayName: string; contacts: number; score: number } | null = null

  for (let d = 0; d < 7; d++) {
    const entry = dayOfWeekMap.get(d)!
    const dayName = DAY_NAMES[d]
    dayOfWeekDistribution.push({
      dayOfWeek: d,
      dayName,
      impressions: entry.impressions,
      views: entry.views,
      contacts: entry.contacts,
    })

    const score = entry.contacts * 10000 + entry.views * 10 + entry.impressions * 0.01
    if (score > 0 && (!bestDay || score > bestDay.score)) {
      bestDay = {
        dayOfWeek: d,
        dayName,
        contacts: entry.contacts,
        score,
      }
    }
  }

  return {
    bestDayOfWeek: bestDay ? { dayOfWeek: bestDay.dayOfWeek, dayName: bestDay.dayName, contacts: bestDay.contacts } : null,
    bestHourOfDay: bestHour ? { hour: bestHour.hour, label: bestHour.label, contacts: bestHour.contacts } : null,
    hourlyDistribution,
    dayOfWeekDistribution,
  }
}

/**
 * Aggregates location breakdown across daily metrics and joins human-readable location and city names.
 */
export function calculateTopLocations(
  metrics: ProfileDailyMetric[],
  resolvedLocations: Map<string, { locationName: string; cityName: string }>
): TopLocationMetric[] {
  const locationMap = new Map<string | null, { impressions: number; views: number; contacts: number }>()

  for (const m of metrics) {
    if (Array.isArray(m.location_breakdown)) {
      for (const loc of m.location_breakdown) {
        const key = loc.location_id ?? null
        const entry = locationMap.get(key) || { impressions: 0, views: 0, contacts: 0 }
        entry.impressions += loc.impressions || 0
        entry.views += loc.views || 0
        entry.contacts += loc.contacts || 0
        locationMap.set(key, entry)
      }
    }
  }

  const result: TopLocationMetric[] = []
  for (const [locationId, data] of locationMap.entries()) {
    if (data.impressions === 0 && data.views === 0 && data.contacts === 0) continue

    const meta = locationId ? resolvedLocations.get(locationId) : null
    result.push({
      locationId,
      locationName: meta?.locationName ?? 'Geral / Cidade',
      cityName: meta?.cityName ?? 'São Paulo',
      impressions: data.impressions,
      views: data.views,
      contacts: data.contacts,
      conversionRate: calculateSafeRate(data.contacts, data.views),
    })
  }

  // Sort by contacts descending, then views descending
  result.sort((a, b) => {
    if (b.contacts !== a.contacts) return b.contacts - a.contacts
    return b.views - a.views
  })

  return result
}
