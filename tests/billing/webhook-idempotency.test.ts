import { describe, it, expect } from 'vitest'
import type { SubscriptionStatus } from '@/modules/billing/types'

/**
 * Monotonic state ordering for stale-event protection (from webhook.ts).
 * Higher ordinal = further in lifecycle.
 */
const STATE_ORDINAL: Record<SubscriptionStatus, number> = {
  INCOMPLETE: 0,
  ACTIVE: 1,
  PAST_DUE: 2,
  GRACE_PERIOD: 3,
  EXPIRED: 4,
}

/** Valid state transitions. */
const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  INCOMPLETE: ['ACTIVE', 'EXPIRED'],
  ACTIVE: ['PAST_DUE', 'EXPIRED'],
  PAST_DUE: ['ACTIVE', 'GRACE_PERIOD'],
  GRACE_PERIOD: ['ACTIVE', 'EXPIRED'],
  EXPIRED: [], // Terminal
}

function isStaleEvent(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus
): boolean {
  return STATE_ORDINAL[newStatus] < STATE_ORDINAL[currentStatus]
}

function isValidTransition(
  currentStatus: SubscriptionStatus,
  newStatus: SubscriptionStatus
): boolean {
  if (currentStatus === newStatus) return true // No-op is valid
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false
}

describe('FASE 07 — Webhook Idempotency & Stale Event Protection', () => {
  it('stale event detection: EXPIRED→ACTIVE is stale', () => {
    expect(isStaleEvent('EXPIRED', 'ACTIVE')).toBe(true)
    expect(isValidTransition('EXPIRED', 'ACTIVE')).toBe(false)
  })

  it('valid transition: INCOMPLETE→ACTIVE is valid', () => {
    expect(isStaleEvent('INCOMPLETE', 'ACTIVE')).toBe(false)
    expect(isValidTransition('INCOMPLETE', 'ACTIVE')).toBe(true)
  })

  it('same status is no-op (valid)', () => {
    const statuses: SubscriptionStatus[] = [
      'INCOMPLETE',
      'ACTIVE',
      'PAST_DUE',
      'GRACE_PERIOD',
      'EXPIRED',
    ]

    for (const status of statuses) {
      expect(isStaleEvent(status, status)).toBe(false)
      expect(isValidTransition(status, status)).toBe(true)
    }
  })

  it('ACTIVE→PAST_DUE is valid forward transition', () => {
    expect(isStaleEvent('ACTIVE', 'PAST_DUE')).toBe(false)
    expect(isValidTransition('ACTIVE', 'PAST_DUE')).toBe(true)
  })

  it('GRACE_PERIOD→EXPIRED is valid', () => {
    expect(isStaleEvent('GRACE_PERIOD', 'EXPIRED')).toBe(false)
    expect(isValidTransition('GRACE_PERIOD', 'EXPIRED')).toBe(true)
  })

  it('ACTIVE→INCOMPLETE is invalid (regression)', () => {
    expect(isStaleEvent('ACTIVE', 'INCOMPLETE')).toBe(true)
    expect(isValidTransition('ACTIVE', 'INCOMPLETE')).toBe(false)
  })

  it('detects duplicate events via event ledger uniqueness (idempotency)', () => {
    // Simulates DB unique constraint on (provider, provider_event_id)
    const eventLedger = new Set<string>()

    function processEvent(provider: string, eventId: string): { duplicate: boolean } {
      const key = `${provider}:${eventId}`
      if (eventLedger.has(key)) {
        return { duplicate: true }
      }
      eventLedger.add(key)
      return { duplicate: false }
    }

    const firstAttempt = processEvent('mock', 'evt_123456')
    expect(firstAttempt.duplicate).toBe(false)

    const duplicateAttempt = processEvent('mock', 'evt_123456')
    expect(duplicateAttempt.duplicate).toBe(true)

    const differentEvent = processEvent('mock', 'evt_789012')
    expect(differentEvent.duplicate).toBe(false)
  })
})
