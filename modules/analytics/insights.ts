/**
 * Professional Analytics 2.0 — Pure Domain Insight Engine (PX2C)
 *
 * Deterministic, non-generative, conservative decision support for professionals.
 *
 * Principles:
 * - 100% deterministic rules traceable directly to aggregated metrics.
 * - ZERO LLMs or hallucinated motivational advice.
 * - Enforces minimum-data thresholds to avoid drawing false conclusions from tiny samples.
 * - Safe handling of funnel asymmetry (>100% contact rates due to repeat clicks).
 * - Conservative noise filtering (ignores changes < 10%).
 * - Connects actionable suggestions strictly to existing product controls.
 */

import type {
  ProfessionalAnalyticsOverviewDTO,
  ProfessionalAnalyticsInsight,
  InsightCategory,
  InsightPriority,
  InsightDirection,
  InsightActionType,
  InsightDataState,
} from './types'

export const MIN_TOTAL_ACTIVITY_THRESHOLD = 5
export const MATERIALITY_PERCENTAGE_THRESHOLD = 10.0
export const MIN_IMPRESSIONS_FOR_OPEN_RATE_FUNNEL = 20
export const MIN_VIEWS_FOR_CONTACT_RATE_FUNNEL = 5
export const MIN_CONTACTS_FOR_TIMING_INSIGHT = 3

interface RawInsightCandidate {
  id: string
  category: InsightCategory
  priority: InsightPriority
  direction: InsightDirection
  titleKey: string
  bodyKey: string
  params?: Record<string, string | number>
  actionType: InsightActionType
  actionHref?: string
  dataState: InsightDataState
}

const PRIORITY_SCORES: Record<InsightPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

/**
 * Generates a ranked set of 3–5 actionable insights from a professional's overview metrics.
 */
