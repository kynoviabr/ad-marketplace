import { describe, it, expect } from 'vitest'
import {
  getRotationBucket,
  computeRotationScore,
  sortCandidatesByFairRotation,
} from '@/modules/promotions/rotation'

describe('FASE 08 — Fair Rotation & Deterministic Bucketing Engine', () => {
  const profileA = { profileId: '11111111-1111-1111-1111-111111111111' }
  const profileB = { profileId: '22222222-2222-2222-2222-222222222222' }
  const profileC = { profileId: '33333333-3333-3333-3333-333333333333' }
  const profileD = { profileId: '44444444-4444-4444-4444-444444444444' }

  const candidates = [profileA, profileB, profileC, profileD]

  it('generates consistent time-bucket format YYYY-MM-DDTHH:MM', () => {
    const d1 = new Date('2026-08-18T14:15:30Z')
    const d2 = new Date('2026-08-18T14:45:00Z')
    // Both are within the 14:00 bucket
    expect(getRotationBucket(d1)).toBe('2026-08-18T14:00')
    expect(getRotationBucket(d2)).toBe('2026-08-18T14:00')
  })

  it('generates different buckets across different hours', () => {
    const d1 = new Date('2026-08-18T14:00:00Z')
    const d2 = new Date('2026-08-18T15:00:00Z')
    expect(getRotationBucket(d1)).not.toBe(getRotationBucket(d2))
  })

  it('produces 100% deterministic ranking inside the same time bucket', () => {
    const time = new Date('2026-08-18T10:20:00Z')
    const sorted1 = sortCandidatesByFairRotation(candidates, 'CITY', 'sp-city-id', time)
    const sorted2 = sortCandidatesByFairRotation(candidates, 'CITY', 'sp-city-id', time)

    expect(sorted1.map((c) => c.profileId)).toEqual(sorted2.map((c) => c.profileId))
  })

  it('produces different scores when scope type or scope ID changes', () => {
    const time = new Date('2026-08-18T10:00:00Z')
    const scoreCity = computeRotationScore({
      profileId: profileA.profileId,
      scopeType: 'CITY',
      scopeId: 'sp-city-id',
      date: time,
    })
    const scoreMoema = computeRotationScore({
      profileId: profileA.profileId,
      scopeType: 'MARKETPLACE_LOCATION',
      scopeId: 'moema-loc-id',
      date: time,
    })
    const scorePinheiros = computeRotationScore({
      profileId: profileA.profileId,
      scopeType: 'MARKETPLACE_LOCATION',
      scopeId: 'pinheiros-loc-id',
      date: time,
    })

    expect(scoreCity).not.toBe(scoreMoema)
    expect(scoreMoema).not.toBe(scorePinheiros)
  })

  it('rotates ordering over multiple hours without permanent first place', () => {
    const firstPlaceProfiles = new Set<string>()

    // Sample across 12 consecutive hours
    for (let hour = 0; hour < 12; hour++) {
      const time = new Date(`2026-08-18T${String(hour).padStart(2, '0')}:00:00Z`)
      const sorted = sortCandidatesByFairRotation(candidates, 'CITY', 'sp-city-id', time)
      firstPlaceProfiles.add(sorted[0].profileId)
    }

    // Over 12 hours, more than one distinct profile MUST hold the top spot (fairness)
    expect(firstPlaceProfiles.size).toBeGreaterThan(1)
  })
})
