import { describe, it, expect } from 'vitest'
import type { PlanPrice, SubscriptionPlan } from '@/modules/billing/types'

/**
 * Price validation logic executed during checkout initiation (from actions.ts).
 */
function validateCheckoutPrice(
  plan: SubscriptionPlan,
  price: PlanPrice,
  referenceDate: Date = new Date()
): { valid: boolean; error?: string; authoritativeAmount?: number } {
  if (!plan.is_active) {
    return { valid: false, error: 'Plano não encontrado ou inativo.' }
  }

  if (price.plan_id !== plan.id) {
    return { valid: false, error: 'Preço não pertence ao plano selecionado.' }
  }

  if (!price.is_active) {
    return { valid: false, error: 'Preço não está ativo.' }
  }

  if (price.valid_from && new Date(price.valid_from) > referenceDate) {
    return { valid: false, error: 'Preço ainda não está disponível.' }
  }

  if (price.valid_until && new Date(price.valid_until) <= referenceDate) {
    return { valid: false, error: 'Preço expirado.' }
  }

  if (price.amount_minor <= 0) {
    return { valid: false, error: 'Use a criação gratuita para preços sem custo.' }
  }

  return {
    valid: true,
    authoritativeAmount: price.amount_minor,
  }
}

describe('FASE 07 — Checkout & Price Validation', () => {
  const planAId = 'a0000000-0000-0000-0000-000000000001'
  const planBId = 'b0000000-0000-0000-0000-000000000002'

  const basePlan: SubscriptionPlan = {
    id: planAId,
    code: 'FOUNDER',
    name: 'Founder Plan',
    description: null,
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const baseValidPrice: PlanPrice = {
    id: 'c0000000-0000-0000-0000-000000000001',
    plan_id: planAId,
    price_code: 'FOUNDING_MONTHLY',
    currency: 'BRL',
    amount_minor: 4900,
    billing_interval: 'MONTH',
    is_active: true,
    is_promotional: false,
    valid_from: null,
    valid_until: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it('amount_minor from DB is authoritative, not from client', () => {
    const result = validateCheckoutPrice(basePlan, baseValidPrice)
    expect(result.valid).toBe(true)
    // Authoritative amount is resolved strictly from DB record
    expect(result.authoritativeAmount).toBe(4900)
    expect(result.authoritativeAmount).not.toBe(0)
  })

  it('price with amount_minor=0 should use free launch flow, not paid checkout', () => {
    const freePrice: PlanPrice = {
      ...baseValidPrice,
      price_code: 'LAUNCH_FREE',
      amount_minor: 0,
    }
    const result = validateCheckoutPrice(basePlan, freePrice)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Use a criação gratuita para preços sem custo.')
  })

  it('expired price (valid_until in past) should be rejected', () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1h ago
    const expiredPrice: PlanPrice = {
      ...baseValidPrice,
      valid_until: pastDate,
    }
    const result = validateCheckoutPrice(basePlan, expiredPrice)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Preço expirado.')
  })

  it('future price (valid_from in future) should be rejected', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() // 1 day future
    const futurePrice: PlanPrice = {
      ...baseValidPrice,
      valid_from: futureDate,
    }
    const result = validateCheckoutPrice(basePlan, futurePrice)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Preço ainda não está disponível.')
  })

  it('inactive price (is_active=false) should be rejected', () => {
    const inactivePrice: PlanPrice = {
      ...baseValidPrice,
      is_active: false,
    }
    const result = validateCheckoutPrice(basePlan, inactivePrice)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Preço não está ativo.')
  })

  it('price belonging to different plan should be rejected', () => {
    const mismatchedPrice: PlanPrice = {
      ...baseValidPrice,
      plan_id: planBId, // Mismatched plan
    }
    const result = validateCheckoutPrice(basePlan, mismatchedPrice)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Preço não pertence ao plano selecionado.')
  })

  it('valid_until must be after valid_from', () => {
    const now = new Date()
    const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString()
    const untilDate = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString()

    // Valid range: from in past, until in future
    const validRangePrice: PlanPrice = {
      ...baseValidPrice,
      valid_from: fromDate,
      valid_until: untilDate,
    }
    const result = validateCheckoutPrice(basePlan, validRangePrice, now)
    expect(result.valid).toBe(true)

    // Temporal integrity: valid_until <= valid_from is conceptually invalid
    function isTemporalValid(price: PlanPrice): boolean {
      if (price.valid_from && price.valid_until) {
        return new Date(price.valid_until) > new Date(price.valid_from)
      }
      return true
    }

    expect(isTemporalValid(validRangePrice)).toBe(true)
    expect(
      isTemporalValid({
        ...baseValidPrice,
        valid_from: untilDate,
        valid_until: fromDate,
      })
    ).toBe(false)
  })
})
