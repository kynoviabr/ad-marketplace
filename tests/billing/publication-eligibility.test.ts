import { describe, it, expect } from 'vitest'
import { isPublicSearchEligible } from '@/modules/search/eligibility'

describe('FASE 07 — Publication Eligibility with Billing Gate', () => {
  const baseAccount = { status: 'ACTIVE' as const }
  const baseVerification = {
    status: 'VERIFIED' as const,
    identity_verified: true,
    age_verified: true,
  }
  const baseProfile = {
    status: 'READY_FOR_REVIEW' as const,
    content_moderation_status: 'APPROVED' as const,
  }

  it('all gates satisfied + billing=true → eligible', () => {
    const eligible = isPublicSearchEligible(
      baseProfile,
      baseAccount,
      baseVerification,
      1, // locationsCount
      1, // approvedPhotosCount
      true // publicationEntitlement
    )
    expect(eligible).toBe(true)
  })

  it('all gates satisfied + billing=false → NOT eligible', () => {
    const eligible = isPublicSearchEligible(
      baseProfile,
      baseAccount,
      baseVerification,
      1,
      1,
      false // billing not entitled
    )
    expect(eligible).toBe(false)
  })

  it('billing=true but KYC not verified → NOT eligible', () => {
    const unverifiedKYC = {
      status: 'PENDING' as const,
      identity_verified: false,
      age_verified: false,
    }
    const eligible = isPublicSearchEligible(
      baseProfile,
      baseAccount,
      unverifiedKYC,
      1,
      1,
      true
    )
    expect(eligible).toBe(false)
  })

  it('billing=true but profile DRAFT → NOT eligible', () => {
    const draftProfile = {
      status: 'DRAFT' as const,
      content_moderation_status: 'APPROVED' as const,
    }
    const eligible = isPublicSearchEligible(
      draftProfile,
      baseAccount,
      baseVerification,
      1,
      1,
      true
    )
    expect(eligible).toBe(false)
  })

  it('billing=true but moderation PENDING → NOT eligible', () => {
    const pendingModerationProfile = {
      status: 'READY_FOR_REVIEW' as const,
      content_moderation_status: 'PENDING' as const,
    }
    const eligible = isPublicSearchEligible(
      pendingModerationProfile,
      baseAccount,
      baseVerification,
      1,
      1,
      true
    )
    expect(eligible).toBe(false)
  })

  it('billing=true but 0 approved photos → NOT eligible', () => {
    const eligible = isPublicSearchEligible(
      baseProfile,
      baseAccount,
      baseVerification,
      1,
      0, // 0 photos
      true
    )
    expect(eligible).toBe(false)
  })

  it('billing=true but 0 locations → NOT eligible', () => {
    const eligible = isPublicSearchEligible(
      baseProfile,
      baseAccount,
      baseVerification,
      0, // 0 locations
      1,
      true
    )
    expect(eligible).toBe(false)
  })

  it('billing=true but account SUSPENDED → NOT eligible', () => {
    const suspendedAccount = { status: 'SUSPENDED' as const }
    const eligible = isPublicSearchEligible(
      baseProfile,
      suspendedAccount,
      baseVerification,
      1,
      1,
      true
    )
    expect(eligible).toBe(false)
  })
})
