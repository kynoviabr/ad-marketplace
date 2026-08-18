import { describe, it, expect } from 'vitest'
import { isBoostTimeEligible, isBoostPlacementEligible } from '@/modules/promotions/eligibility'
import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { AccountUser } from '@/modules/auth/types'
import type { IdentityVerification } from '@/modules/verification/types'

describe('FASE 08 — Boost Placement Eligibility (Fail-Closed)', () => {
  const now = new Date('2026-08-18T12:00:00Z')

  const validProfile: Pick<ProfessionalProfile, 'status' | 'content_moderation_status'> = {
    status: 'ACTIVE',
    content_moderation_status: 'APPROVED',
  }

  const validAccount: Pick<AccountUser, 'status'> = {
    status: 'ACTIVE',
  }

  const validVerification: Pick<IdentityVerification, 'status' | 'identity_verified' | 'age_verified'> = {
    status: 'VERIFIED',
    identity_verified: true,
    age_verified: true,
  }

  describe('isBoostTimeEligible', () => {
    it('returns true when status is ACTIVE and current time is within bounds', () => {
      const boost = {
        status: 'ACTIVE' as const,
        starts_at: '2026-08-18T00:00:00Z',
        ends_at: '2026-08-19T00:00:00Z',
      }
      expect(isBoostTimeEligible(boost, now)).toBe(true)
    })

    it('returns false when starts_at is in the future (SCHEDULED or delayed start)', () => {
      const boost = {
        status: 'ACTIVE' as const,
        starts_at: '2026-08-18T13:00:00Z', // 1 hour in future
        ends_at: '2026-08-19T13:00:00Z',
      }
      expect(isBoostTimeEligible(boost, now)).toBe(false)
    })

    it('returns false when ends_at is in the past (expired, even if status is ACTIVE)', () => {
      const boost = {
        status: 'ACTIVE' as const,
        starts_at: '2026-08-17T00:00:00Z',
        ends_at: '2026-08-18T11:59:59Z', // 1 sec in past
      }
      expect(isBoostTimeEligible(boost, now)).toBe(false)
    })

    it('returns false when status is SCHEDULED', () => {
      const boost = {
        status: 'SCHEDULED' as const,
        starts_at: '2026-08-18T15:00:00Z',
        ends_at: '2026-08-19T15:00:00Z',
      }
      expect(isBoostTimeEligible(boost, now)).toBe(false)
    })

    it('returns false when status is COMPLETED or CANCELED', () => {
      expect(
        isBoostTimeEligible(
          { status: 'COMPLETED' as const, starts_at: '2026-08-17T00:00:00Z', ends_at: '2026-08-19T00:00:00Z' },
          now
        )
      ).toBe(false)
      expect(
        isBoostTimeEligible(
          { status: 'CANCELED' as const, starts_at: '2026-08-17T00:00:00Z', ends_at: '2026-08-19T00:00:00Z' },
          now
        )
      ).toBe(false)
    })

    it('returns false for null boost object', () => {
      expect(isBoostTimeEligible(null, now)).toBe(false)
    })
  })

  describe('isBoostPlacementEligible — 8 Publication Gates Composition', () => {
    const validBoost = {
      status: 'ACTIVE' as const,
      starts_at: '2026-08-18T00:00:00Z',
      ends_at: '2026-08-19T00:00:00Z',
    }

    it('returns true when boost is time-eligible AND all 8 publication gates are satisfied', () => {
      const result = isBoostPlacementEligible({
        boost: validBoost,
        product: { is_active: true },
        price: { is_active: true },
        profile: validProfile,
        account: validAccount,
        verification: validVerification,
        locationsCount: 2,
        approvedPhotosCount: 3,
        publicationEntitlement: true,
        now,
      })
      expect(result).toBe(true)
    })

    it('returns false when base subscription publication entitlement is FALSE', () => {
      const result = isBoostPlacementEligible({
        boost: validBoost,
        profile: validProfile,
        account: validAccount,
        verification: validVerification,
        locationsCount: 2,
        approvedPhotosCount: 3,
        publicationEntitlement: false, // Expired / no base subscription
        now,
      })
      expect(result).toBe(false)
    })

    it('returns false when content moderation is FLAGGED or PENDING', () => {
      const result = isBoostPlacementEligible({
        boost: validBoost,
        profile: { status: 'ACTIVE', content_moderation_status: 'FLAGGED' },
        account: validAccount,
        verification: validVerification,
        locationsCount: 2,
        approvedPhotosCount: 3,
        publicationEntitlement: true,
        now,
      })
      expect(result).toBe(false)
    })

    it('returns false when account is SUSPENDED', () => {
      const result = isBoostPlacementEligible({
        boost: validBoost,
        profile: validProfile,
        account: { status: 'SUSPENDED' },
        verification: validVerification,
        locationsCount: 2,
        approvedPhotosCount: 3,
        publicationEntitlement: true,
        now,
      })
      expect(result).toBe(false)
    })

    it('returns false when KYC is not verified', () => {
      const result = isBoostPlacementEligible({
        boost: validBoost,
        profile: validProfile,
        account: validAccount,
        verification: { status: 'PENDING', identity_verified: false, age_verified: false },
        locationsCount: 2,
        approvedPhotosCount: 3,
        publicationEntitlement: true,
        now,
      })
      expect(result).toBe(false)
    })

    it('returns false when 0 approved photos exist', () => {
      const result = isBoostPlacementEligible({
        boost: validBoost,
        profile: validProfile,
        account: validAccount,
        verification: validVerification,
        locationsCount: 2,
        approvedPhotosCount: 0,
        publicationEntitlement: true,
        now,
      })
      expect(result).toBe(false)
    })

    it('returns false when product or price is inactive', () => {
      expect(
        isBoostPlacementEligible({
          boost: validBoost,
          product: { is_active: false },
          price: { is_active: true },
          profile: validProfile,
          account: validAccount,
          verification: validVerification,
          locationsCount: 2,
          approvedPhotosCount: 3,
          publicationEntitlement: true,
          now,
        })
      ).toBe(false)

      expect(
        isBoostPlacementEligible({
          boost: validBoost,
          product: { is_active: true },
          price: { is_active: false },
          profile: validProfile,
          account: validAccount,
          verification: validVerification,
          locationsCount: 2,
          approvedPhotosCount: 3,
          publicationEntitlement: true,
          now,
        })
      ).toBe(false)
    })
  })
})
