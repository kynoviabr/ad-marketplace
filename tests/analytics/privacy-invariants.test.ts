import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isDoNotTrackEnabled, getVisitorSessionId } from '@/components/analytics/session'
import type { AdvertiserMetricsSummaryDTO, AdminPlatformMetricsDTO, AnalyticsEvent } from '@/modules/analytics/types'

describe('FASE 09 — Privacy & LGPD Invariants', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    const mockSessionStorage = {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => storage.set(k, v),
      clear: () => storage.clear(),
      removeItem: (k: string) => storage.delete(k),
      length: 0,
      key: () => null,
    }

    Object.defineProperty(globalThis, 'window', {
      value: {
        sessionStorage: mockSessionStorage,
        doNotTrack: undefined,
      },
      writable: true,
      configurable: true,
    })

    Object.defineProperty(globalThis.navigator, 'doNotTrack', {
      value: '0',
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'doNotTrack', {
      value: undefined,
      writable: true,
      configurable: true,
    })
  })

  it('respects Do Not Track (DNT) when enabled (HD-4)', () => {
    Object.defineProperty(globalThis.navigator, 'doNotTrack', {
      value: '1',
      writable: true,
      configurable: true,
    })
    expect(isDoNotTrackEnabled()).toBe(true)
    expect(getVisitorSessionId()).toBeNull()
  })

  it('generates a valid UUID session when DNT is disabled', () => {
    Object.defineProperty(globalThis.navigator, 'doNotTrack', {
      value: '0',
      writable: true,
      configurable: true,
    })
    expect(isDoNotTrackEnabled()).toBe(false)
    const sid = getVisitorSessionId()
    expect(sid).toBeTruthy()
    expect(sid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('preserves the same session UUID across multiple calls in the same session', () => {
    const sid1 = getVisitorSessionId()
    const sid2 = getVisitorSessionId()
    expect(sid1).toBe(sid2)
  })

  it('asserts that raw IP is NOT a property of AnalyticsEvent interface', () => {
    const sampleEvent: Partial<AnalyticsEvent> = {
      event_type: 'PROFILE_IMPRESSION',
      occurred_at: new Date().toISOString(),
    }
    // @ts-expect-error - IP must never be a recognized property
    expect(sampleEvent.ip).toBeUndefined()
    // @ts-expect-error - raw_ip must never be a recognized property
    expect(sampleEvent.raw_ip).toBeUndefined()
  })

  it('asserts that visitor_session_id is NEVER in AdvertiserMetricsSummaryDTO', () => {
    const advertiserDTO: AdvertiserMetricsSummaryDTO = {
      impressionsTotal: 100,
      impressionsOrganic: 80,
      impressionsSponsored: 20,
      profileViews: 20,
      whatsappClicks: 5,
      ctr: 5,
      days: 30,
      dailyBreakdown: [],
    }
    // @ts-expect-error - visitor_session_id must not exist on advertiser DTO
    expect(advertiserDTO.visitor_session_id).toBeUndefined()
  })

  it('asserts that visitor_session_id is NEVER in AdminPlatformMetricsDTO', () => {
    const adminDTO: AdminPlatformMetricsDTO = {
      periodDays: 30,
      searchesTotal: 500,
      searchesWithFilters: 200,
      searchesZeroResults: 10,
      impressionsTotal: 1000,
      impressionsOrganic: 800,
      impressionsSponsored: 200,
      whatsappClicksTotal: 50,
      whatsappClicksOrganic: 40,
      whatsappClicksSponsored: 10,
      overallCtr: 5,
      contactClicksPerActiveAdvertiser: 2.5,
      activeAdvertisersCount: 20,
      topProfiles: [],
      topLocations: [],
    }
    // @ts-expect-error - visitor_session_id must not exist on admin DTO
    expect(adminDTO.visitor_session_id).toBeUndefined()
  })
})
