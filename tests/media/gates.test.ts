import { describe, it, expect } from 'vitest'
import { canUploadMedia, getRemainingPhotoQuota } from '@/modules/media/gates'

describe('FASE 05 — Media Upload Gates & Quota Invariants', () => {
  it('blocks upload if account is null or inactive', () => {
    const verification = { status: 'VERIFIED' as const, identity_verified: true, age_verified: true }

    expect(canUploadMedia(null, verification, 0).allowed).toBe(false)
    expect(canUploadMedia({ status: 'SUSPENDED' }, verification, 0).allowed).toBe(false)
  })

  it('blocks upload if KYC is not verified or age is not verified', () => {
    const account = { status: 'ACTIVE' as const }

    expect(canUploadMedia(account, null, 0).allowed).toBe(false)
    expect(canUploadMedia(account, { status: 'PENDING' as const, identity_verified: false, age_verified: false }, 0).allowed).toBe(false)
    expect(canUploadMedia(account, { status: 'VERIFIED' as const, identity_verified: true, age_verified: false }, 0).allowed).toBe(false)
  })

  it('allows upload if account is active, KYC is fully verified 18+, and quota is available', () => {
    const account = { status: 'ACTIVE' as const }
    const verification = { status: 'VERIFIED' as const, identity_verified: true, age_verified: true }

    const result = canUploadMedia(account, verification, 3, 10)
    expect(result.allowed).toBe(true)
  })

  it('blocks upload when max photo quota is reached', () => {
    const account = { status: 'ACTIVE' as const }
    const verification = { status: 'VERIFIED' as const, identity_verified: true, age_verified: true }

    const result = canUploadMedia(account, verification, 10, 10)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Limite de fotos atingido')
  })

  it('calculates remaining photo quota accurately', () => {
    expect(getRemainingPhotoQuota(0, 10)).toBe(10)
    expect(getRemainingPhotoQuota(4, 10)).toBe(6)
    expect(getRemainingPhotoQuota(10, 10)).toBe(0)
    expect(getRemainingPhotoQuota(15, 10)).toBe(0) // never negative
  })
})
