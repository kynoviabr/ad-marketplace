import { describe, it, expect } from 'vitest'
import {
  canProceedToProfessionalProfile,
  canUploadAdultMedia,
  canPublishProfile,
  isIdentityVerified,
  isAgeVerified,
  isVerifiedAdult,
} from '@/modules/verification/gates'
import type { IdentityVerification, VerificationSafeDTO } from '@/modules/verification/types'

describe('Verification Authorization Gates', () => {
  const validVerifiedRecord: IdentityVerification = {
    id: '11111111-1111-1111-1111-111111111111',
    account_user_id: '22222222-2222-2222-2222-222222222222',
    provider: 'didit',
    provider_session_id: 'sess_123',
    status: 'VERIFIED',
    identity_verified: true,
    age_verified: true,
    cpf_verified: true,
    verified_country: 'BR',
    started_at: '2026-08-18T10:00:00Z',
    submitted_at: '2026-08-18T10:05:00Z',
    verified_at: '2026-08-18T10:06:00Z',
    expires_at: null,
    created_at: '2026-08-18T10:00:00Z',
    updated_at: '2026-08-18T10:06:00Z',
  }

  const validSafeDTO: VerificationSafeDTO = {
    status: 'VERIFIED',
    identityVerified: true,
    ageVerified: true,
    verifiedAt: '2026-08-18T10:06:00Z',
    expiresAt: null,
  }

  it('allows access when identity and age are confirmed with no expiration', () => {
    expect(canProceedToProfessionalProfile(validVerifiedRecord)).toBe(true)
    expect(canProceedToProfessionalProfile(validSafeDTO)).toBe(true)
    expect(canUploadAdultMedia(validVerifiedRecord)).toBe(true)
    expect(canPublishProfile(validVerifiedRecord)).toBe(true)
    expect(isIdentityVerified(validVerifiedRecord)).toBe(true)
    expect(isAgeVerified(validVerifiedRecord)).toBe(true)
    expect(isVerifiedAdult(validVerifiedRecord)).toBe(true)
  })

  it('allows access when expiration date is in the future', () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString() // +30 days
    const withFutureExpiry = { ...validVerifiedRecord, expires_at: futureDate }

    expect(canProceedToProfessionalProfile(withFutureExpiry)).toBe(true)
    expect(canUploadAdultMedia(withFutureExpiry)).toBe(true)
  })

  it('strictly blocks when record is null or missing', () => {
    expect(canProceedToProfessionalProfile(null)).toBe(false)
    expect(canUploadAdultMedia(null)).toBe(false)
    expect(canPublishProfile(null)).toBe(false)
    expect(isIdentityVerified(null)).toBe(false)
    expect(isAgeVerified(null)).toBe(false)
  })

  it('strictly blocks when status is not VERIFIED', () => {
    const nonVerifiedStatuses: Array<IdentityVerification['status']> = [
      'NOT_STARTED',
      'PENDING',
      'IN_PROGRESS',
      'IN_REVIEW',
      'REJECTED',
      'EXPIRED',
    ]

    for (const status of nonVerifiedStatuses) {
      const record = { ...validVerifiedRecord, status }
      expect(canProceedToProfessionalProfile(record)).toBe(false)
      expect(canUploadAdultMedia(record)).toBe(false)
      expect(canPublishProfile(record)).toBe(false)
    }
  })

  it('strictly blocks when identity is verified but age is NOT verified (under 18)', () => {
    const underageRecord = { ...validVerifiedRecord, age_verified: false }
    const underageDTO = { ...validSafeDTO, ageVerified: false }

    expect(canProceedToProfessionalProfile(underageRecord)).toBe(false)
    expect(canProceedToProfessionalProfile(underageDTO)).toBe(false)
    expect(canUploadAdultMedia(underageRecord)).toBe(false)
    expect(canPublishProfile(underageRecord)).toBe(false)
    expect(isAgeVerified(underageRecord)).toBe(false)
  })

  it('strictly blocks when age is verified but identity is NOT verified', () => {
    const invalidRecord = { ...validVerifiedRecord, identity_verified: false }
    expect(canProceedToProfessionalProfile(invalidRecord)).toBe(false)
    expect(canUploadAdultMedia(invalidRecord)).toBe(false)
  })

  it('strictly blocks when expiration date has passed', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString() // yesterday
    const expiredRecord = { ...validVerifiedRecord, expires_at: pastDate }
    const expiredDTO = { ...validSafeDTO, expiresAt: pastDate }

    expect(canProceedToProfessionalProfile(expiredRecord)).toBe(false)
    expect(canProceedToProfessionalProfile(expiredDTO)).toBe(false)
    expect(canUploadAdultMedia(expiredRecord)).toBe(false)
    expect(canPublishProfile(expiredRecord)).toBe(false)
  })
})
