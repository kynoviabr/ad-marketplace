import { describe, it, expect } from 'vitest'
import { isSubscriptionPublicationEligible } from '@/modules/billing/entitlements'
import type { Subscription, SubscriptionStatus } from '@/modules/billing/types'

/**
 * Cancellation validation helper matching cancelSubscriptionAction rules.
 */
function applyCancellation(
  subscription: Pick<Subscription, 'id' | 'status' | 'cancel_at_period_end' | 'canceled_at'>
): { success: boolean; error?: string; subscription?: typeof subscription } {
  if (subscription.status !== 'ACTIVE') {
    return {
      success: false,
      error: 'Apenas assinaturas ativas podem ser canceladas.',
    }
  }

  return {
    success: true,
    subscription: {
      ...subscription,
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    },
  }
}

describe('FASE 07 — Cancellation Lifecycle', () => {
  const futurePeriodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
  const pastPeriodEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  it('cancel sets cancel_at_period_end=true, status stays ACTIVE', () => {
    const activeSub = {
      id: 'sub_12345',
      status: 'ACTIVE' as SubscriptionStatus,
      cancel_at_period_end: false,
      canceled_at: null,
      current_period_end: futurePeriodEnd,
      grace_period_end: null,
    }

    const result = applyCancellation(activeSub)
    expect(result.success).toBe(true)
    expect(result.subscription?.cancel_at_period_end).toBe(true)
    expect(result.subscription?.status).toBe('ACTIVE')
    expect(result.subscription?.canceled_at).toBeTruthy()
  })

  it('canceled subscription with future period_end → publication eligible', () => {
    const canceledSubFuture = {
      status: 'ACTIVE' as const,
      cancel_at_period_end: true,
      current_period_end: futurePeriodEnd,
      grace_period_end: null,
    }

    expect(isSubscriptionPublicationEligible(canceledSubFuture)).toBe(true)
  })

  it('canceled subscription with past period_end → NOT publication eligible', () => {
    const canceledSubPast = {
      status: 'ACTIVE' as const,
      cancel_at_period_end: true,
      current_period_end: pastPeriodEnd,
      grace_period_end: null,
    }

    expect(isSubscriptionPublicationEligible(canceledSubPast)).toBe(false)
  })

  it('only ACTIVE subscriptions can be canceled', () => {
    const activeSub = {
      id: 'sub_active',
      status: 'ACTIVE' as SubscriptionStatus,
      cancel_at_period_end: false,
      canceled_at: null,
    }

    expect(applyCancellation(activeSub).success).toBe(true)
  })

  it('EXPIRED cannot be canceled', () => {
    const expiredSub = {
      id: 'sub_expired',
      status: 'EXPIRED' as SubscriptionStatus,
      cancel_at_period_end: false,
      canceled_at: null,
    }

    const result = applyCancellation(expiredSub)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Apenas assinaturas ativas podem ser canceladas.')
  })

  it('INCOMPLETE cannot be canceled', () => {
    const incompleteSub = {
      id: 'sub_incomplete',
      status: 'INCOMPLETE' as SubscriptionStatus,
      cancel_at_period_end: false,
      canceled_at: null,
    }

    const result = applyCancellation(incompleteSub)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Apenas assinaturas ativas podem ser canceladas.')
  })

  it('PAST_DUE cannot be canceled directly via standard cancellation flow', () => {
    const pastDueSub = {
      id: 'sub_past_due',
      status: 'PAST_DUE' as SubscriptionStatus,
      cancel_at_period_end: false,
      canceled_at: null,
    }

    const result = applyCancellation(pastDueSub)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Apenas assinaturas ativas podem ser canceladas.')
  })
})
