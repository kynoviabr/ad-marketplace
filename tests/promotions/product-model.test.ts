import { describe, it, expect } from 'vitest'
import { InitiateBoostCheckoutSchema, CancelBoostCampaignSchema } from '@/modules/promotions/schemas'
import { BOOST_STATUSES, BOOST_SCOPES, MAX_SPONSORED_SLOTS_PER_PAGE } from '@/modules/promotions/constants'

describe('FASE 08 — Boost Product & Price Model Validation', () => {
  it('validates canonical campaign statuses', () => {
    expect(BOOST_STATUSES).toEqual([
      'PENDING_PAYMENT',
      'SCHEDULED',
      'ACTIVE',
      'COMPLETED',
      'CANCELED',
      'FAILED',
    ])
  })

  it('validates supported scope types', () => {
    expect(BOOST_SCOPES).toEqual(['CITY', 'MARKETPLACE_LOCATION'])
  })

  it('validates MAX_SPONSORED_SLOTS_PER_PAGE default is 4', () => {
    expect(MAX_SPONSORED_SLOTS_PER_PAGE).toBe(4)
  })

  it('validates initiate checkout schema requires valid UUIDs', () => {
    const valid = InitiateBoostCheckoutSchema.safeParse({
      profileId: crypto.randomUUID(),
      boostProductId: crypto.randomUUID(),
      boostPriceId: crypto.randomUUID(),
    })
    expect(valid.success).toBe(true)

    const invalid = InitiateBoostCheckoutSchema.safeParse({
      profileId: 'not-a-uuid',
      boostProductId: crypto.randomUUID(),
      boostPriceId: crypto.randomUUID(),
    })
    expect(invalid.success).toBe(false)
  })

  it('validates cancel schema requires valid reason with minimum 3 chars', () => {
    const valid = CancelBoostCampaignSchema.safeParse({
      campaignId: crypto.randomUUID(),
      reason: 'Solicitação do anunciante',
    })
    expect(valid.success).toBe(true)

    const tooShort = CancelBoostCampaignSchema.safeParse({
      campaignId: crypto.randomUUID(),
      reason: 'ab',
    })
    expect(tooShort.success).toBe(false)
  })
})
