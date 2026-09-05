/**
 * Analytics Data Access Layer (DAL) — FASE 09
 *
 * Server-only module for querying sanitized analytics DTOs.
 * Enforces tenant isolation, zero visitor-session leakage, and role guards.
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AdvertiserMetricsSummaryDTO,
  AdminPlatformMetricsDTO,
  ProfessionalAnalyticsOverviewDTO,
  AnalyticsPeriodDays,
  ProfileDailyMetric,
} from './types'
import { getSaoPauloDateStr } from './aggregation'
import {
  calculateMetricComparison,
  calculateSafeRate,
  calculatePeakTimes,
  calculateTopLocations,
} from './funnel'

/**
 * Retrieves aggregate metrics for an advertiser's profile over a given number of days.
 * Sanitizes all output to ensure zero visitor identity or session details.
 */
export async function getAdvertiserMetrics(
  profileId: string,
  days: 7 | 30 | 90 = 30
): Promise<AdvertiserMetricsSummaryDTO> {
  const admin = createAdminClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().slice(0, 10)

  // 1. Query daily metrics
  const { data: rows, error } = await admin
    .from('profile_daily_metrics')
    .select('*')
    .eq('profile_id', profileId)
    .gte('metric_date', startDateStr)
    .order('metric_date', { ascending: true })

  if (error) {
    console.error('[analytics:dal:getAdvertiserMetrics] Error fetching metrics:', error.message)
    return {
      impressionsTotal: 0,
      impressionsOrganic: 0,
      impressionsSponsored: 0,
      profileViews: 0,
      whatsappClicks: 0,
      ctr: 0,
      days,
      dailyBreakdown: [],
    }
  }

  const metricsList = rows || []

  let impressionsTotal = 0
  let impressionsOrganic = 0
  let impressionsSponsored = 0
  let profileViews = 0
  let whatsappClicks = 0

  const dailyBreakdown = metricsList.map((r: any) => {
    impressionsTotal += r.impressions_total || 0
    impressionsOrganic += r.impressions_organic || 0
    impressionsSponsored += r.impressions_sponsored || 0
    profileViews += r.views_total || 0
    whatsappClicks += r.whatsapp_clicks || 0

    return {
      date: r.metric_date,
      impressionsTotal: r.impressions_total || 0,
      impressionsOrganic: r.impressions_organic || 0,
      impressionsSponsored: r.impressions_sponsored || 0,
      profileViews: r.views_total || 0,
      whatsappClicks: r.whatsapp_clicks || 0,
    }
  })

  const ctr = impressionsTotal > 0 ? Number(((whatsappClicks / impressionsTotal) * 100).toFixed(2)) : 0

  return {
    impressionsTotal,
    impressionsOrganic,
    impressionsSponsored,
    profileViews,
    whatsappClicks,
    ctr,
    days,
    dailyBreakdown,
  }
}

/**
 * Retrieves platform-wide Surface A analytics for admin dashboards.
 */
