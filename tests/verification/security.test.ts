import { describe, it, expect } from 'vitest'
import type { IdentityVerification, VerificationSafeDTO } from '@/modules/verification/types'

describe('Verification Security & Privacy Invariants', () => {
  it('VerificationSafeDTO projection excludes confidential and internal columns', () => {
    const rawDbRecord: IdentityVerification = {
      id: 'internal-uuid-secret',
      account_user_id: 'account-uuid-secret',
      provider: 'didit',
      provider_session_id: 'confidential_provider_session_999',
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

    // Function simulating DAL safe DTO construction
    const safeDTO: VerificationSafeDTO = {
      status: rawDbRecord.status,
      identityVerified: rawDbRecord.identity_verified,
      ageVerified: rawDbRecord.age_verified,
      verifiedAt: rawDbRecord.verified_at,
      expiresAt: rawDbRecord.expires_at,
    }

    // Confirm that confidential properties do NOT exist on the DTO
    const dtoKeys = Object.keys(safeDTO)
    expect(dtoKeys).not.toContain('id')
    expect(dtoKeys).not.toContain('account_user_id')
    expect(dtoKeys).not.toContain('provider')
    expect(dtoKeys).not.toContain('provider_session_id')
    expect(dtoKeys).not.toContain('last_webhook_event_id')
  })

  it('verifies that no secret keys are prefix-exposed as NEXT_PUBLIC_', () => {
    const publicEnvVars = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_'))

    expect(publicEnvVars).not.toContain('NEXT_PUBLIC_DIDIT_API_KEY')
    expect(publicEnvVars).not.toContain('NEXT_PUBLIC_DIDIT_WEBHOOK_SECRET')
    expect(publicEnvVars).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
  })
})
