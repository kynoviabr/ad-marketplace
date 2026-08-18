import { describe, it, expect } from 'vitest'
import {
  InitiateCheckoutSchema,
  CancelSubscriptionSchema,
  GrantOverrideSchema,
  RevokeOverrideSchema,
  CreateFreeLaunchSchema,
} from '@/modules/billing/schemas'

describe('FASE 07 — Billing Security', () => {
  const validUUID1 = '123e4567-e89b-42d3-a456-426614174000'
  const validUUID2 = '987fcdeb-51a2-43f7-9876-543210987654'

  it('InitiateCheckoutSchema requires valid UUID for planId and priceId', () => {
    const validPayload = {
      planId: validUUID1,
      priceId: validUUID2,
    }
    const result = InitiateCheckoutSchema.safeParse(validPayload)
    expect(result.success).toBe(true)

    const invalidPlan = {
      planId: 'invalid-not-uuid',
      priceId: validUUID2,
    }
    expect(InitiateCheckoutSchema.safeParse(invalidPlan).success).toBe(false)

    const invalidPrice = {
      planId: validUUID1,
      priceId: '12345',
    }
    expect(InitiateCheckoutSchema.safeParse(invalidPrice).success).toBe(false)
  })

  it('InitiateCheckoutSchema does NOT accept amount field (extra fields stripped by Zod)', () => {
    const payloadWithTamperedAmount = {
      planId: validUUID1,
      priceId: validUUID2,
      amount: 1, // Attacker attempting to pay R$ 0.01
      amountMinor: 1,
    }

    const parsed = InitiateCheckoutSchema.parse(payloadWithTamperedAmount)

    // Zod strips unknown fields by default
    expect((parsed as any).amount).toBeUndefined()
    expect((parsed as any).amountMinor).toBeUndefined()
    expect(parsed).toEqual({
      planId: validUUID1,
      priceId: validUUID2,
    })
  })

  it('client cannot send arbitrary amount in checkout (schema validation)', () => {
    const maliciousPayload = {
      planId: validUUID1,
      priceId: validUUID2,
      custom_price: 0,
      currency: 'USD',
    }

    const parsed = InitiateCheckoutSchema.parse(maliciousPayload)
    expect((parsed as any).custom_price).toBeUndefined()
    expect((parsed as any).currency).toBeUndefined()
  })

  it('CancelSubscriptionSchema requires valid UUID', () => {
    expect(
      CancelSubscriptionSchema.safeParse({ subscriptionId: validUUID1 }).success
    ).toBe(true)

    expect(
      CancelSubscriptionSchema.safeParse({ subscriptionId: 'invalid-id' }).success
    ).toBe(false)

    expect(
      CancelSubscriptionSchema.safeParse({ subscriptionId: '' }).success
    ).toBe(false)
  })

  it('GrantOverrideSchema requires reason with min 3 chars', () => {
    const validOverride = {
      accountUserId: validUUID1,
      reason: 'Cortesía para beta tester verificado',
    }
    expect(GrantOverrideSchema.safeParse(validOverride).success).toBe(true)

    const shortReason = {
      accountUserId: validUUID1,
      reason: 'ok', // < 3 chars
    }
    expect(GrantOverrideSchema.safeParse(shortReason).success).toBe(false)

    const emptyReason = {
      accountUserId: validUUID1,
      reason: '',
    }
    expect(GrantOverrideSchema.safeParse(emptyReason).success).toBe(false)

    const invalidUser = {
      accountUserId: 'not-a-uuid',
      reason: 'Valid reason here',
    }
    expect(GrantOverrideSchema.safeParse(invalidUser).success).toBe(false)
  })

  it('price_code LAUNCH_FREE has amount_minor=0 (conceptual validation)', () => {
    // Free launch invariant: price code LAUNCH_FREE must always have amount_minor = 0
    interface PriceRecord {
      price_code: string
      amount_minor: number
    }

    function validateFreeLaunchPrice(price: PriceRecord): boolean {
      if (price.price_code === 'LAUNCH_FREE') {
        return price.amount_minor === 0
      }
      return true
    }

    expect(validateFreeLaunchPrice({ price_code: 'LAUNCH_FREE', amount_minor: 0 })).toBe(true)
    expect(validateFreeLaunchPrice({ price_code: 'LAUNCH_FREE', amount_minor: 100 })).toBe(false)
    expect(validateFreeLaunchPrice({ price_code: 'FOUNDING_MONTHLY', amount_minor: 4900 })).toBe(true)
  })

  it('RevokeOverrideSchema requires valid overrideId UUID', () => {
    expect(RevokeOverrideSchema.safeParse({ overrideId: validUUID1 }).success).toBe(true)
    expect(RevokeOverrideSchema.safeParse({ overrideId: 'non-uuid' }).success).toBe(false)
  })

  it('CreateFreeLaunchSchema requires valid accountUserId UUID', () => {
    expect(CreateFreeLaunchSchema.safeParse({ accountUserId: validUUID1 }).success).toBe(true)
    expect(CreateFreeLaunchSchema.safeParse({ accountUserId: 'not-uuid' }).success).toBe(false)
  })
})
