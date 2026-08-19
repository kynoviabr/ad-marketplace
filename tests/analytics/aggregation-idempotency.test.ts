import { describe, it, expect } from 'vitest'
import { aggregateDailyMetrics } from '@/modules/analytics/aggregation'

describe('FASE 09 — Daily Aggregation Idempotency Contract', () => {
  it('allows specifying target date in YYYY-MM-DD format', async () => {
    const targetDate = '2026-08-18'
    // Running aggregation for target date should succeed without throwing
    const res = await aggregateDailyMetrics(targetDate)
    expect(res.metricDate).toBe(targetDate)
    expect(typeof res.profilesProcessed).toBe('number')
    expect(typeof res.platformSearches).toBe('number')
  })

  it('is idempotent: running aggregation multiple times for same date produces stable result', async () => {
    const targetDate = '2026-08-17'
    const res1 = await aggregateDailyMetrics(targetDate)
    const res2 = await aggregateDailyMetrics(targetDate)

    expect(res1.metricDate).toBe(res2.metricDate)
    expect(res1.profilesProcessed).toBe(res2.profilesProcessed)
    expect(res1.platformSearches).toBe(res2.platformSearches)
    expect(res1.platformImpressions).toBe(res2.platformImpressions)
    expect(res1.platformClicks).toBe(res2.platformClicks)
  })
})
