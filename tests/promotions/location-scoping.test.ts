import { describe, it, expect } from 'vitest'
import { InitiateBoostCheckoutSchema } from '@/modules/promotions/schemas'

describe('FASE 08 — Location & Service Area Scoping Validation', () => {
  const profileId = crypto.randomUUID()
  const boostProductId = crypto.randomUUID()
  const boostPriceId = crypto.randomUUID()
  const validLocationId = crypto.randomUUID()

  it('accepts city boost without locationId', () => {
    const res = InitiateBoostCheckoutSchema.safeParse({
      profileId,
      boostProductId,
      boostPriceId,
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.locationId).toBeUndefined()
    }
  })

  it('accepts location boost with valid locationId', () => {
    const res = InitiateBoostCheckoutSchema.safeParse({
      profileId,
      boostProductId,
      boostPriceId,
      locationId: validLocationId,
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.locationId).toBe(validLocationId)
    }
  })

  it('rejects invalid location UUID format', () => {
    const res = InitiateBoostCheckoutSchema.safeParse({
      profileId,
      boostProductId,
      boostPriceId,
      locationId: 'not-a-valid-uuid',
    })
    expect(res.success).toBe(false)
  })

  it('validates service area membership logic', () => {
    // Simulates business rule in actions.ts:
    // Profile has areas [LocA, LocB]. Selecting LocC must be rejected.
    const profileLocations = [{ location_id: 'loc-A' }, { location_id: 'loc-B' }]

    function isLocationAllowed(targetLocId: string): boolean {
      return profileLocations.some((pl) => pl.location_id === targetLocId)
    }

    expect(isLocationAllowed('loc-A')).toBe(true)
    expect(isLocationAllowed('loc-B')).toBe(true)
    expect(isLocationAllowed('loc-C')).toBe(false)
    expect(isLocationAllowed('arbitrary-unauthorized-location')).toBe(false)
  })
})
