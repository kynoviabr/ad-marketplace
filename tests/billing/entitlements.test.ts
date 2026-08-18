import { describe, it, expect } from 'vitest'
import { isSubscriptionPublicationEligible } from '@/modules/billing/entitlements'

describe('FASE 07 — Publication Entitlement (Fail-Closed)', () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  it('ACTIVE with no period_end → eligible', () => {
    const sub = {
      status: 'ACTIVE' as const,
      current_period_end: null,
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(true)
  })

  it('ACTIVE with future period_end → eligible', () => {
    const sub = {
      status: 'ACTIVE' as const,
      current_period_end: futureDate,
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(true)
  })

  it('ACTIVE with past period_end → NOT eligible (time-aware fail-closed)', () => {
    const sub = {
      status: 'ACTIVE' as const,
      current_period_end: pastDate,
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(false)
  })

  it('ACTIVE with cancel_at_period_end=true but period_end in future → eligible', () => {
    const sub = {
      status: 'ACTIVE' as const,
      current_period_end: futureDate,
      cancel_at_period_end: true,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(true)
  })

  it('ACTIVE with cancel_at_period_end=true and period_end in past → NOT eligible', () => {
    const sub = {
      status: 'ACTIVE' as const,
      current_period_end: pastDate,
      cancel_at_period_end: true,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(false)
  })

  it('PAST_DUE → eligible (provider still retrying)', () => {
    const sub = {
      status: 'PAST_DUE' as const,
      current_period_end: pastDate,
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(true)
  })

  it('GRACE_PERIOD with future grace_period_end → eligible', () => {
    const sub = {
      status: 'GRACE_PERIOD' as const,
      current_period_end: pastDate,
      cancel_at_period_end: false,
      grace_period_end: futureDate,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(true)
  })

  it('GRACE_PERIOD with past grace_period_end → NOT eligible', () => {
    const sub = {
      status: 'GRACE_PERIOD' as const,
      current_period_end: pastDate,
      cancel_at_period_end: false,
      grace_period_end: pastDate,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(false)
  })

  it('GRACE_PERIOD with null grace_period_end → NOT eligible', () => {
    const sub = {
      status: 'GRACE_PERIOD' as const,
      current_period_end: pastDate,
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(false)
  })

  it('INCOMPLETE → NOT eligible', () => {
    const sub = {
      status: 'INCOMPLETE' as const,
      current_period_end: null,
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(false)
  })

  it('EXPIRED → NOT eligible', () => {
    const sub = {
      status: 'EXPIRED' as const,
      current_period_end: pastDate,
      cancel_at_period_end: true,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(sub)).toBe(false)
  })

  it('null subscription → NOT eligible (via checking the function handles this)', () => {
    expect(isSubscriptionPublicationEligible(null)).toBe(false)
    expect(isSubscriptionPublicationEligible(undefined)).toBe(false)
  })

  it('free launch (ACTIVE, amount=0, provider=null) → eligible', () => {
    const freeLaunchSubscription = {
      status: 'ACTIVE' as const,
      current_period_end: null, // Indefinite or future
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(freeLaunchSubscription)).toBe(true)

    const freeLaunchWithExpiry = {
      status: 'ACTIVE' as const,
      current_period_end: futureDate,
      cancel_at_period_end: false,
      grace_period_end: null,
    }
    expect(isSubscriptionPublicationEligible(freeLaunchWithExpiry)).toBe(true)
  })
})