export async function getAdminPlatformMetrics(days = 30): Promise<AdminPlatformMetricsDTO> {
  const admin = createAdminClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().slice(0, 10)

  // 1. Query platform daily metrics
  const { data: platRows } = await admin
    .from('platform_daily_metrics')
    .select('*')
    .gte('metric_date', startDateStr)
    .order('metric_date', { ascending: true })

  const platformList = platRows || []

  let searchesTotal = 0
  let searchesWithFilters = 0
  let searchesZeroResults = 0
  let impressionsTotal = 0
  let impressionsOrganic = 0
  let impressionsSponsored = 0
  let whatsappClicksTotal = 0
  let whatsappClicksOrganic = 0
  let whatsappClicksSponsored = 0
  let activeAdvertisersCount = 0

  for (const r of platformList) {
    searchesTotal += r.searches_total || 0
    searchesWithFilters += r.searches_with_filters || 0
    searchesZeroResults += r.searches_zero_results || 0
    impressionsTotal += r.impressions_total || 0
    impressionsOrganic += r.impressions_organic || 0
    impressionsSponsored += r.impressions_sponsored || 0
    whatsappClicksTotal += r.whatsapp_clicks_total || 0
    whatsappClicksOrganic += r.whatsapp_clicks_organic || 0
    whatsappClicksSponsored += r.whatsapp_clicks_sponsored || 0
    if (r.active_advertisers) {
      activeAdvertisersCount = r.active_advertisers
    }
  }

  // If activeAdvertisers was not populated, query live count
  if (activeAdvertisersCount === 0) {
    const { count } = await admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')
    activeAdvertisersCount = count || 0
  }

  const overallCtr = impressionsTotal > 0
    ? Number(((whatsappClicksTotal / impressionsTotal) * 100).toFixed(2))
    : 0

  const contactClicksPerActiveAdvertiser = activeAdvertisersCount > 0
    ? Number((whatsappClicksTotal / activeAdvertisersCount).toFixed(2))
    : 0

  // 2. Query Top Profiles by Impressions & Clicks
  const { data: topProfRows } = await admin
    .from('profile_daily_metrics')
    .select(`
      profile_id,
      impressions_total,
      whatsapp_clicks,
      profile:professional_profiles (
        stage_name
      )
    `)
    .gte('metric_date', startDateStr)

  const profAggMap = new Map<string, { stageName: string; impressionsTotal: number; whatsappClicks: number }>()

  for (const r of topProfRows || []) {
    const pid = r.profile_id
    const stageName = (r.profile as any)?.stage_name || 'Desconhecido'
    if (!profAggMap.has(pid)) {
      profAggMap.set(pid, { stageName, impressionsTotal: 0, whatsappClicks: 0 })
    }
    const item = profAggMap.get(pid)!
    item.impressionsTotal += r.impressions_total || 0
    item.whatsappClicks += r.whatsapp_clicks || 0
  }

  const topProfiles = Array.from(profAggMap.entries())
    .map(([profileId, data]) => ({
      profileId,
      stageName: data.stageName,
      impressionsTotal: data.impressionsTotal,
      whatsappClicks: data.whatsappClicks,
      ctr: data.impressionsTotal > 0
        ? Number(((data.whatsappClicks / data.impressionsTotal) * 100).toFixed(2))
        : 0,
    }))
    .sort((a, b) => b.impressionsTotal - a.impressionsTotal)
    .slice(0, 10)

  // 3. Query Top Locations from raw events
  const { data: locRows } = await admin
    .from('analytics_events')
    .select(`
      location_id,
      location:marketplace_locations (
        name,
        city:cities (
          name
        )
      )
    `)
    .not('location_id', 'is', null)
    .gte('occurred_at', startDate.toISOString())
    .limit(1000)

  const locAggMap = new Map<string, { locationName: string; cityName: string; impressionsTotal: number; whatsappClicks: number }>()

  for (const r of locRows || []) {
    const lid = r.location_id
    if (!lid) continue
    const locName = (r.location as any)?.name || 'Bairro'
    const cityName = (r.location as any)?.city?.name || 'São Paulo'

    if (!locAggMap.has(lid)) {
      locAggMap.set(lid, { locationName: locName, cityName, impressionsTotal: 0, whatsappClicks: 0 })
    }
    const item = locAggMap.get(lid)!
    item.impressionsTotal += 1
  }

  const topLocations = Array.from(locAggMap.entries())
    .map(([locationId, data]) => ({
      locationId,
      locationName: data.locationName,
      cityName: data.cityName,
      impressionsTotal: data.impressionsTotal,
      whatsappClicks: data.whatsappClicks,
    }))
    .sort((a, b) => b.impressionsTotal - a.impressionsTotal)
    .slice(0, 10)

  return {
    periodDays: days,
    searchesTotal,
    searchesWithFilters,
    searchesZeroResults,
    impressionsTotal,
    impressionsOrganic,
    impressionsSponsored,
    whatsappClicksTotal,
    whatsappClicksOrganic,
    whatsappClicksSponsored,
    overallCtr,
    contactClicksPerActiveAdvertiser,
    activeAdvertisersCount,
    topProfiles,
    topLocations,
  }
}

export interface GetProfessionalAnalyticsOverviewParams {
  profileId: string
  accountId: string
  periodDays?: AnalyticsPeriodDays
}

/**
 * Shifts a YYYY-MM-DD date string by a number of calendar days in UTC.
 */
