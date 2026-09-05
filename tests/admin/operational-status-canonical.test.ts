/**
 * Tests: Canonical Operational Status Classification — Backlog Item H
 *
 * Verifies that classifyOperationalStatus enforces publication eligibility
 * strictly: a profile cannot be classified as ACTIVE if isCanonicallyEligible is false,
 * regardless of content moderation status.
 */

import { describe, it, expect } from 'vitest'
import { classifyOperationalStatus } from '@/modules/admin/operational-status'

describe('Backlog Item H: Canonical Operational Status Classification', () => {
  it('prevents ACTIVE classification when isCanonicallyEligible is false, even if moderation is APPROVED', () => {
    const status = classifyOperationalStatus({
      accountStatus: 'ACTIVE',
      profileStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      contentModerationStatus: 'APPROVED',
      isCanonicallyEligible: false, // Strict publication gate: NOT eligible
    })

    expect(status).not.toBe('ACTIVE')
    expect(status).toBe('BLOCKED_OR_INELIGIBLE')
  })

  it('classifies as ACTIVE when isCanonicallyEligible is true, moderation is APPROVED, and all conditions met', () => {
    const status = classifyOperationalStatus({
      accountStatus: 'ACTIVE',
      profileStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      contentModerationStatus: 'APPROVED',
      isCanonicallyEligible: true, // Canonically eligible
    })

    expect(status).toBe('ACTIVE')
  })

  it('falls back to contentModerationStatus when isCanonicallyEligible is undefined (backward compatibility)', () => {
    const approvedStatus = classifyOperationalStatus({
      accountStatus: 'ACTIVE',
      profileStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      contentModerationStatus: 'APPROVED',
    })

    expect(approvedStatus).toBe('ACTIVE')

    const pendingStatus = classifyOperationalStatus({
      accountStatus: 'ACTIVE',
      profileStatus: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      contentModerationStatus: 'PENDING',
    })

    expect(pendingStatus).toBe('NEEDS_REVIEW')
  })
})
