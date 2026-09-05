/**
 * PX2A — Funnel Contracts & Metrics Integrity Test Suite
 *
 * Verifies:
 * - Funnel stages: Impression -> Profile View -> Contact Intent (WhatsApp, Phone, Telegram)
 * - Safe conversion rate calculations without division-by-zero errors (0 rate, never NaN / Infinity)
 * - Hourly breakdown rollup (24 buckets, formatHourLabel, peak hour detection)
 * - Day-of-week distribution (7 buckets, peak day detection)
 * - Top locations ranking and conversion rate calculation
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSafeRate,
  calculateMetricComparison,
  formatHourLabel,
  calculatePeakTimes,
  calculateTopLocations,
} from '@/modules/analytics/funnel'
import type { ProfileDailyMetric } from '@/modules/analytics/types'

describe('PX2A — Funnel Contracts & Metrics Integrity', () => {
  describe('calculateSafeRate', () => {
    it('calculates exact conversion rate to 2 decimal places', () => {
      expect(calculateSafeRate(25, 100)).toBe(25)
      expect(calculateSafeRate(1, 3)).toBe(33.33)
      expect(calculateSafeRate(7, 80)).toBe(8.75)
    })

    it('returns 0 when denominator is 0 (safe zero division)', () => {
      expect(calculateSafeRate(0, 0)).toBe(0)
      expect(calculateSafeRate(15, 0)).toBe(0)
      expect(Number.isNaN(calculateSafeRate(15, 0))).toBe(false)
      expect(Number.isFinite(calculateSafeRate(15, 0))).toBe(true)
    })

    it('returns 0 when numerator is 0', () => {
      expect(calculateSafeRate(0, 500)).toBe(0)
    })

    it('handles negative or undefined values defensively', () => {
      expect(calculateSafeRate(-5, 100)).toBe(0)
      expect(calculateSafeRate(10, -100)).toBe(0)
      expect(calculateSafeRate(undefined as any, 100)).toBe(0)
      expect(calculateSafeRate(10, null as any)).toBe(0)
    })
  })

  describe('formatHourLabel', () => {
    it('formats single-digit and double-digit hours with leading zeros', () => {
      expect(formatHourLabel(0)).toBe('00:00')
      expect(formatHourLabel(9)).toBe('09:00')
      expect(formatHourLabel(14)).toBe('14:00')
      expect(formatHourLabel(23)).toBe('23:00')
    })

    it('clamps values outside 0..23 range', () => {
      expect(formatHourLabel(-3)).toBe('00:00')
      expect(formatHourLabel(25)).toBe('23:00')
    })
  })

  describe('calculatePeakTimes', () => {
    it('initializes full 24-hour and 7-day distribution even with empty data', () => {
      const result = calculatePeakTimes([])
      expect(result.hourlyDistribution).toHaveLength(24)
      expect(result.dayOfWeekDistribution).toHaveLength(7)
      expect(result.bestHourOfDay).toBeNull()
      expect(result.bestDayOfWeek).toBeNull()

      // First and last hours
      expect(result.hourlyDistribution[0].label).toBe('00:00')
      expect(result.hourlyDistribution[23].label).toBe('23:00')

      // First and last days
      expect(result.dayOfWeekDistribution[0].dayName).toBe('Dom')
      expect(result.dayOfWeekDistribution[6].dayName).toBe('Sáb')
    })

    it('accurately aggregates hourly and day-of-week metrics and identifies peak times', () => {
      const metrics: ProfileDailyMetric[] = [
        {
          id: '1',
          profile_id: 'prof-1',
          metric_date: '2026-09-01', // Tuesday (dayOfWeek = 2)
          impressions_total: 100,
          impressions_organic: 80,
          impressions_sponsored: 20,
          views_total: 20,
          views_organic: 15,
          views_sponsored: 5,
          whatsapp_clicks: 4,
          phone_clicks: 1,
          telegram_clicks: 0,
          hourly_breakdown: {
            '14': { impressions: 40, views: 10, contacts: 3 },
            '20': { impressions: 60, views: 10, contacts: 2 },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          profile_id: 'prof-1',
          metric_date: '2026-09-02', // Wednesday (dayOfWeek = 3)
          impressions_total: 150,
          impressions_organic: 120,
          impressions_sponsored: 30,
          views_total: 35,
          views_organic: 30,
          views_sponsored: 5,
          whatsapp_clicks: 8,
          phone_clicks: 0,
          telegram_clicks: 0,
          hourly_breakdown: {
            '14': { impressions: 50, views: 15, contacts: 5 },
            '21': { impressions: 100, views: 20, contacts: 3 },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const result = calculatePeakTimes(metrics)

      // Hour 14 had 3 + 5 = 8 contacts (highest)
      expect(result.bestHourOfDay).toEqual({
        hour: 14,
        label: '14:00',
        contacts: 8,
      })

      // Wednesday had 8 contacts vs Tuesday 5 contacts
      expect(result.bestDayOfWeek).toEqual({
        dayOfWeek: 3,
        dayName: 'Qua',
        contacts: 8,
      })

      // Check distribution sum for hour 14
      const h14 = result.hourlyDistribution.find((h) => h.hour === 14)
      expect(h14?.impressions).toBe(90)
      expect(h14?.views).toBe(25)
      expect(h14?.contacts).toBe(8)
    })
  })

  describe('calculateTopLocations', () => {
    it('aggregates location breakdown, attaches resolved names, and orders by contacts descending', () => {
      const metrics: ProfileDailyMetric[] = [
        {
          id: '1',
          profile_id: 'prof-1',
          metric_date: '2026-09-01',
          impressions_total: 100,
          impressions_organic: 100,
          impressions_sponsored: 0,
          views_total: 20,
          views_organic: 20,
          views_sponsored: 0,
          whatsapp_clicks: 2,
          phone_clicks: 0,
          telegram_clicks: 0,
          location_breakdown: [
            { location_id: 'loc-moema', impressions: 60, views: 12, contacts: 2 },
            { location_id: 'loc-itaim', impressions: 40, views: 8, contacts: 0 },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          profile_id: 'prof-1',
          metric_date: '2026-09-02',
          impressions_total: 120,
          impressions_organic: 120,
          impressions_sponsored: 0,
          views_total: 30,
          views_organic: 30,
          views_sponsored: 0,
          whatsapp_clicks: 5,
          phone_clicks: 0,
          telegram_clicks: 0,
          location_breakdown: [
            { location_id: 'loc-itaim', impressions: 80, views: 20, contacts: 4 },
            { location_id: 'loc-moema', impressions: 40, views: 10, contacts: 1 },
          ],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const resolvedLocations = new Map([
        ['loc-moema', { locationName: 'Moema', cityName: 'São Paulo' }],
        ['loc-itaim', { locationName: 'Itaim Bibi', cityName: 'São Paulo' }],
      ])

      const topLocations = calculateTopLocations(metrics, resolvedLocations)

      expect(topLocations).toHaveLength(2)
      // Itaim Bibi has 4 contacts total; Moema has 3 contacts total
      expect(topLocations[0].locationId).toBe('loc-itaim')
      expect(topLocations[0].locationName).toBe('Itaim Bibi')
      expect(topLocations[0].contacts).toBe(4)
      expect(topLocations[0].views).toBe(28)
      expect(topLocations[0].conversionRate).toBe(14.29) // 4 / 28 * 100

      expect(topLocations[1].locationId).toBe('loc-moema')
      expect(topLocations[1].locationName).toBe('Moema')
      expect(topLocations[1].contacts).toBe(3)
      expect(topLocations[1].views).toBe(22)
      expect(topLocations[1].conversionRate).toBe(13.64) // 3 / 22 * 100
    })

    it('returns empty array when no location metrics are recorded', () => {
      const topLocations = calculateTopLocations([], new Map())
      expect(topLocations).toEqual([])
    })
  })
})