function shiftCalendarDateStr(dateStr: string, diffDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + diffDays)
  return dt.toISOString().slice(0, 10)
}

/**
 * Retrieves the comprehensive Professional Analytics 2.0 overview for a professional profile.
 *
 * Invariants & Guarantees:
 * - Strictly enforces professional profile ownership: accountId must match profile.account_user_id.
 * - Serves 100% of data from pre-aggregated `profile_daily_metrics` (zero raw visitor events scanned).
 * - Full funnel coverage: Impressions -> Profile Views -> Contact Intents (WhatsApp, Phone, Telegram).
 * - Period comparison (7, 30, 90 days) with previous contiguous period of equal length.
 * - Safe zero-baseline math (no NaN, no Infinity, clear `isNewBaseline` indicator).
 * - Temporal peak analysis: hourly (00..23) and day-of-week (Dom..Sáb).
 * - Top locations with joined name resolution.
 * - Privacy: Zero raw IP, zero PII, zero visitor IDs returned.
 */
export async function getProfessionalAnalyticsOverview(
  params: GetProfessionalAnalyticsOverviewParams
): Promise<ProfessionalAnalyticsOverviewDTO> {
  const admin = createAdminClient()

  // 1. Authoritative ownership verification
  const { data: profile, error: profErr } = await admin
    .from('professional_profiles')
    .select('id, slug, account_user_id, audience_setting, status')
    .eq('id', params.profileId)
    .maybeSingle()

  if (profErr || !profile) {
    throw new Error('Profile not found')
  }

  if (profile.account_user_id !== params.accountId) {
    throw new Error('Forbidden: Professional does not own this profile')
  }

  const days: AnalyticsPeriodDays = params.periodDays === 7 || params.periodDays === 90 ? params.periodDays : 30

  // 2. Define canonical date boundaries in America/Sao_Paulo
  const todayStr = getSaoPauloDateStr(new Date())
  const currentEndDate = todayStr
  const currentStartDate = shiftCalendarDateStr(currentEndDate, -(days - 1))

  const previousEndDate = shiftCalendarDateStr(currentStartDate, -1)
  const previousStartDate = shiftCalendarDateStr(previousEndDate, -(days - 1))

  // 3. Query pre-aggregated daily metrics across both periods
  const { data: rawRows, error: metricsErr } = await admin
    .from('profile_daily_metrics')
    .select('*')
    .eq('profile_id', params.profileId)
    .gte('metric_date', previousStartDate)
    .lte('metric_date', currentEndDate)
    .order('metric_date', { ascending: true })

  if (metricsErr) {
    console.error('[analytics:dal:getProfessionalAnalyticsOverview] Error fetching metrics:', metricsErr.message)
  }

  const allRows = (rawRows || []) as ProfileDailyMetric[]

  // 4. Partition into current and previous period rows
  const currentMetrics = allRows.filter(
    (r) => r.metric_date >= currentStartDate && r.metric_date <= currentEndDate
  )
  const previousMetrics = allRows.filter(
    (r) => r.metric_date >= previousStartDate && r.metric_date <= previousEndDate
  )

  // 5. Aggregate Current Period Funnel
  let currImpTotal = 0
  let currImpOrganic = 0
  let currImpSponsored = 0
  let currViewsTotal = 0
  let currViewsOrganic = 0
  let currViewsSponsored = 0
  let currWhatsapp = 0
  let currPhone = 0
  let currTelegram = 0

  for (const r of currentMetrics) {
    currImpTotal += r.impressions_total || 0
    currImpOrganic += r.impressions_organic || 0
    currImpSponsored += r.impressions_sponsored || 0
    currViewsTotal += r.views_total || 0
    currViewsOrganic += r.views_organic || 0
    currViewsSponsored += r.views_sponsored || 0
    currWhatsapp += r.whatsapp_clicks || 0
    currPhone += r.phone_clicks || 0
    currTelegram += r.telegram_clicks || 0
  }
  const currContactsTotal = currWhatsapp + currPhone + currTelegram

  // 6. Aggregate Previous Period Funnel
  let prevImpTotal = 0
  let prevViewsTotal = 0
  let prevWhatsapp = 0
  let prevContactsTotal = 0

  for (const r of previousMetrics) {
    prevImpTotal += r.impressions_total || 0
    prevViewsTotal += r.views_total || 0
    prevWhatsapp += r.whatsapp_clicks || 0
    prevContactsTotal +=
      (r.whatsapp_clicks || 0) + (r.phone_clicks || 0) + (r.telegram_clicks || 0)
  }

  // 7. Funnel Conversion Rates (Safe zero-division)
  const rates = {
    impressionToViewRate: calculateSafeRate(currViewsTotal, currImpTotal),
    viewToContactRate: calculateSafeRate(currContactsTotal, currViewsTotal),
    overallConversionRate: calculateSafeRate(currContactsTotal, currImpTotal),
  }

  // 8. Period Comparisons
  const comparison = {
    impressions: calculateMetricComparison(currImpTotal, prevImpTotal),
    views: calculateMetricComparison(currViewsTotal, prevViewsTotal),
    contacts: calculateMetricComparison(currContactsTotal, prevContactsTotal),
    whatsappClicks: calculateMetricComparison(currWhatsapp, prevWhatsapp),
  }

  // 9. Continuous Daily Trend (fill zero days)
  const metricsByDate = new Map<string, ProfileDailyMetric>()
  for (const r of currentMetrics) {
    metricsByDate.set(r.metric_date, r)
  }

  const dailyTrend = []
  for (let i = 0; i < days; i++) {
    const dStr = shiftCalendarDateStr(currentStartDate, i)
    const [y, m, d] = dStr.split('-').map(Number)
    const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
    const r = metricsByDate.get(dStr)

    dailyTrend.push({
      date: dStr,
      dayOfWeek: dow,
      impressionsTotal: r?.impressions_total || 0,
      impressionsOrganic: r?.impressions_organic || 0,
      impressionsSponsored: r?.impressions_sponsored || 0,
      viewsTotal: r?.views_total || 0,
      viewsOrganic: r?.views_organic || 0,
      viewsSponsored: r?.views_sponsored || 0,
      contactsTotal:
        (r?.whatsapp_clicks || 0) + (r?.phone_clicks || 0) + (r?.telegram_clicks || 0),
      whatsappClicks: r?.whatsapp_clicks || 0,
      phoneClicks: r?.phone_clicks || 0,
      telegramClicks: r?.telegram_clicks || 0,
    })
  }

  // 10. Top Locations Resolution
  const locationIds = new Set<string>()
  for (const r of currentMetrics) {
    if (Array.isArray(r.location_breakdown)) {
      for (const item of r.location_breakdown) {
        if (item.location_id) locationIds.add(item.location_id)
      }
    }
  }

  const resolvedLocations = new Map<string, { locationName: string; cityName: string }>()
  if (locationIds.size > 0) {
    const { data: locRows } = await admin
      .from('marketplace_locations')
      .select('id, name, city:cities(name)')
      .in('id', Array.from(locationIds))

    for (const l of locRows || []) {
      resolvedLocations.set(l.id, {
        locationName: l.name,
        cityName: (l.city as any)?.name || 'São Paulo',
      })
    }
  }

  const topLocations = calculateTopLocations(currentMetrics, resolvedLocations)
  const peakTimes = calculatePeakTimes(currentMetrics)

  return {
    profileId: profile.id,
    profileSlug: profile.slug,
    audienceMode: (profile.audience_setting as 'PUBLIC' | 'VIP_ONLY') || 'PUBLIC',
    periodDays: days,
    startDate: currentStartDate,
    endDate: currentEndDate,
    previousStartDate,
    previousEndDate,
    funnel: {
      impressions: {
        total: currImpTotal,
        organic: currImpOrganic,
        sponsored: currImpSponsored,
      },
      views: {
        total: currViewsTotal,
        organic: currViewsOrganic,
        sponsored: currViewsSponsored,
      },
      contacts: {
        total: currContactsTotal,
        whatsapp: currWhatsapp,
        phone: currPhone,
        telegram: currTelegram,
      },
      rates,
    },
    comparison,
    dailyTrend,
    topLocations,
    peakTimes,
  }
}
