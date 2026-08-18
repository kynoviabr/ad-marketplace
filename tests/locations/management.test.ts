import { describe, it, expect } from 'vitest'
import { SaveProfileLocationsSchema } from '@/modules/locations/schemas'

describe('Locations Validation Schema Tests', () => {
  const validUUID1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  const validUUID2 = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
  const validUUID3 = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'

  it('accepts valid locations payload with primary location included in list', () => {
    const validPayload = {
      location_ids: [validUUID1, validUUID2, validUUID3],
      primary_location_id: validUUID1,
    }

    const result = SaveProfileLocationsSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('rejects empty location_ids list', () => {
    const emptyPayload = {
      location_ids: [],
      primary_location_id: validUUID1,
    }

    const result = SaveProfileLocationsSchema.safeParse(emptyPayload)
    expect(result.success).toBe(false)
  })

  it('rejects more than 5 locations', () => {
    const sixUUIDs = [
      validUUID1,
      validUUID2,
      validUUID3,
      'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
      'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
    ]

    const result = SaveProfileLocationsSchema.safeParse({
      location_ids: sixUUIDs,
      primary_location_id: validUUID1,
    })

    expect(result.success).toBe(false)
  })

  it('rejects when primary_location_id is not in location_ids list', () => {
    const notIncludedPrimary = {
      location_ids: [validUUID1, validUUID2],
      primary_location_id: validUUID3,
    }

    const result = SaveProfileLocationsSchema.safeParse(notIncludedPrimary)
    expect(result.success).toBe(false)
  })

  it('rejects malformed UUID strings', () => {
    const malformed = {
      location_ids: ['invalid-uuid-format'],
      primary_location_id: 'invalid-uuid-format',
    }

    const result = SaveProfileLocationsSchema.safeParse(malformed)
    expect(result.success).toBe(false)
  })
})
