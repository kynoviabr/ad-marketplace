import { describe, it, expect } from 'vitest'
import { isPublicationReady } from '@/modules/search/eligibility'

describe('FASE 06 — Publication Readiness Evaluator', () => {
  const baseAccount = { status: 'ACTIVE' as const }
  const baseVerification = { status: 'VERIFIED' as const, identity_verified: true, age_verified: true }
  const baseProfile = { status: 'READY_FOR_REVIEW' as const, content_moderation_status: 'APPROVED' as const }

  it('returns true when all conditions are satisfied (1+ location, 1+ approved photo, approved texts)', () => {
    const ready = isPublicationReady(baseProfile, baseAccount, baseVerification, 1, 1)
    expect(ready).toBe(true)
  })

  it('returns false if profile is in DRAFT status', () => {
    const draftProfile = { status: 'DRAFT' as const, content_moderation_status: 'APPROVED' as const }
    const ready = isPublicationReady(draftProfile, baseAccount, baseVerification, 1, 1)
    expect(ready).toBe(false)
  })

  it('returns false if content_moderation_status is PENDING', () => {
    const pendingProfile = { status: 'READY_FOR_REVIEW' as const, content_moderation_status: 'PENDING' as const }
    const ready = isPublicationReady(pendingProfile, baseAccount, baseVerification, 1, 1)
    expect(ready).toBe(false)
  })

  it('returns false if content_moderation_status is FLAGGED (e.g. Underage Suspicion)', () => {
    const flaggedProfile = { status: 'READY_FOR_REVIEW' as const, content_moderation_status: 'FLAGGED' as const }
    const ready = isPublicationReady(flaggedProfile, baseAccount, baseVerification, 1, 1)
    expect(ready).toBe(false)
  })

  it('returns false if approved photo count is 0', () => {
    const ready = isPublicationReady(baseProfile, baseAccount, baseVerification, 1, 0)
    expect(ready).toBe(false)
  })

  it('returns false if location count is 0', () => {
    const ready = isPublicationReady(baseProfile, baseAccount, baseVerification, 0, 1)
    expect(ready).toBe(false)
  })

  it('returns false if KYC is not verified or age is not verified', () => {
    const unverifiedKYC = { status: 'PENDING' as const, identity_verified: false, age_verified: false }
    const ready = isPublicationReady(baseProfile, baseAccount, unverifiedKYC, 1, 1)
    expect(ready).toBe(false)
  })
})
