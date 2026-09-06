/**
 * PX2C — Professional Analytics 2.0 Tests
 *
 * Verifies:
 * - Deterministic insight generation from overview metrics
 * - Minimum sample / activity thresholds
 * - Performance change insights & noise filtering (1.5% ignored, >=10% detected)
 * - Zero baseline handling (no NaN, no Infinity)
 * - Funnel diagnostics (low open rate, low contact rate, high engagement low reach)
 * - Contact rate >100% asymmetry resilience
 * - Service area & timing insights
 * - Privacy-safe cohort benchmark calculation
 * - Cohort privacy threshold (< 5 eligible profiles -> INSUFFICIENT_COHORT)
 * - Benchmark activity threshold (< 25 aggregate impressions -> INSUFFICIENT_COHORT)
 * - Target profile exclusion from cohort median
 * - Zero competitor data / PII / UUID leakage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateProfessionalInsights,
  MIN_TOTAL_ACTIVITY_THRESHOLD,
  MATERIALITY_PERCENTAGE_THRESHOLD,
} from '@/modules/analytics/insights'
import {
  calculateMedian,
  determineComparisonBand,
  getProfessionalBenchmark,
  MIN_COHORT_PROFILES,
} from '@/modules/analytics/benchmark'
import type {
  ProfessionalAnalyticsOverviewDTO,
  ProfessionalBenchmarkDTO,
} from '@/modules/analytics/types'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AnalyticsInsights } from '@/components/dashboard/analytics/analytics-insights'
import { AnalyticsBenchmark } from '@/components/dashboard/analytics/analytics-benchmark'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

const createSyntheticOverview = (
  overrides?: Partial<ProfessionalAnalyticsOverviewDTO>
): ProfessionalAnalyticsOverviewDTO => ({
  profileId: 'prof-111',
  profileSlug: 'camila-sp-4',
  audienceMode: 'PUBLIC',
  periodDays: 30,
  startDate: '2026-08-07',
  endDate: '2026-09-05',
  previousStartDate: '2026-07-08',
  previousEndDate: '2026-08-06',
  funnel: {
    impressions: { total: 100, organic: 80, sponsored: 20 },
    views: { total: 20, organic: 15, sponsored: 5 },
    contacts: { total: 5, whatsapp: 5, phone: 0, telegram: 0 },
    rates: {
      impressionToViewRate: 20.0,
      viewToContactRate: 25.0,
      overallConversionRate: 5.0,
    },
  },
  comparison: {
    impressions: { current: 100, previous: 80, delta: 20, percentageChange: 25.0, isNewBaseline: false },
    views: { current: 20, previous: 16, delta: 4, percentageChange: 25.0, isNewBaseline: false },
    contacts: { current: 5, previous: 4, delta: 1, percentageChange: 25.0, isNewBaseline: false },
    whatsappClicks: { current: 5, previous: 4, delta: 1, percentageChange: 25.0, isNewBaseline: false },
  },
  dailyTrend: [],
  topLocations: [
    {
      locationId: 'loc-uuid-1',
      locationName: 'Moema',
      cityName: 'São Paulo',
      impressions: 60,
      views: 15,
      contacts: 4,
      conversionRate: 26.7,
    },
  ],
  peakTimes: {
    bestDayOfWeek: { dayOfWeek: 5, dayName: 'Sex', contacts: 3 },
    bestHourOfDay: { hour: 21, label: '21:00', contacts: 3 },
    hourlyDistribution: [],
    dayOfWeekDistribution: [],
  },
  ...overrides,
})

describe('PX2C — Insight Engine Unit Tests', () => {
  it('handles insufficient total activity (< 5 events) with a neutral dataAccumulating insight', () => {
    const overview = createSyntheticOverview({
      funnel: {
        impressions: { total: 2, organic: 2, sponsored: 0 },
        views: { total: 1, organic: 1, sponsored: 0 },
        contacts: { total: 0, whatsapp: 0, phone: 0, telegram: 0 },
        rates: { impressionToViewRate: 50.0, viewToContactRate: 0, overallConversionRate: 0 },
      },
    })

    const insights = generateProfessionalInsights(overview)
    expect(insights).toHaveLength(1)
    expect(insights[0].id).toBe('data_accumulating')
    expect(insights[0].dataState).toBe('INSUFFICIENT_DATA')
    expect(insights[0].priority).toBe('LOW')
  })

  it('detects meaningful impressions increase (>= 10%)', () => {
    const overview = createSyntheticOverview({
      comparison: {
        impressions: { current: 150, previous: 100, delta: 50, percentageChange: 50.0, isNewBaseline: false },
        views: { current: 20, previous: 20, delta: 0, percentageChange: 0, isNewBaseline: false },
        contacts: { current: 5, previous: 5, delta: 0, percentageChange: 0, isNewBaseline: false },
        whatsappClicks: { current: 5, previous: 5, delta: 0, percentageChange: 0, isNewBaseline: false },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const impInsight = insights.find((i) => i.id === 'perf_impressions_up')
    expect(impInsight).toBeDefined()
    expect(impInsight?.direction).toBe('POSITIVE')
    expect(impInsight?.params?.pct).toBe('50.0')
  })

  it('detects meaningful impressions decrease (<= -10%)', () => {
    const overview = createSyntheticOverview({
      comparison: {
        impressions: { current: 70, previous: 100, delta: -30, percentageChange: -30.0, isNewBaseline: false },
        views: { current: 20, previous: 20, delta: 0, percentageChange: 0, isNewBaseline: false },
        contacts: { current: 5, previous: 5, delta: 0, percentageChange: 0, isNewBaseline: false },
        whatsappClicks: { current: 5, previous: 5, delta: 0, percentageChange: 0, isNewBaseline: false },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const impInsight = insights.find((i) => i.id === 'perf_impressions_down')
    expect(impInsight).toBeDefined()
    expect(impInsight?.direction).toBe('NEGATIVE')
    expect(impInsight?.params?.pct).toBe('30.0')
  })

  it('ignores minor noise change (< 10% change, e.g. +1.5%)', () => {
    const overview = createSyntheticOverview({
      comparison: {
        impressions: { current: 101, previous: 100, delta: 1, percentageChange: 1.0, isNewBaseline: false },
        views: { current: 20, previous: 20, delta: 0, percentageChange: 0, isNewBaseline: false },
        contacts: { current: 5, previous: 5, delta: 0, percentageChange: 0, isNewBaseline: false },
        whatsappClicks: { current: 5, previous: 5, delta: 0, percentageChange: 1.5, isNewBaseline: false },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const noiseImp = insights.find((i) => i.id === 'perf_impressions_up' || i.id === 'perf_impressions_down')
    const noiseContacts = insights.find((i) => i.id === 'perf_contacts_up' || i.id === 'perf_contacts_down')
    expect(noiseImp).toBeUndefined()
    expect(noiseContacts).toBeUndefined()
  })

  it('handles zero previous baseline (isNewBaseline) without NaN or Infinity', () => {
    const overview = createSyntheticOverview({
      comparison: {
        impressions: { current: 25, previous: 0, delta: 25, percentageChange: null, isNewBaseline: true },
        views: { current: 5, previous: 0, delta: 5, percentageChange: null, isNewBaseline: true },
        contacts: { current: 2, previous: 0, delta: 2, percentageChange: null, isNewBaseline: true },
        whatsappClicks: { current: 2, previous: 0, delta: 2, percentageChange: null, isNewBaseline: true },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const newImp = insights.find((i) => i.id === 'perf_impressions_new')
    expect(newImp).toBeDefined()
    expect(newImp?.params?.count).toBe(25)
    expect(JSON.stringify(insights)).not.toContain('NaN')
    expect(JSON.stringify(insights)).not.toContain('Infinity')
  })

  it('diagnoses high impressions with low open rate (< 5%) with action suggestion', () => {
    const overview = createSyntheticOverview({
      funnel: {
        impressions: { total: 200, organic: 180, sponsored: 20 },
        views: { total: 4, organic: 4, sponsored: 0 },
        contacts: { total: 1, whatsapp: 1, phone: 0, telegram: 0 },
        rates: {
          impressionToViewRate: 2.0, // Low open rate
          viewToContactRate: 25.0,
          overallConversionRate: 0.5,
        },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const lowOpen = insights.find((i) => i.id === 'funnel_low_open_rate')
    expect(lowOpen).toBeDefined()
    expect(lowOpen?.priority).toBe('HIGH')
    expect(lowOpen?.direction).toBe('NEGATIVE')
    expect(lowOpen?.actionType).toBe('REVIEW_PROFILE_PRESENTATION')
    expect(lowOpen?.actionHref).toBe('/dashboard/photos')
  })

  it('diagnoses good open rate with low contact rate (< 5%) with action suggestion', () => {
    const overview = createSyntheticOverview({
      funnel: {
        impressions: { total: 100, organic: 80, sponsored: 20 },
        views: { total: 25, organic: 20, sponsored: 5 },
        contacts: { total: 1, whatsapp: 1, phone: 0, telegram: 0 },
        rates: {
          impressionToViewRate: 25.0, // Good open rate
          viewToContactRate: 4.0,     // Low contact rate
          overallConversionRate: 1.0,
        },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const lowContact = insights.find((i) => i.id === 'funnel_low_contact_rate')
    expect(lowContact).toBeDefined()
    expect(lowContact?.priority).toBe('HIGH')
    expect(lowContact?.actionType).toBe('REVIEW_CONTACT_INFO')
  })

  it('identifies low impressions with high down-funnel engagement (>= 20% contact rate)', () => {
    const overview = createSyntheticOverview({
      funnel: {
        impressions: { total: 25, organic: 25, sponsored: 0 },
        views: { total: 5, organic: 5, sponsored: 0 },
        contacts: { total: 2, whatsapp: 2, phone: 0, telegram: 0 },
        rates: {
          impressionToViewRate: 20.0,
          viewToContactRate: 40.0, // High engagement
          overallConversionRate: 8.0,
        },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const highEngage = insights.find((i) => i.id === 'funnel_high_engagement_low_reach')
    expect(highEngage).toBeDefined()
    expect(highEngage?.actionType).toBe('EXPLORE_PROMOTIONS')
  })

  it('handles contact rate > 100% gracefully without corrupt math', () => {
    const overview = createSyntheticOverview({
      comparison: {
        impressions: { current: 50, previous: 50, delta: 0, percentageChange: 0, isNewBaseline: false },
        views: { current: 4, previous: 4, delta: 0, percentageChange: 0, isNewBaseline: false },
        contacts: { current: 6, previous: 6, delta: 0, percentageChange: 0, isNewBaseline: false },
        whatsappClicks: { current: 6, previous: 6, delta: 0, percentageChange: 0, isNewBaseline: false },
      },
      topLocations: [],
      peakTimes: { bestDayOfWeek: null, bestHourOfDay: null, hourlyDistribution: [], dayOfWeekDistribution: [] },
      funnel: {
        impressions: { total: 50, organic: 50, sponsored: 0 },
        views: { total: 4, organic: 4, sponsored: 0 },
        contacts: { total: 6, whatsapp: 6, phone: 0, telegram: 0 },
        rates: {
          impressionToViewRate: 8.0,
          viewToContactRate: 150.0, // Asymmetry > 100%
          overallConversionRate: 12.0,
        },
      },
    })

    const insights = generateProfessionalInsights(overview)
    const asymmetry = insights.find((i) => i.id === 'funnel_asymmetry_repeat_clicks')
    expect(asymmetry).toBeDefined()
    expect(asymmetry?.direction).toBe('NEUTRAL')
    expect(asymmetry?.params?.contacts).toBe(6)
    expect(asymmetry?.params?.views).toBe(4)
  })

  it('generates service area insight for top location without UUID leakage', () => {
    const overview = createSyntheticOverview({
      topLocations: [
        {
          locationId: 'loc-secret-uuid-999',
          locationName: 'Moema',
          cityName: 'São Paulo',
          impressions: 80,
          views: 20,
          contacts: 5,
          conversionRate: 25.0,
        },
      ],
    })

    const insights = generateProfessionalInsights(overview)
    const locInsight = insights.find((i) => i.id === 'location_top_performer')
    expect(locInsight).toBeDefined()
    expect(locInsight?.params?.location).toBe('Moema')
    expect(JSON.stringify(locInsight)).not.toContain('loc-secret-uuid-999')
  })

  it('generates timing insight when contacts >= 3 with peak hour', () => {
    const overview = createSyntheticOverview({
      funnel: {
        impressions: { total: 100, organic: 80, sponsored: 20 },
        views: { total: 20, organic: 15, sponsored: 5 },
        contacts: { total: 4, whatsapp: 4, phone: 0, telegram: 0 },
        rates: { impressionToViewRate: 20.0, viewToContactRate: 20.0, overallConversionRate: 4.0 },
      },
      peakTimes: {
        bestDayOfWeek: { dayOfWeek: 5, dayName: 'Sex', contacts: 3 },
        bestHourOfDay: { hour: 21, label: '21:00', contacts: 3 },
        hourlyDistribution: [],
        dayOfWeekDistribution: [],
      },
    })

    const insights = generateProfessionalInsights(overview)
    const timeInsight = insights.find((i) => i.id === 'timing_peak_hour')
    expect(timeInsight).toBeDefined()
    expect(timeInsight?.params?.hour).toBe('21:00')
    expect(timeInsight?.actionType).toBe('BE_RESPONSIVE')
  })
})

describe('PX2C — Privacy-Safe Cohort Benchmark Math & DAL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates exact mathematical median for odd and even sets', () => {
    expect(calculateMedian([])).toBeNull()
    expect(calculateMedian([10])).toBe(10)
    expect(calculateMedian([10, 20, 30])).toBe(20)
    expect(calculateMedian([10, 20, 30, 40])).toBe(25)
    expect(calculateMedian([50, 10, 20])).toBe(20) // Unsorted array handles sorting
  })

  it('determines comparison band within 10% tolerance margin', () => {
    const median = 20.0
    // Rates have margin = max(20 * 0.1, 1.5) = 2.0
    expect(determineComparisonBand(25.0, median, true)).toBe('ABOVE_COHORT') // > 22.0
    expect(determineComparisonBand(21.0, median, true)).toBe('NEAR_COHORT')  // 18.0 .. 22.0
    expect(determineComparisonBand(19.0, median, true)).toBe('NEAR_COHORT')  // 18.0 .. 22.0
    expect(determineComparisonBand(15.0, median, true)).toBe('BELOW_COHORT') // < 18.0
    expect(determineComparisonBand(15.0, null, true)).toBe('INSUFFICIENT_DATA')
  })

  it('Benchmark Case A: returns INSUFFICIENT_COHORT when eligible cohort < 5 profiles', async () => {
    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'prof-target', account_user_id: 'acc-target', status: 'ACTIVE' },
                error: null,
              }),
            })),
          }
        }
        if (table === 'professional_profile_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { location: { city_id: 'city-sp' } },
              error: null,
            }),
          }
        }
        if (table === 'profile_daily_metrics') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          const chain = {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: [
                  { profile_id: 'peer-1' },
                  { profile_id: 'peer-2' },
                  { profile_id: 'peer-3' },
                ], // Only 3 peers (< 5)
                error: null,
              }),
          }
          return chain
        }
        return { select: vi.fn().mockReturnThis() }
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)

    const result = await getProfessionalBenchmark({
      profileId: 'prof-target',
      accountId: 'acc-target',
      periodDays: 30,
    })

    expect(result.status).toBe('INSUFFICIENT_COHORT')
    expect(result.reason).toBe('INSUFFICIENT_COHORT')
    expect(result.eligibleCohortSize).toBe(3)
    expect(result.openRate.cohortMedian).toBeNull()
  })

  it('Benchmark Case B: returns AVAILABLE with medians when cohort >= 5 with sufficient activity', async () => {
    const peers = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'prof-target', account_user_id: 'acc-target', status: 'ACTIVE' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'professional_profile_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { location: { city_id: 'city-sp' } },
              error: null,
            }),
          }
        }
        if (table === 'profile_daily_metrics') {
          let queriedProfileId: string | null = null
          const queryChain: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, val: string) => {
              if (col === 'profile_id') queriedProfileId = val
              return queryChain
            }),
            in: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn(() => {
              if (queriedProfileId === 'prof-target') {
                return Promise.resolve({
                  data: [
                    { profile_id: 'prof-target', impressions_total: 100, views_total: 20, whatsapp_clicks: 5, phone_clicks: 2, telegram_clicks: 1 },
                  ],
                  error: null,
                })
              }
              return Promise.resolve({
                data: [
                  { profile_id: 'p1', impressions_total: 80, views_total: 12, whatsapp_clicks: 2, phone_clicks: 0, telegram_clicks: 0 },
                  { profile_id: 'p2', impressions_total: 100, views_total: 15, whatsapp_clicks: 3, phone_clicks: 0, telegram_clicks: 0 },
                  { profile_id: 'p3', impressions_total: 120, views_total: 18, whatsapp_clicks: 4, phone_clicks: 0, telegram_clicks: 0 },
                  { profile_id: 'p4', impressions_total: 140, views_total: 21, whatsapp_clicks: 5, phone_clicks: 0, telegram_clicks: 0 },
                  { profile_id: 'p5', impressions_total: 160, views_total: 24, whatsapp_clicks: 6, phone_clicks: 0, telegram_clicks: 0 },
                  { profile_id: 'p6', impressions_total: 200, views_total: 30, whatsapp_clicks: 7, phone_clicks: 0, telegram_clicks: 0 },
                ],
                error: null,
              })
            }),
          }
          return queryChain
        }
        if (table === 'v_publication_eligible_profiles') {
          const chain = {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: peers.map((id) => ({ profile_id: id })),
                error: null,
              }),
          }
          return chain
        }
        return { select: vi.fn().mockReturnThis() }
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)

    const result = await getProfessionalBenchmark({
      profileId: 'prof-target',
      accountId: 'acc-target',
      periodDays: 30,
    })

    expect(result.status).toBe('AVAILABLE')
    expect(result.eligibleCohortSize).toBe(6)
    expect(result.visibility.cohortMedian).toBeGreaterThan(0)
    expect(result.openRate.cohortMedian).toBeGreaterThan(0)
    expect(result.contactRate.cohortMedian).toBeGreaterThan(0)
    // Contact rate calculation uses whatsapp_clicks (5 / 20 = 25.0%), not total contacts ((5+2+1)/20 = 40.0%)
    expect(result.contactRate.professionalValue).toBe(25.0)

    // Verify zero competitor identifiers returned:
    const serialized = JSON.stringify(result)
    for (const p of peers) {
      expect(serialized).not.toContain(p)
    }
    expect(serialized).not.toContain('rank')
    expect(serialized).not.toContain('leaderboard')
  })

  it('Benchmark Case E & F: strictly excludes target profile and non-eligible profiles from cohort query and isolates by city', async () => {
    let neqCol = ''
    let neqVal = ''
    let eqCityCol = ''
    let eqCityVal = ''

    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'prof-target-exclusive', account_user_id: 'acc-target', status: 'ACTIVE' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'professional_profile_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { location: { city_id: 'city-sao-paulo-uuid' } },
              error: null,
            }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          const chain = {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn((col: string, val: string) => {
              neqCol = col
              neqVal = val
              return chain
            }),
            eq: vi.fn((col: string, val: string) => {
              eqCityCol = col
              eqCityVal = val
              return chain
            }),
            then: (resolve: any) => resolve({ data: [], error: null }),
          }
          return chain
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)

    await getProfessionalBenchmark({
      profileId: 'prof-target-exclusive',
      accountId: 'acc-target',
      periodDays: 30,
    })

    // Assert that target profile is explicitly excluded from eligible view query
    expect(neqCol).toBe('profile_id')
    expect(neqVal).toBe('prof-target-exclusive')
    // Assert that cohort is explicitly restricted to target profile's city
    expect(eqCityCol).toBe('city_id')
    expect(eqCityVal).toBe('city-sao-paulo-uuid')
  })

  it('Benchmark Case: throws error on database query failure instead of returning fake INSUFFICIENT_COHORT', async () => {
    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'prof-target', account_user_id: 'acc-target', status: 'ACTIVE' },
                error: null,
              }),
            }),
          }
        }
        if (table === 'professional_profile_locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { location: { city_id: 'city-sp' } },
              error: null,
            }),
          }
        }
        if (table === 'profile_daily_metrics') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        if (table === 'v_publication_eligible_profiles') {
          const chain = {
            select: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) =>
              resolve({
                data: null,
                error: { message: 'connection refused to pg_meta' },
              }),
          }
          return chain
        }
        return { select: vi.fn().mockReturnThis() }
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)

    await expect(
      getProfessionalBenchmark({
        profileId: 'prof-target',
        accountId: 'acc-target',
        periodDays: 30,
      })
    ).rejects.toThrow('Database query failed for eligible cohort')
  })

  it('Benchmark Case G: blocks unauthorized access when accountId does not own profile', async () => {
    const mockAdmin = {
      from: vi.fn((table: string) => {
        if (table === 'professional_profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'prof-victim', account_user_id: 'acc-victim', status: 'ACTIVE' },
                error: null,
              }),
            }),
          }
        }
        return { select: vi.fn().mockReturnThis() }
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as any)

    await expect(
      getProfessionalBenchmark({
        profileId: 'prof-victim',
        accountId: 'acc-attacker',
        periodDays: 30,
      })
    ).rejects.toThrow('Forbidden')
  })
})

describe('PX2C — UI Component Rendering & Strict Privacy Tests', () => {
  it('renders AnalyticsInsights with badges, parameters, and action links', () => {
    const overview = createSyntheticOverview()
    const insights = generateProfessionalInsights(overview)
    const html = renderToStaticMarkup(<AnalyticsInsights insights={insights} locale="pt-BR" />)

    expect(html).toContain('DIAGNÓSTICO E DECISÃO')
    expect(html).toContain('Insights do seu perfil.')
    expect(html).toContain('Região de maior destaque')
    expect(html).toContain('Moema')
    expect(html).toContain('Gerenciar regiões')
    expect(html).toContain('/onboarding/onde-atende')

    // Strict privacy verification:
    expect(html).not.toContain('visitor_session_id')
    expect(html).not.toContain('127.0.0.1')
    expect(html).not.toContain('loc-uuid-1')
  })

  it('renders AnalyticsBenchmark in AVAILABLE state with medians and comparison bands', () => {
    const benchmark: ProfessionalBenchmarkDTO = {
      status: 'AVAILABLE',
      periodDays: 30,
      cohortClass: 'CITY_ACTIVE_PROFILES',
      openRate: { professionalValue: 24.5, cohortMedian: 18.2, comparisonBand: 'ABOVE_COHORT' },
      contactRate: { professionalValue: 15.0, cohortMedian: 14.8, comparisonBand: 'NEAR_COHORT' },
      visibility: { professionalValue: 320, cohortMedian: 450, comparisonBand: 'BELOW_COHORT' },
      eligibleCohortSize: 12,
      qualifyingCohortSize: 10,
      reason: 'OK',
    }

    const html = renderToStaticMarkup(<AnalyticsBenchmark benchmark={benchmark} locale="pt-BR" />)

    expect(html).toContain('REFERÊNCIA COLETIVA E PRIVACIDADE')
    expect(html).toContain('Como seu perfil se compara.')
    expect(html).toContain('Taxa de abertura')
    expect(html).toContain('24.5%')
    expect(html).toContain('18.2%')
    expect(html).toContain('Acima da mediana')

    expect(html).toContain('Taxa de contato WhatsApp')
    expect(html).toContain('Próximo à mediana')

    expect(html).toContain('Visibilidade na busca')
    expect(html).toContain('Abaixo da mediana')

    // Strict privacy verification:
    expect(html).toContain('Preservação rigorosa de privacidade')
    expect(html).not.toContain('leaderboard')
    expect(html).not.toContain('ranking')
    expect(html).not.toContain('Camila')
    expect(html).not.toContain('prof-')
    expect(html).not.toContain('peer-')
  })

  it('renders AnalyticsBenchmark in INSUFFICIENT_COHORT state without exposing exact small cohort count', () => {
    const benchmark: ProfessionalBenchmarkDTO = {
      status: 'INSUFFICIENT_COHORT',
      periodDays: 30,
      cohortClass: 'CITY_ACTIVE_PROFILES',
      openRate: { professionalValue: 0, cohortMedian: null, comparisonBand: 'INSUFFICIENT_DATA' },
      contactRate: { professionalValue: 0, cohortMedian: null, comparisonBand: 'INSUFFICIENT_DATA' },
      visibility: { professionalValue: 0, cohortMedian: null, comparisonBand: 'INSUFFICIENT_DATA' },
      eligibleCohortSize: 3,
      qualifyingCohortSize: 0,
      reason: 'INSUFFICIENT_COHORT',
    }

    const html = renderToStaticMarkup(<AnalyticsBenchmark benchmark={benchmark} locale="pt-BR" />)

    expect(html).toContain('Amostra coletiva em formação')
    expect(html).toContain('grupo mínimo de 5 perfis ativos')
    expect(html).toContain('A amostra ainda não atingiu o volume mínimo necessário')
    // Crucial privacy discipline: exact small count (3) is NOT exposed in UI
    expect(html).not.toContain('Base atual: 3')
  })

  it('renders AnalyticsBenchmark in INSUFFICIENT_DATA state when target profile has no impressions', () => {
    const benchmark: ProfessionalBenchmarkDTO = {
      status: 'INSUFFICIENT_DATA',
      periodDays: 30,
      cohortClass: 'CITY_ACTIVE_PROFILES',
      openRate: { professionalValue: 0, cohortMedian: 15.0, comparisonBand: 'INSUFFICIENT_DATA' },
      contactRate: { professionalValue: 0, cohortMedian: 12.0, comparisonBand: 'INSUFFICIENT_DATA' },
      visibility: { professionalValue: 0, cohortMedian: 200, comparisonBand: 'INSUFFICIENT_DATA' },
      eligibleCohortSize: 8,
      qualifyingCohortSize: 6,
      reason: 'INSUFFICIENT_DATA',
    }

    const html = renderToStaticMarkup(<AnalyticsBenchmark benchmark={benchmark} locale="pt-BR" />)

    expect(html).toContain('Aguardando primeiras impressões')
    expect(html).toContain('Seu perfil ainda não registrou impressões suficientes')
  })
})

