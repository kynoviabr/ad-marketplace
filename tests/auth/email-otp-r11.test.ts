import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeEmail,
  validateEmailOtpCode,
  maskEmail,
} from '@/modules/auth/email-otp'
import {
  requestEmailOtpAction,
  verifyEmailOtpAction,
} from '@/modules/auth/email-otp-actions'
import { EmailOtpButton } from '@/components/auth/email-otp-button'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/lib/config/legal-versions'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (header: string) => {
      if (header === 'x-forwarded-for') return '203.0.113.195'
      return null
    },
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/components/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'pt-BR',
  }),
}))

describe('R11.5C1 Email Passwordless OTP Foundation & Role Safety', () => {
  let mockSupabase: any
  let mockAdmin: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      auth: {
        signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
        verifyOtp: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-auth-123', email: 'test@velvet.club' } },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }
    vi.mocked(createServerClient).mockResolvedValue(mockSupabase)

    mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: { id: 'acc-123' }, error: null }),
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'acc-123' }, error: null }),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin)
  })

  // ---------------------------------------------------------------------------
  // 1. Email Normalization & Code Format Validation
  // ---------------------------------------------------------------------------
  describe('1. Normalization & Input Validation', () => {
    it('normalizes valid emails to lowercase and trims whitespace', () => {
      const result = normalizeEmail('  User.Name+Tag@Domain.COM  ')
      expect(result.valid).toBe(true)
      expect(result.email).toBe('user.name+tag@domain.com')
    })

    it('rejects invalid email formats', () => {
      const invalidEmails = ['', 'not-an-email', '@missing-local.com', 'missing-domain@', 'spaces in@email.com']
      for (const email of invalidEmails) {
        expect(normalizeEmail(email).valid).toBe(false)
      }
      expect(normalizeEmail(null).valid).toBe(false)
      expect(normalizeEmail(undefined).valid).toBe(false)
    })

    it('validates strict 6-digit numeric OTP code', () => {
      const valid = validateEmailOtpCode('123456')
      expect(valid.valid).toBe(true)
      expect(valid.code).toBe('123456')
    })

    it('rejects non-6-digit or non-numeric codes', () => {
      const invalidCodes = ['', '123', '12345', '1234567', 'abcdef', '12a456', '      ']
      for (const code of invalidCodes) {
        expect(validateEmailOtpCode(code).valid).toBe(false)
      }
      expect(validateEmailOtpCode(null).valid).toBe(false)
      expect(validateEmailOtpCode(undefined).valid).toBe(false)
    })

    it('masks emails safely for display without disclosing full address', () => {
      expect(maskEmail('contato@velvet.club')).toBe('co***o@velvet.club')
      expect(maskEmail('a@b.com')).toBe('a***@b.com')
      expect(maskEmail('')).toBe('')
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Request OTP Server Action
  // ---------------------------------------------------------------------------
  describe('2. Request Email OTP Flow', () => {
    it('requests OTP with shouldCreateUser: true for ADVERTISER intent', async () => {
      const result = await requestEmailOtpAction('prof@velvet.club', 'ADVERTISER')
      expect(result.success).toBe(true)
      expect(result.email).toBe('prof@velvet.club')
      expect(result.retryAfterSeconds).toBe(60)
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'prof@velvet.club',
        options: { shouldCreateUser: true },
      })
    })

    it('requests OTP with shouldCreateUser: true for CLIENT intent', async () => {
      const result = await requestEmailOtpAction('client@velvet.club', 'CLIENT')
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'client@velvet.club',
        options: { shouldCreateUser: true },
      })
    })

    it('requests OTP with shouldCreateUser: false for LOGIN intent', async () => {
      const result = await requestEmailOtpAction('existing@velvet.club', 'LOGIN')
      expect(result.success).toBe(true)
      expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'existing@velvet.club',
        options: { shouldCreateUser: false },
      })
    })

    it('fails closed when LOGIN intent encounters non-existent user', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: {},
        error: { message: 'Signups not allowed for otp', status: 400 },
      })

      const result = await requestEmailOtpAction('unknown@velvet.club', 'LOGIN')
      expect(result.success).toBe(false)
      expect(result.requiresIntentSelection).toBe(true)
      expect(result.error).toBe('signup_intent_required')
    })

    it('returns delivery error when Supabase signInWithOtp fails for signup', async () => {
      mockSupabase.auth.signInWithOtp.mockResolvedValueOnce({
        data: {},
        error: { message: 'SMTP error', status: 500 },
      })

      const result = await requestEmailOtpAction('prof@velvet.club', 'ADVERTISER')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Não foi possível enviar')
    })

    it('rejects malformed email address on request', async () => {
      const result = await requestEmailOtpAction('invalid-email', 'ADVERTISER')
      expect(result.success).toBe(false)
      expect(result.error).toContain('e-mail válido')
    })

    it('rejects invalid authentication intent on request', async () => {
      const result = await requestEmailOtpAction('valid@velvet.club', 'UNKNOWN_INTENT' as any)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Intenção')
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Verify OTP & Fail-Closed / Role Safety
  // ---------------------------------------------------------------------------
  describe('3. Verify OTP & Role Invariants', () => {
    it('fails closed on invalid or expired OTP code', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Token has expired or is invalid' },
      })

      const result = await verifyEmailOtpAction('user@velvet.club', '123456', 'LOGIN')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Código inválido ou expirado')
    })

    it('fails closed when an unknown user verifies OTP under LOGIN intent (requires intent selection)', async () => {
      // Mock verifyOtp success, but no completed account_users record
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'new-user-id', email: 'new@velvet.club' } },
        error: null,
      })

      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }), // no existing account
      })

      const result = await verifyEmailOtpAction('new@velvet.club', '123456', 'LOGIN')

      expect(result.success).toBe(false)
      expect(result.requiresIntentSelection).toBe(true)
      expect(result.error).toBe('signup_intent_required')

      // Verifies cleanup of ambiguous account
      expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('new-user-id')
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('creates ADVERTISER account with authoritative legal versions on ADVERTISER signup intent', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'adv-new-id', email: 'adv@velvet.club' } },
        error: null,
      })

      // No existing account
      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })

      const upsertMock = vi.fn().mockResolvedValue({ error: null })
      mockAdmin.from.mockReturnValueOnce({
        upsert: upsertMock,
      })

      const result = await verifyEmailOtpAction('adv@velvet.club', '123456', 'ADVERTISER')

      expect(result.success).toBe(true)
      expect(result.destination).toBe('/onboarding')
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_user_id: 'adv-new-id',
          role: 'ADVERTISER',
          status: 'ACTIVE',
          onboarding_status: 'NOT_STARTED',
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        }),
        { onConflict: 'auth_user_id' }
      )
    })

    it('creates CLIENT account and free membership on CLIENT signup intent', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'client-new-id', email: 'cli@velvet.club' } },
        error: null,
      })

      // No existing account
      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })

      const upsertAccountMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'client-acc-id' }, error: null }),
        }),
      })
      const upsertMembershipMock = vi.fn().mockResolvedValue({ error: null })

      mockAdmin.from
        .mockReturnValueOnce({ upsert: upsertAccountMock })
        .mockReturnValueOnce({ upsert: upsertMembershipMock })

      const result = await verifyEmailOtpAction('cli@velvet.club', '123456', 'CLIENT')

      expect(result.success).toBe(true)
      expect(result.destination).toBe('/cliente')
      expect(upsertAccountMock).toHaveBeenCalledWith(
        expect.objectContaining({
          auth_user_id: 'client-new-id',
          role: 'CLIENT',
          status: 'ACTIVE',
          onboarding_status: 'COMPLETED',
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        }),
        { onConflict: 'auth_user_id' }
      )
      expect(upsertMembershipMock).toHaveBeenCalledWith(
        {
          account_id: 'client-acc-id',
          membership_type: 'FREE',
        },
        { onConflict: 'account_id' }
      )
    })

    it('preserves existing account role immutably for CLIENT (never overwrites role)', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'existing-client-id', email: 'existing@velvet.club' } },
        error: null,
      })

      // Existing CLIENT account
      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'acc-client',
            role: 'CLIENT',
            status: 'ACTIVE',
            terms_version: CURRENT_TERMS_VERSION,
          },
        }),
      })

      // User attempted to verify with ADVERTISER intent
      const result = await verifyEmailOtpAction('existing@velvet.club', '123456', 'ADVERTISER')

      expect(result.success).toBe(true)
      // Must still route to CLIENT dashboard because existing role is immutable!
      expect(result.destination).toBe('/cliente')
    })

    it('preserves existing account role immutably for completed ADVERTISER', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'existing-adv-id', email: 'adv@velvet.club' } },
        error: null,
      })

      // Existing ADVERTISER account
      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'acc-adv',
            role: 'ADVERTISER',
            status: 'ACTIVE',
            onboarding_status: 'COMPLETED',
            terms_version: CURRENT_TERMS_VERSION,
          },
        }),
      })

      // User attempted to verify with CLIENT intent
      const result = await verifyEmailOtpAction('adv@velvet.club', '123456', 'CLIENT')

      expect(result.success).toBe(true)
      // Must route to ADVERTISER /dashboard
      expect(result.destination).toBe('/dashboard')
    })

    it('routes existing suspended accounts to /suspended', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'suspended-id', email: 'susp@velvet.club' } },
        error: null,
      })

      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'acc-susp',
            role: 'ADVERTISER',
            status: 'SUSPENDED',
            terms_version: CURRENT_TERMS_VERSION,
          },
        }),
      })

      const result = await verifyEmailOtpAction('susp@velvet.club', '123456', 'LOGIN')
      expect(result.success).toBe(true)
      expect(result.destination).toBe('/suspended')
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Security & No Plaintext Code Logging Invariant
  // ---------------------------------------------------------------------------
  describe('4. Security: No Plaintext OTP Logging', () => {
    let logSpy: any
    let infoSpy: any
    let warnSpy: any
    let errorSpy: any

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log')
      infoSpy = vi.spyOn(console, 'info')
      warnSpy = vi.spyOn(console, 'warn')
      errorSpy = vi.spyOn(console, 'error')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('never logs raw OTP codes during failed verification', async () => {
      const secretCode = '839201'
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid code' },
      })

      await verifyEmailOtpAction('user@velvet.club', secretCode, 'LOGIN')

      for (const spy of [logSpy, infoSpy, warnSpy, errorSpy]) {
        for (const call of spy.mock.calls) {
          const content = JSON.stringify(call)
          expect(content).not.toContain(secretCode)
        }
      }
    })

    it('never logs raw OTP codes during successful verification', async () => {
      const secretCode = '615243'
      mockSupabase.auth.verifyOtp.mockResolvedValueOnce({
        data: { user: { id: 'auth-test-id' } },
        error: null,
      })
      mockAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'acc-id', role: 'CLIENT', status: 'ACTIVE', terms_version: '1.0' },
        }),
      })

      await verifyEmailOtpAction('user@velvet.club', secretCode, 'LOGIN')

      for (const spy of [logSpy, infoSpy, warnSpy, errorSpy]) {
        for (const call of spy.mock.calls) {
          const content = JSON.stringify(call)
          expect(content).not.toContain(secretCode)
        }
      }
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Component Visibility and Prop Contracts
  // ---------------------------------------------------------------------------
  describe('5. UI Component Contracts', () => {
    it('EmailOtpButton renders by default', () => {
      const rendered = EmailOtpButton({ intent: 'LOGIN' })
      expect(rendered).not.toBeNull()
      expect(rendered).toHaveProperty('type')
    })

    it('EmailOtpButton respects explicit enabled=false prop', () => {
      const rendered = EmailOtpButton({ intent: 'LOGIN', enabled: false })
      expect(rendered).toBeNull()
    })
  })
})
