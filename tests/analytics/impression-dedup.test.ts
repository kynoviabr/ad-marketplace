import { describe, it, expect } from 'vitest'

describe('FASE 09 — Impression Deduplication Key Invariants', () => {
  function computeDedupKey(
    profileSlug: string,
    citySlug: string,
    locationSlug: string | null | undefined,
    placementType: string,
    resultPage: number
  ): string {
    return `${profileSlug}:${citySlug}:${locationSlug || ''}:${placementType}:${resultPage}`
  }

  it('produces identical dedup key for same profile, page, and search context', () => {
    const key1 = computeDedupKey('juliana-moema', 'sao-paulo', 'moema', 'ORGANIC', 1)
    const key2 = computeDedupKey('juliana-moema', 'sao-paulo', 'moema', 'ORGANIC', 1)
    expect(key1).toBe(key2)
  })

  it('produces distinct dedup keys for different pages of the same profile', () => {
    const keyP1 = computeDedupKey('juliana-moema', 'sao-paulo', 'moema', 'ORGANIC', 1)
    const keyP2 = computeDedupKey('juliana-moema', 'sao-paulo', 'moema', 'ORGANIC', 2)
    expect(keyP1).not.toBe(keyP2)
  })

  it('produces distinct dedup keys for organic vs sponsored placements on same page', () => {
    const keyOrg = computeDedupKey('juliana-moema', 'sao-paulo', null, 'ORGANIC', 1)
    const keySpon = computeDedupKey('juliana-moema', 'sao-paulo', null, 'SPONSORED', 1)
    expect(keyOrg).not.toBe(keySpon)
  })

  it('produces distinct dedup keys for different profiles on same page', () => {
    const keyA = computeDedupKey('juliana-moema', 'sao-paulo', 'moema', 'ORGANIC', 1)
    const keyB = computeDedupKey('camila-jardins', 'sao-paulo', 'moema', 'ORGANIC', 1)
    expect(keyA).not.toBe(keyB)
  })
})
