import { describe, it, expect } from 'vitest'
import {
  isValidTransition,
  isTerminalState,
  shouldIgnoreOutdatedWebhook,
  ALLOWED_TRANSITIONS,
} from '@/modules/verification/state-machine'
import type { VerificationStatus } from '@/modules/verification/types'

describe('Verification State Machine', () => {
  it('allows identical from/to status transitions (no-op)', () => {
    const statuses: VerificationStatus[] = [
      'NOT_STARTED',
      'PENDING',
      'IN_PROGRESS',
      'IN_REVIEW',
      'VERIFIED',
      'REJECTED',
      'EXPIRED',
    ]

    for (const s of statuses) {
      expect(isValidTransition(s, s)).toBe(true)
    }
  })

  it('allows valid forward workflow transitions', () => {
    // NOT_STARTED -> PENDING
    expect(isValidTransition('NOT_STARTED', 'PENDING')).toBe(true)

    // PENDING -> IN_PROGRESS, IN_REVIEW, VERIFIED, REJECTED, EXPIRED
    expect(isValidTransition('PENDING', 'IN_PROGRESS')).toBe(true)
    expect(isValidTransition('PENDING', 'IN_REVIEW')).toBe(true)
    expect(isValidTransition('PENDING', 'VERIFIED')).toBe(true)
    expect(isValidTransition('PENDING', 'REJECTED')).toBe(true)
    expect(isValidTransition('PENDING', 'EXPIRED')).toBe(true)

    // IN_PROGRESS -> IN_REVIEW, VERIFIED, REJECTED, EXPIRED
    expect(isValidTransition('IN_PROGRESS', 'IN_REVIEW')).toBe(true)
    expect(isValidTransition('IN_PROGRESS', 'VERIFIED')).toBe(true)
    expect(isValidTransition('IN_PROGRESS', 'REJECTED')).toBe(true)
    expect(isValidTransition('IN_PROGRESS', 'EXPIRED')).toBe(true)

    // IN_REVIEW -> VERIFIED, REJECTED, EXPIRED
    expect(isValidTransition('IN_REVIEW', 'VERIFIED')).toBe(true)
    expect(isValidTransition('IN_REVIEW', 'REJECTED')).toBe(true)
    expect(isValidTransition('IN_REVIEW', 'EXPIRED')).toBe(true)

    // Re-verification from REJECTED or EXPIRED back to PENDING
    expect(isValidTransition('REJECTED', 'PENDING')).toBe(true)
    expect(isValidTransition('EXPIRED', 'PENDING')).toBe(true)
  })

  it('strictly blocks prohibited and backwards transitions', () => {
    // Cannot skip directly from NOT_STARTED to VERIFIED
    expect(isValidTransition('NOT_STARTED', 'VERIFIED')).toBe(false)
    expect(isValidTransition('NOT_STARTED', 'IN_REVIEW')).toBe(false)

    // Cannot regress from VERIFIED to intermediate states
    expect(isValidTransition('VERIFIED', 'PENDING')).toBe(false)
    expect(isValidTransition('VERIFIED', 'IN_PROGRESS')).toBe(false)
    expect(isValidTransition('VERIFIED', 'IN_REVIEW')).toBe(false)
    expect(isValidTransition('VERIFIED', 'REJECTED')).toBe(false)

    // Cannot regress from IN_REVIEW to PENDING
    expect(isValidTransition('IN_REVIEW', 'PENDING')).toBe(false)
    expect(isValidTransition('IN_REVIEW', 'IN_PROGRESS')).toBe(false)
  })

  it('correctly identifies terminal states', () => {
    expect(isTerminalState('VERIFIED')).toBe(true)
    expect(isTerminalState('NOT_STARTED')).toBe(false)
    expect(isTerminalState('PENDING')).toBe(false)
    expect(isTerminalState('IN_PROGRESS')).toBe(false)
    expect(isTerminalState('IN_REVIEW')).toBe(false)
    expect(isTerminalState('REJECTED')).toBe(false)
    expect(isTerminalState('EXPIRED')).toBe(false)
  })

  it('identifies outdated/out-of-order webhook events', () => {
    // Current is VERIFIED -> any incoming non-VERIFIED event must be ignored
    expect(shouldIgnoreOutdatedWebhook('VERIFIED', 'IN_PROGRESS')).toBe(true)
    expect(shouldIgnoreOutdatedWebhook('VERIFIED', 'IN_REVIEW')).toBe(true)
    expect(shouldIgnoreOutdatedWebhook('VERIFIED', 'REJECTED')).toBe(true)

    // Current is IN_REVIEW -> incoming PENDING is invalid regression
    expect(shouldIgnoreOutdatedWebhook('IN_REVIEW', 'PENDING')).toBe(true)

    // Current is PENDING -> incoming VERIFIED is valid (e.g. fast decision)
    expect(shouldIgnoreOutdatedWebhook('PENDING', 'VERIFIED')).toBe(false)
  })
})
