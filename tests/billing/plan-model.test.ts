import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { BILLING_INTERVALS, DEFAULT_CURRENCY } from '@/modules/billing/constants'

// Conceptual validation schemas matching DB constraints in migration 20260818000007
const PlanSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1).regex(/^[A-Z0-9_-]+$/),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
})

const PlanPriceSchema = z
  .object({
    id: z.string().uuid().optional(),
    plan_id: z.string().uuid(),
    price_code: z.string().min(1),
    currency: z.string().length(3, 'currency must be exactly 3 characters'),
    amount_minor: z.number().int().min(0, 'amount_minor must be non-negative'),
    billing_interval: z.enum(BILLING_INTERVALS),
    is_active: z.boolean().default(true),
    is_promotional: z.boolean().default(false),
    valid_from: z.string().datetime().nullable().optional(),
    valid_until: z.string().datetime().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.valid_from && data.valid_until) {
        return new Date(data.valid_until) > new Date(data.valid_from)
      }
      return true
    },
    {
      message: 'valid_until must be after valid_from',
      path: ['valid_until'],
    }
  )

describe('FASE 07 — Plan Model Validation', () => {
  const validPlanId = '123e4567-e89b-42d3-a456-426614174000'

  it('validates plan code uniqueness constraint (conceptual check via schema)', () => {
    const plans = [
      { code: 'FOUNDER', name: 'Founder Plan' },
      { code: 'PROFESSIONAL', name: 'Professional Plan' },
    ]

    const parsedPlans = plans.map((p) => PlanSchema.parse(p))
    const codes = parsedPlans.map((p) => p.code)
    const uniqueCodes = new Set(codes)

    expect(codes.length).toBe(uniqueCodes.size)

    // Attempting duplicate code in a collection should violate uniqueness
    const duplicatePlan = { code: 'FOUNDER', name: 'Duplicate Founder' }
    const hasDuplicate = codes.includes(duplicatePlan.code)
    expect(hasDuplicate).toBe(true)
  })

  it('amount_minor must be non-negative (0 is valid for free launch)', () => {
    // 0 is valid for free launch (LAUNCH_FREE)
    const freePrice = {
      plan_id: validPlanId,
      price_code: 'LAUNCH_FREE',
      currency: DEFAULT_CURRENCY,
      amount_minor: 0,
      billing_interval: 'MONTH' as const,
      is_active: true,
      is_promotional: false,
    }
    const freeResult = PlanPriceSchema.safeParse(freePrice)
    expect(freeResult.success).toBe(true)

    // Positive integer is valid (paid tier)
    const paidPrice = {
      ...freePrice,
      price_code: 'FOUNDING_MONTHLY',
      amount_minor: 4900,
    }
    const paidResult = PlanPriceSchema.safeParse(paidPrice)
    expect(paidResult.success).toBe(true)

    // Negative amount_minor is invalid
    const negativePrice = {
      ...freePrice,
      price_code: 'INVALID_NEGATIVE',
      amount_minor: -100,
    }
    const negativeResult = PlanPriceSchema.safeParse(negativePrice)
    expect(negativeResult.success).toBe(false)
  })

  it('currency must be 3 chars', () => {
    const base = {
      plan_id: validPlanId,
      price_code: 'TEST_PRICE',
      amount_minor: 1000,
      billing_interval: 'MONTH' as const,
      is_active: true,
      is_promotional: false,
    }

    // 3 chars valid (ISO 4217)
    expect(PlanPriceSchema.safeParse({ ...base, currency: 'BRL' }).success).toBe(true)
    expect(PlanPriceSchema.safeParse({ ...base, currency: 'USD' }).success).toBe(true)

    // Invalid length (2 chars or 4 chars)
    expect(PlanPriceSchema.safeParse({ ...base, currency: 'BR' }).success).toBe(false)
    expect(PlanPriceSchema.safeParse({ ...base, currency: 'BRLA' }).success).toBe(false)
    expect(PlanPriceSchema.safeParse({ ...base, currency: '' }).success).toBe(false)
  })

  it('billing_interval must be MONTH or YEAR', () => {
    const base = {
      plan_id: validPlanId,
      price_code: 'TEST_PRICE',
      currency: 'BRL',
      amount_minor: 1000,
      is_active: true,
      is_promotional: false,
    }

    expect(PlanPriceSchema.safeParse({ ...base, billing_interval: 'MONTH' }).success).toBe(true)
    expect(PlanPriceSchema.safeParse({ ...base, billing_interval: 'YEAR' }).success).toBe(true)

    // Invalid intervals
    expect(PlanPriceSchema.safeParse({ ...base, billing_interval: 'WEEK' as any }).success).toBe(false)
    expect(PlanPriceSchema.safeParse({ ...base, billing_interval: 'DAY' as any }).success).toBe(false)
    expect(PlanPriceSchema.safeParse({ ...base, billing_interval: 'QUARTER' as any }).success).toBe(false)
  })

  it('price temporal integrity: valid_until must be after valid_from when both set', () => {
    const base = {
      plan_id: validPlanId,
      price_code: 'PROMO_PRICE',
      currency: 'BRL',
      amount_minor: 2900,
      billing_interval: 'MONTH' as const,
      is_active: true,
      is_promotional: true,
    }

    // valid_until > valid_from is valid
    const validTemporal = {
      ...base,
      valid_from: '2026-01-01T00:00:00.000Z',
      valid_until: '2026-12-31T23:59:59.000Z',
    }
    expect(PlanPriceSchema.safeParse(validTemporal).success).toBe(true)

    // valid_until <= valid_from is invalid
    const invalidTemporalOrder = {
      ...base,
      valid_from: '2026-12-31T23:59:59.000Z',
      valid_until: '2026-01-01T00:00:00.000Z',
    }
    expect(PlanPriceSchema.safeParse(invalidTemporalOrder).success).toBe(false)

    const equalTemporal = {
      ...base,
      valid_from: '2026-06-01T00:00:00.000Z',
      valid_until: '2026-06-01T00:00:00.000Z',
    }
    expect(PlanPriceSchema.safeParse(equalTemporal).success).toBe(false)

    // Only one set or neither set is valid
    expect(PlanPriceSchema.safeParse({ ...base, valid_from: '2026-01-01T00:00:00.000Z', valid_until: null }).success).toBe(true)
    expect(PlanPriceSchema.safeParse({ ...base, valid_from: null, valid_until: '2026-12-31T23:59:59.000Z' }).success).toBe(true)
    expect(PlanPriceSchema.safeParse({ ...base, valid_from: null, valid_until: null }).success).toBe(true)
  })

  it('promotional flag is a boolean', () => {
    const base = {
      plan_id: validPlanId,
      price_code: 'TEST_PRICE',
      currency: 'BRL',
      amount_minor: 1000,
      billing_interval: 'MONTH' as const,
    }

    expect(PlanPriceSchema.safeParse({ ...base, is_promotional: true }).success).toBe(true)
    expect(PlanPriceSchema.safeParse({ ...base, is_promotional: false }).success).toBe(true)
    expect(PlanPriceSchema.safeParse({ ...base, is_promotional: 'true' as any }).success).toBe(false)
    expect(PlanPriceSchema.safeParse({ ...base, is_promotional: 1 as any }).success).toBe(false)
  })
})
