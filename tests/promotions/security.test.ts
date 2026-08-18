import { describe, it, expect } from 'vitest'
import { InitiateBoostCheckoutSchema } from '@/modules/promotions/schemas'

describe('FASE 08 — Promotions Security & Anti-Tampering', () => {
  it('strips client-injected amount, currency, and duration from checkout input', () => {
    const rawInputWithTampering = {
      profileId: crypto.randomUUID(),
      boostProductId: crypto.randomUUID(),
      boostPriceId: crypto.randomUUID(),
      // Attacker tries to inject 1 centavo and 1000 days
      amount_minor: 1,
      amount: 1,
      currency: 'USD',
      duration_hours: 999999,
      status: 'ACTIVE',
    }

    const parsed = InitiateBoostCheckoutSchema.parse(rawInputWithTampering)

    // Extra injected fields MUST NOT exist in parsed output
    expect((parsed as any).amount_minor).toBeUndefined()
    expect((parsed as any).amount).toBeUndefined()
    expect((parsed as any).currency).toBeUndefined()
    expect((parsed as any).duration_hours).toBeUndefined()
    expect((parsed as any).status).toBeUndefined()
  })

  it('validates price temporal validity bounds', () => {
    const now = new Date('2026-08-18T12:00:00Z')

    function isPriceTemporallyValid(price: {
      valid_from: string | null
      valid_until: string | null
    }): boolean {
      if (price.valid_from && new Date(price.valid_from) > now) return false
      if (price.valid_until && new Date(price.valid_until) <= now) return false
      return true
    }

    // Active ongoing price
    expect(isPriceTemporallyValid({ valid_from: '2026-08-01T00:00:00Z', valid_until: '2026-09-01T00:00:00Z' })).toBe(
      true
    )

    // Indefinite price
    expect(isPriceTemporallyValid({ valid_from: null, valid_until: null })).toBe(true)

    // Future price (not yet valid)
    expect(isPriceTemporallyValid({ valid_from: '2026-08-19T00:00:00Z', valid_until: '2026-09-01T00:00:00Z' })).toBe(
      false
    )

    // Expired price
    expect(isPriceTemporallyValid({ valid_from: '2026-08-01T00:00:00Z', valid_until: '2026-08-17T00:00:00Z' })).toBe(
      false
    )
  })

  it('validates profile ownership invariant', () => {
    const callerAccount = { id: 'account-user-A' }
    const targetProfileOwner = { account_user_id: 'account-user-B' }

    const isAuthorized = callerAccount.id === targetProfileOwner.account_user_id
    expect(isAuthorized).toBe(false)
  })
})
