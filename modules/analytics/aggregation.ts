/**
 * Analytics Daily Aggregation — FASE 09
 *
 * Deterministic, idempotent daily metrics rollup for profile_daily_metrics
 * and platform_daily_metrics.
 *
 * Designed to be executed manually by admin (MVP) or scheduled via cron.
 * Re-running for the same date completely replaces daily counters with
 * fresh calculations without double-counting. Raw events are never mutated.
 */

import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export interface AggregationResult {
  metricDate: string
  profilesProcessed: number
  platformSearches: number
  platformImpressions: number
  platformClicks: number
}

export function getSaoPauloDateStr(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

/**
 * Aggregates raw events for a specific calendar date (YYYY-MM-DD) in America/Sao_Paulo.
 */
export async function aggregateDailyMetrics(targetDateStr?: string): Promise<AggregationResult> {
  const admin = createAdminClient()

  // 1. Determine target date string (YYYY-MM-DD) in America/Sao_Paulo
  let dateStr = targetDateStr
  if (!dateStr) {
    // Default: yesterday in America/Sao_Paulo timezone
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
    dateStr = getSaoPauloDateStr(yesterday)
  }

  // 2. Define Day Window in America/Sao_Paulo (UTC -03:00)
  const startIso = `${dateStr}T00:00:00.000-03:00`
  const endIso = `${dateStr}T23:59:59.999-03:00`

  // 3. Query all events in window
  const { data: rawEvents, error: evError } = await admin
    .from('analytics_events')
    .select('*')
    .gte('occurred_at', startIso)
    .lte('occurred_at', endIso)

  if (evError) {
    throw new Error(`[analytics:aggregation] Failed to read raw events: ${evError.message}`)
  }

  const events = rawEvents || []

  // 4. Aggregate by Profile
  const profileMap = new Map<
    string,
    {
      impressions_total: number
      impressions_organic: number
      impressions_sponsored: number
      views_total: number
      views_organic: number
      views_sponsored: number
      whatsapp_clicks: number
      phone_clicks: number
      telegram_clicks: number
    }
  >()

  // Platform counters
  let searchesTotal = 0
  let searchesWithFilters = 0
  let searchesZeroResults = 0
  let platformImpressionsTotal = 0
  let platformImpressionsOrganic = 0
  let platformImpressionsSponsored = 0
  let platformViewsTotal = 0
  let platformClicksTotal = 0
  let platformClicksOrganic = 0
  let platformClicksSponsored = 0

  for (const ev of events) {
    if (ev.event_type === 'SEARCH_PERFORMED') {
      searchesTotal += 1
      if (ev.has_filters) searchesWithFilters += 1
      if (ev.total_profiles === 0) searchesZeroResults += 1
    }

    if (ev.profile_id) {
      if (!profileMap.has(ev.profile_id)) {
        profileMap.set(ev.profile_id, {
          impressions_total: 0,
          impressions_organic: 0,
          impressions_sponsored: 0,
          views_total: 0,
          views_organic: 0,
          views_sponsored: 0,
          whatsapp_clicks: 0,
          phone_clicks: 0,
          telegram_clicks: 0,
        })
      }
      const p = profileMap.get(ev.profile_id)!

      if (ev.event_type === 'PROFILE_IMPRESSION') {
        p.impressions_total += 1
        platformImpressionsTotal += 1
        if (ev.placement_type === 'SPONSORED') {
          p.impressions_sponsored += 1
          platformImpressionsSponsored += 1
        } else {
          p.impressions_organic += 1
          platformImpressionsOrganic += 1
        }
      } else if (ev.event_type === 'PROFILE_VIEWED') {
        p.views_total += 1
        platformViewsTotal += 1
        if (ev.placement_type === 'SPONSORED') {
          p.views_sponsored += 1
        } else {
          p.views_organic += 1
        }
      } else if (ev.event_type === 'CONTACT_WHATSAPP_CLICKED') {
        p.whatsapp_clicks += 1
        platformClicksTotal += 1
        if (ev.placement_type === 'SPONSORED') {
          platformClicksSponsored += 1
        } else {
          platformClicksOrganic += 1
        }
      } else if (ev.event_type === 'CONTACT_PHONE_CLICKED') {
        p.phone_clicks += 1
      } else if (ev.event_type === 'CONTACT_TELEGRAM_CLICKED') {
        p.telegram_clicks += 1
      }
    }
  }

  // 5. Upsert into profile_daily_metrics (Deterministic overwrite)
  for (const [profileId, metrics] of profileMap.entries()) {
    const { error: pErr } = await admin
      .from('profile_daily_metrics')
      .upsert(
        {
          profile_id: profileId,
          metric_date: dateStr,
          impressions_total: metrics.impressions_total,
          impressions_organic: metrics.impressions_organic,
          impressions_sponsored: metrics.impressions_sponsored,
          views_total: metrics.views_total,
          views_organic: metrics.views_organic,
          views_sponsored: metrics.views_sponsored,
          whatsapp_clicks: metrics.whatsapp_clicks,
          phone_clicks: metrics.phone_clicks,
          telegram_clicks: metrics.telegram_clicks,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,metric_date' }
      )

    if (pErr) {
      console.error(`[analytics:aggregation] Error upserting profile ${profileId}:`, pErr.message)
    }
  }

  // 6. Active Advertisers Snapshot
  const { count: activeAdvertisers } = await admin
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')

  // 7. Upsert into platform_daily_metrics
  const { error: platErr } = await admin
    .from('platform_daily_metrics')
    .upsert(
      {
        metric_date: dateStr,
        searches_total: searchesTotal,
        searches_with_filters: searchesWithFilters,
        searches_zero_results: searchesZeroResults,
        impressions_total: platformImpressionsTotal,
        impressions_organic: platformImpressionsOrganic,
        impressions_sponsored: platformImpressionsSponsored,
        views_total: platformViewsTotal,
        whatsapp_clicks_total: platformClicksTotal,
        whatsapp_clicks_organic: platformClicksOrganic,
        whatsapp_clicks_sponsored: platformClicksSponsored,
        active_advertisers: activeAdvertisers || 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'metric_date' }
    )

  if (platErr) {
    console.error('[analytics:aggregation] Error upserting platform metrics:', platErr.message)
  }

  return {
    metricDate: dateStr,
    profilesProcessed: profileMap.size,
    platformSearches: searchesTotal,
    platformImpressions: platformImpressionsTotal,
    platformClicks: platformClicksTotal,
  }
}
