import { describe, it, expect } from 'vitest'
import { SUBSCRIPTION_STATUSES } from '@/modules/billing/constants'
import type { SubscriptionStatus } from '@/modules/billing/types'

/**
 * Valid state transitions for subscriptions (FASE 07).
 * Local definition for isolated state machine testing.
 */
const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  INCOMPLETE: ['ACTIVE', 'EXPIRED'],
  ACTIVE: ['PAST_DUE', 'EXPIRED'],
  PAST_DUE: ['ACTIVE', 'GRACE_PERIOD'],
  GRACE_PERIOD: ['ACTIVE', 'EXPIRED'],
  EXPIRED: [], // Terminal state — new subscription row required for re-subscribe
}

function isValidTransition(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus
): boolean {
  if (currentStatus === newStatus) return true // No-op is valid
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

describe('FASE 07 — Subscription State Machine', () => {
  it('contains all canonical subscription statuses', () => {
    expect(SUBSCRIPTION_STATUSES).toEqual([
      'ACTIVE',
      'PAST_DUE',
      'GRACE_PERIOD',
      'INCOMPLETE',
      'EXPIRED',
    ])
  })

  it('allows identical from/to status transitions (no-op)', () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      expect(isValidTransition(status, status)).toBe(true)
    }
  })

  describe('valid state transitions', () => {
    it('INCOMPLETE → ACTIVE (checkout paid successfully)', () => {
      expect(isValidTransition('INCOMPLETE', 'ACTIVE')).toBe(true)
    })

    it('INCOMPLETE → EXPIRED (checkout abandoned / expired)', () => {
      expect(isValidTransition('INCOMPLETE', 'EXPIRED')).toBe(true)
    })

    it('ACTIVE → PAST_DUE (renewal payment failed)', () => {
      expect(isValidTransition('ACTIVE', 'PAST_DUE')).toBe(true)
    })

    it('ACTIVE → EXPIRED (canceled at period end, period reached)', () => {
      expect(isValidTransition('ACTIVE', 'EXPIRED')).toBe(true)
    })

    it('PAST_DUE → ACTIVE (retry payment succeeded)', () => {
      expect(isValidTransition('PAST_DUE', 'ACTIVE')).toBe(true)
    })

    it('PAST_DUE → GRACE_PERIOD (provider retries exhausted)', () => {
      expect(isValidTransition('PAST_DUE', 'GRACE_PERIOD')).toBe(true)
    })

    it('GRACE_PERIOD → ACTIVE (manual/dunning payment succeeded)', () => {
      expect(isValidTransition('GRACE_PERIOD', 'ACTIVE')).toBe(true)
    })

    it('GRACE_PERIOD → EXPIRED (grace period elapsed without payment)', () => {
      expect(isValidTransition('GRACE_PERIOD', 'EXPIRED')).toBe(true)
    })
  })

  describe('invalid state transitions', () => {
    it('EXPIRED → ACTIVE (must fail, terminal state)', () => {
      expect(isValidTransition('EXPIRED', 'ACTIVE')).toBe(false)
    })

    it('ACTIVE → INCOMPLETE (must fail, cannot revert to checkout)', () => {
      expect(isValidTransition('ACTIVE', 'INCOMPLETE')).toBe(false)
    })

    it('GRACE_PERIOD → PAST_DUE (must fail, cannot revert to retrying)', () => {
      expect(isValidTransition('GRACE_PERIOD', 'PAST_DUE')).toBe(false)
    })

    it('EXPIRED cannot transition to any other status', () => {
      expect(isValidTransition('EXPIRED', 'PAST_DUE')).toBe(false)
      expect(isValidTransition('EXPIRED', 'GRACE_PERIOD')).toBe(false)
      expect(isValidTransition('EXPIRED', 'INCOMPLETE')).toBe(false)
    })

    it('INCOMPLETE cannot skip directly to PAST_DUE or GRACE_PERIOD', () => {
      expect(isValidTransition('INCOMPLETE', 'PAST_DUE')).toBe(false)
      expect(isValidTransition('INCOMPLETE', 'GRACE_PERIOD')).toBe(false)
    })

    it('ACTIVE cannot skip directly to GRACE_PERIOD without PAST_DUE', () => {
      expect(isValidTransition('ACTIVE', 'GRACE_PERIOD')).toBe(false)
    })
  })
})