export function generateProfessionalInsights(
  overview: ProfessionalAnalyticsOverviewDTO
): ProfessionalAnalyticsInsight[] {
  const { funnel, comparison, topLocations, peakTimes } = overview
  const totalActivity =
    funnel.impressions.total + funnel.views.total + funnel.contacts.total

  // 1. Minimum Activity Guard
  if (totalActivity < MIN_TOTAL_ACTIVITY_THRESHOLD) {
    return [
      {
        id: 'data_accumulating',
        category: 'DATA_QUALITY',
        priority: 'LOW',
        direction: 'NEUTRAL',
        titleKey: 'analytics.insights.dataAccumulatingTitle',
        bodyKey: 'analytics.insights.dataAccumulatingBody',
        actionType: 'NONE',
        dataState: 'INSUFFICIENT_DATA',
      },
    ]
  }

  const candidates: RawInsightCandidate[] = []

  // -------------------------------------------------------------------------
  // 2. Funnel Diagnostics (High Priority)
  // -------------------------------------------------------------------------
  // Case: High impressions + low open rate
  if (
    funnel.impressions.total >= MIN_IMPRESSIONS_FOR_OPEN_RATE_FUNNEL &&
    funnel.rates.impressionToViewRate < 5.0
  ) {
    candidates.push({
      id: 'funnel_low_open_rate',
      category: 'FUNNEL',
      priority: 'HIGH',
      direction: 'NEGATIVE',
      titleKey: 'analytics.insights.lowOpenRateTitle',
      bodyKey: 'analytics.insights.lowOpenRateBody',
      params: {
        rate: funnel.rates.impressionToViewRate.toFixed(1),
        impressions: funnel.impressions.total,
      },
      actionType: 'REVIEW_PROFILE_PRESENTATION',
      actionHref: '/dashboard/photos',
      dataState: 'CONFIDENT',
    })
  }

  // Case: Good open rate + low contact rate
  if (
    funnel.views.total >= MIN_VIEWS_FOR_CONTACT_RATE_FUNNEL &&
    funnel.rates.impressionToViewRate >= 15.0 &&
    funnel.rates.viewToContactRate < 5.0
  ) {
    candidates.push({
      id: 'funnel_low_contact_rate',
      category: 'FUNNEL',
      priority: 'HIGH',
      direction: 'NEGATIVE',
      titleKey: 'analytics.insights.lowContactRateTitle',
      bodyKey: 'analytics.insights.lowContactRateBody',
      params: {
        contactRate: funnel.rates.viewToContactRate.toFixed(1),
        views: funnel.views.total,
      },
      actionType: 'REVIEW_CONTACT_INFO',
      actionHref: '/onboarding/seu-perfil',
      dataState: 'CONFIDENT',
    })
  }

  // Case: Low impressions + strong down-funnel conversion
  if (
    funnel.impressions.total < 40 &&
    funnel.impressions.total >= 5 &&
    funnel.rates.viewToContactRate >= 20.0
  ) {
    candidates.push({
      id: 'funnel_high_engagement_low_reach',
      category: 'FUNNEL',
      priority: 'MEDIUM',
      direction: 'POSITIVE',
      titleKey: 'analytics.insights.highEngagementLowReachTitle',
      bodyKey: 'analytics.insights.highEngagementLowReachBody',
      params: {
        contactRate: funnel.rates.viewToContactRate.toFixed(1),
      },
      actionType: 'EXPLORE_PROMOTIONS',
      actionHref: '/dashboard/boosts',
      dataState: 'CONFIDENT',
    })
  }

  // Case: Funnel asymmetry (>100% contact clicks to views)
  if (funnel.rates.viewToContactRate > 100.0) {
    candidates.push({
      id: 'funnel_asymmetry_repeat_clicks',
      category: 'FUNNEL',
      priority: 'MEDIUM',
      direction: 'NEUTRAL',
      titleKey: 'analytics.insights.asymmetryRepeatClicksTitle',
      bodyKey: 'analytics.insights.asymmetryRepeatClicksBody',
      params: {
        contacts: funnel.contacts.whatsapp,
        views: funnel.views.total,
      },
      actionType: 'NONE',
      dataState: 'CONFIDENT',
    })
  }

  // -------------------------------------------------------------------------
  // 3. Performance Change Insights (Current vs Previous Period)
  // -------------------------------------------------------------------------
  // Impressions
  if (comparison.impressions.isNewBaseline && comparison.impressions.current >= 5) {
    candidates.push({
      id: 'perf_impressions_new',
      category: 'PERFORMANCE_CHANGE',
      priority: 'MEDIUM',
      direction: 'POSITIVE',
      titleKey: 'analytics.insights.impressionsNewTitle',
      bodyKey: 'analytics.insights.impressionsNewBody',
      params: { count: comparison.impressions.current },
      actionType: 'NONE',
      dataState: 'CONFIDENT',
    })
  } else if (
    comparison.impressions.percentageChange !== null &&
    Math.abs(comparison.impressions.percentageChange) >= MATERIALITY_PERCENTAGE_THRESHOLD
  ) {
    const isUp = comparison.impressions.percentageChange > 0
    candidates.push({
      id: isUp ? 'perf_impressions_up' : 'perf_impressions_down',
      category: 'PERFORMANCE_CHANGE',
      priority: 'MEDIUM',
      direction: isUp ? 'POSITIVE' : 'NEGATIVE',
      titleKey: isUp ? 'analytics.insights.impressionsUpTitle' : 'analytics.insights.impressionsDownTitle',
      bodyKey: isUp ? 'analytics.insights.impressionsUpBody' : 'analytics.insights.impressionsDownBody',
      params: { pct: Math.abs(comparison.impressions.percentageChange).toFixed(1) },
      actionType: 'NONE',
      dataState: 'CONFIDENT',
    })
  }

  // Profile Views
  if (comparison.views.isNewBaseline && comparison.views.current >= 3) {
    candidates.push({
      id: 'perf_views_new',
      category: 'PERFORMANCE_CHANGE',
      priority: 'MEDIUM',
      direction: 'POSITIVE',
      titleKey: 'analytics.insights.viewsNewTitle',
      bodyKey: 'analytics.insights.viewsNewBody',
      params: { count: comparison.views.current },
      actionType: 'NONE',
      dataState: 'CONFIDENT',
    })
  } else if (
    comparison.views.percentageChange !== null &&
    Math.abs(comparison.views.percentageChange) >= MATERIALITY_PERCENTAGE_THRESHOLD
  ) {
    const isUp = comparison.views.percentageChange > 0
    candidates.push({
      id: isUp ? 'perf_views_up' : 'perf_views_down',
      category: 'PERFORMANCE_CHANGE',
      priority: isUp ? 'MEDIUM' : 'HIGH',
      direction: isUp ? 'POSITIVE' : 'NEGATIVE',
      titleKey: isUp ? 'analytics.insights.viewsUpTitle' : 'analytics.insights.viewsDownTitle',
      bodyKey: isUp ? 'analytics.insights.viewsUpBody' : 'analytics.insights.viewsDownBody',
      params: { pct: Math.abs(comparison.views.percentageChange).toFixed(1) },
      actionType: isUp ? 'NONE' : 'REVIEW_PROFILE_PRESENTATION',
      actionHref: isUp ? undefined : '/dashboard/photos',
      dataState: 'CONFIDENT',
    })
  }

  // WhatsApp Clicks
  if (comparison.whatsappClicks.isNewBaseline && comparison.whatsappClicks.current >= 1) {
    candidates.push({
      id: 'perf_contacts_new',
      category: 'PERFORMANCE_CHANGE',
      priority: 'HIGH',
      direction: 'POSITIVE',
      titleKey: 'analytics.insights.contactsNewTitle',
      bodyKey: 'analytics.insights.contactsNewBody',
      params: { count: comparison.whatsappClicks.current },
      actionType: 'NONE',
      dataState: 'CONFIDENT',
    })
  } else if (
    comparison.whatsappClicks.percentageChange !== null &&
    Math.abs(comparison.whatsappClicks.percentageChange) >= MATERIALITY_PERCENTAGE_THRESHOLD
  ) {
    const isUp = comparison.whatsappClicks.percentageChange > 0
    candidates.push({
      id: isUp ? 'perf_contacts_up' : 'perf_contacts_down',
      category: 'PERFORMANCE_CHANGE',
      priority: 'HIGH',
      direction: isUp ? 'POSITIVE' : 'NEGATIVE',
      titleKey: isUp ? 'analytics.insights.contactsUpTitle' : 'analytics.insights.contactsDownTitle',
      bodyKey: isUp ? 'analytics.insights.contactsUpBody' : 'analytics.insights.contactsDownBody',
      params: { pct: Math.abs(comparison.whatsappClicks.percentageChange).toFixed(1) },
      actionType: isUp ? 'NONE' : 'REVIEW_CONTACT_INFO',
      actionHref: isUp ? undefined : '/onboarding/seu-perfil',
      dataState: 'CONFIDENT',
    })
  }

  // -------------------------------------------------------------------------
  // 4. Service Area Insights
  // -------------------------------------------------------------------------
  if (topLocations.length > 0) {
    const topLoc = topLocations[0]
    if (topLoc.contacts >= 2 || topLoc.views >= 5) {
      candidates.push({
        id: 'location_top_performer',
        category: 'SERVICE_AREA',
        priority: 'MEDIUM',
        direction: 'POSITIVE',
        titleKey: 'analytics.insights.topLocationTitle',
        bodyKey: 'analytics.insights.topLocationBody',
        params: {
          location: topLoc.locationName,
          contacts: topLoc.contacts,
          views: topLoc.views,
        },
        actionType: 'MAINTAIN_SERVICE_AREA',
        actionHref: '/onboarding/onde-atende',
        dataState: 'CONFIDENT',
      })
    }
  }

  // -------------------------------------------------------------------------
  // 5. Timing Insights (America/Sao_Paulo)
  // -------------------------------------------------------------------------
  if (
    funnel.contacts.total >= MIN_CONTACTS_FOR_TIMING_INSIGHT &&
    peakTimes.bestHourOfDay &&
    peakTimes.bestHourOfDay.contacts > 0
  ) {
    candidates.push({
      id: 'timing_peak_hour',
      category: 'TIMING',
      priority: 'MEDIUM',
      direction: 'POSITIVE',
      titleKey: 'analytics.insights.peakHourTitle',
      bodyKey: 'analytics.insights.peakHourBody',
      params: {
        hour: peakTimes.bestHourOfDay.label,
        day: peakTimes.bestDayOfWeek?.dayName ?? '',
        contacts: peakTimes.bestHourOfDay.contacts,
      },
      actionType: 'BE_RESPONSIVE',
      dataState: 'CONFIDENT',
    })
  }

  // -------------------------------------------------------------------------
  // 6. Placement Insights (Organic vs Sponsored)
  // -------------------------------------------------------------------------
  if (funnel.impressions.sponsored > 0 && funnel.impressions.total >= 10) {
    const sponsoredPct = Math.round(
      (funnel.impressions.sponsored / funnel.impressions.total) * 100
    )
    candidates.push({
      id: 'placement_sponsored_impact',
      category: 'PLACEMENT',
      priority: 'LOW',
      direction: 'NEUTRAL',
      titleKey: 'analytics.insights.sponsoredPlacementTitle',
      bodyKey: 'analytics.insights.sponsoredPlacementBody',
      params: { pct: sponsoredPct },
      actionType: 'NONE',
      dataState: 'CONFIDENT',
    })
  }

  // -------------------------------------------------------------------------
  // 7. Rank by Priority & Cap at 3 to 5 Insights
  // -------------------------------------------------------------------------
  candidates.sort((a, b) => PRIORITY_SCORES[b.priority] - PRIORITY_SCORES[a.priority])

  return candidates.slice(0, 5)
}
