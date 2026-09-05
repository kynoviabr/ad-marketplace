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

export interface HourlyMetric {
  impressions: number
  views: number
  contacts: number
}

export type HourlyBreakdown = Record<string, HourlyMetric>

export interface LocationMetricRecord {
  location_id: string | null
  impressions: number
  views: number
  contacts: number
}

export type LocationBreakdown = LocationMetricRecord[]

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
  location_breakdown?: LocationBreakdown
  hourly_breakdown?: HourlyBreakdown
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

// ---------------------------------------------------------------------------
// PX2A — Professional Analytics 2.0 Contracts
// ---------------------------------------------------------------------------

export type AnalyticsPeriodDays = 7 | 30 | 90

export interface MetricComparison {
  current: number
  previous: number
  delta: number
  percentageChange: number | null
  isNewBaseline: boolean
}

export interface FunnelCounts {
  total: number
  organic: number
  sponsored: number
}

export interface FunnelContactCounts {
  total: number
  whatsapp: number
  phone: number
  telegram: number
}

export interface FunnelConversionRates {
  /** Impression-to-View rate in percent (0..100), 0 if impressions === 0 */
  impressionToViewRate: number
  /** View-to-Contact rate in percent (0..100), 0 if views === 0 */
  viewToContactRate: number
  /** Overall conversion rate (contacts / impressions) in percent, 0 if impressions === 0 */
  overallConversionRate: number
}

export interface DailyTrendPoint {
  date: string // YYYY-MM-DD
  dayOfWeek: number // 0 (Sunday) to 6 (Saturday)
  impressionsTotal: number
  impressionsOrganic: number
  impressionsSponsored: number
  viewsTotal: number
  viewsOrganic: number
  viewsSponsored: number
  contactsTotal: number
  whatsappClicks: number
  phoneClicks: number
  telegramClicks: number
}

export interface TopLocationMetric {
  locationId: string | null
  locationName: string
  cityName: string
  impressions: number
  views: number
  contacts: number
  conversionRate: number
}

export interface HourlyDistributionItem {
  hour: number // 0..23
  label: string // e.g. "00:00", "01:00", ...
  impressions: number
  views: number
  contacts: number
}

export interface DayOfWeekDistributionItem {
  dayOfWeek: number // 0..6 (0 = Sunday)
  dayName: string // e.g. "Dom", "Seg", "Ter", ...
  impressions: number
  views: number
  contacts: number
}

export interface PeakTimesMetric {
  bestDayOfWeek: { dayOfWeek: number; dayName: string; contacts: number } | null
  bestHourOfDay: { hour: number; label: string; contacts: number } | null
  hourlyDistribution: HourlyDistributionItem[]
  dayOfWeekDistribution: DayOfWeekDistributionItem[]
}

export interface ProfessionalAnalyticsOverviewDTO {
  profileId: string
  profileSlug: string
  audienceMode: 'PUBLIC' | 'VIP_ONLY'
  periodDays: AnalyticsPeriodDays
  startDate: string
  endDate: string
  previousStartDate: string
  previousEndDate: string
  funnel: {
    impressions: FunnelCounts
    views: FunnelCounts
    contacts: FunnelContactCounts
    rates: FunnelConversionRates
  }
  comparison: {
    impressions: MetricComparison
    views: MetricComparison
    contacts: MetricComparison
    whatsappClicks: MetricComparison
  }
  dailyTrend: DailyTrendPoint[]
  topLocations: TopLocationMetric[]
  peakTimes: PeakTimesMetric
}
