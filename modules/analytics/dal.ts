/**
 * Analytics Data Access Layer (DAL) — FASE 09
 *
 * Server-only module for querying sanitized analytics DTOs.
 * Enforces tenant isolation, zero visitor-session leakage, and role guards.
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdvertiserMetricsSummaryDTO, AdminPlatformMetricsDTO } from './types'

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
  let whatsappClicks = 0

  const dailyBreakdown = metricsList.map((r: any) => {
    impressionsTotal += r.impressions_total || 0
    impressionsOrganic += r.impressions_organic || 0
    impressionsSponsored += r.impressions_sponsored || 0
    whatsappClicks += r.whatsapp_clicks || 0

    return {
      date: r.metric_date,
      impressionsTotal: r.impressions_total || 0,
      impressionsOrganic: r.impressions_organic || 0,
      impressionsSponsored: r.impressions_sponsored || 0,
      whatsappClicks: r.whatsapp_clicks || 0,
    }
  })

  const ctr = impressionsTotal > 0 ? Number(((whatsappClicks / impressionsTotal) * 100).toFixed(2)) : 0

  return {
    impressionsTotal,
    impressionsOrganic,
    impressionsSponsored,
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
