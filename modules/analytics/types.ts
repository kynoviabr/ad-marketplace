/**
 * Analytics Domain Types — FASE 09
 *
 * Canonical TypeScript types for event tracking, daily aggregates,
 * advertiser metrics DTOs, and admin metrics DTOs.
 */

import type { PlacementType } from '@/modules/search/types'

export type AnalyticsEventType =
  | 'SEARCH_PERFORMED'
  | 'PROFILE_IMPRESSION'
  | 'PROFILE_VIEWED'
  | 'CONTACT_WHATSAPP_CLICKED'
  | 'CONTACT_PHONE_CLICKED'
  | 'CONTACT_TELEGRAM_CLICKED'
  | 'BOOST_ACTIVATED'

export type ReferrerType = 'SEARCH' | 'DIRECT' | 'OTHER'

export interface AnalyticsEvent {
  id: string
  event_key: string | null
  event_type: AnalyticsEventType
  occurred_at: string
  received_at: string
  profile_id: string | null
  city_id: string | null
  location_id: string | null
  placement_type: PlacementType | null
  boost_campaign_id: string | null
  result_page: number | null
  result_position: number | null
  total_profiles: number | null
  sponsored_count: number | null
  has_filters: boolean | null
  visitor_session_id: string | null
  referrer_type: ReferrerType | null
}

export interface ProfileDailyMetric {
  id: string
  profile_id: string
  metric_date: string
  impressions_total: number
  impressions_organic: number
  impressions_sponsored: number
  views_total: number
  views_organic: number
  views_sponsored: number
  whatsapp_clicks: number
  phone_clicks: number
  telegram_clicks: number
  created_at: string
  updated_at: string
}

export interface PlatformDailyMetric {
  id: string
  metric_date: string
  searches_total: number
  searches_with_filters: number
  searches_zero_results: number
  impressions_total: number
  impressions_organic: number
  impressions_sponsored: number
  views_total: number
  whatsapp_clicks_total: number
  whatsapp_clicks_organic: number
  whatsapp_clicks_sponsored: number
  active_advertisers: number | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Client DTOs (Clean, Sanitized, Zero Visitor Identity)
// ---------------------------------------------------------------------------

export interface AdvertiserMetricsSummaryDTO {
  impressionsTotal: number
  impressionsOrganic: number
  impressionsSponsored: number
  profileViews: number
  whatsappClicks: number
  ctr: number // 0 if impressions === 0
  days: 7 | 30 | 90
  dailyBreakdown: Array<{
    date: string
    impressionsTotal: number
    impressionsOrganic: number
    impressionsSponsored: number
    profileViews: number
    whatsappClicks: number
  }>
}

export interface AdminPlatformMetricsDTO {
  periodDays: number
  searchesTotal: number
  searchesWithFilters: number
  searchesZeroResults: number
  impressionsTotal: number
  impressionsOrganic: number
  impressionsSponsored: number
  whatsappClicksTotal: number
  whatsappClicksOrganic: number
  whatsappClicksSponsored: number
  overallCtr: number
  contactClicksPerActiveAdvertiser: number
  activeAdvertisersCount: number
  topProfiles: Array<{
    profileId: string
    stageName: string
    impressionsTotal: number
    whatsappClicks: number
    ctr: number
  }>
  topLocations: Array<{
    locationId: string
    locationName: string
    cityName: string
    impressionsTotal: number
    whatsappClicks: number
  }>
}

export type AnalyticsActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
