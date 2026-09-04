import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  WHATSAPP_OTP_PROVIDER_CONFIGURED,
  normalizeWhatsAppPhone,
  formatBrazilianPhoneInput,
  resolveWhatsAppUserRole,
  maskPhoneNumber,
  UnconfiguredWhatsAppOtpProvider,
  defaultWhatsAppOtpProvider,
  type WhatsAppOtpProvider,
} from '@/modules/auth/whatsapp-otp'
import {
  requestWhatsAppOtpAction,
  verifyWhatsAppOtpAction,
} from '@/modules/auth/whatsapp-actions'
import { AUTH_RATE_LIMITS } from '@/modules/auth/rate-limiter'

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (header: string) => {
      if (header === 'x-forwarded-for') return '203.0.113.195'
      return null
    },
  }),
}))

describe('R11.5B1 WhatsApp OTP Foundation & Invariants', () => {
  describe('1. Brazilian Phone Normalization & Input Masking', () => {
    it('normalizes clean 11-digit Brazilian mobile numbers to E.164 (+55XXXXXXXXXXX)', () => {
      const result = normalizeWhatsAppPhone('11987654321')
      expect(result.valid).toBe(true)
      expect(result.e164).toBe('+5511987654321')
      expect(result.formatted).toBe('(11) 98765-4321')
      expect(result.rawDigits).toBe('11987654321')
    })

    it('normalizes numbers with existing +55 country code', () => {
      const result = normalizeWhatsAppPhone('+5511987654321')
      expect(result.valid).toBe(true)
      expect(result.e164).toBe('+5511987654321')
      expect(result.formatted).toBe('(11) 98765-4321')
    })

    it('normalizes numbers with 55 prefix without plus', () => {
      const result = normalizeWhatsAppPhone('5511987654321')
      expect(result.valid).toBe(true)
      expect(result.e164).toBe('+5511987654321')
    })

    it('normalizes formatted Brazilian input with spaces, parentheses and hyphens', () => {
      const result = normalizeWhatsAppPhone('+55 (11) 98765-4321')
      expect(result.valid).toBe(true)
      expect(result.e164).toBe('+5511987654321')
      expect(result.formatted).toBe('(11) 98765-4321')
    })

    it('handles leading trunk zero (e.g. 011987654321)', () => {
      const result = normalizeWhatsAppPhone('011987654321')
      expect(result.valid).toBe(true)
      expect(result.e164).toBe('+5511987654321')
    })

    it('rejects numbers missing the 9th digit (e.g. old 8-digit format / landlines)', () => {
      const result = normalizeWhatsAppPhone('1187654321') // 10 digits
      expect(result.valid).toBe(false)
      expect(result.error).toContain('celular de 9 dígitos')
    })

    it('rejects numbers where the first digit after DDD is not 9', () => {
      const result = normalizeWhatsAppPhone('11387654321') // starts with 3 (landline)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('deve iniciar com 9')
    })

    it('rejects invalid DDDs (e.g. 05, 00)', () => {
      const result = normalizeWhatsAppPhone('05987654321')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('DDD')
    })

    it('rejects empty, null, undefined, and non-numeric garbage', () => {
      expect(normalizeWhatsAppPhone(null).valid).toBe(false)
      expect(normalizeWhatsAppPhone(undefined).valid).toBe(false)
      expect(normalizeWhatsAppPhone('').valid).toBe(false)
      expect(normalizeWhatsAppPhone('invalid-string').valid).toBe(false)
    })

    it('formats input values dynamically for Brazilian display mask', () => {
      expect(formatBrazilianPhoneInput('')).toBe('')
      expect(formatBrazilianPhoneInput('1')).toBe('(1')
      expect(formatBrazilianPhoneInput('11')).toBe('(11')
      expect(formatBrazilianPhoneInput('119')).toBe('(11) 9')
      expect(formatBrazilianPhoneInput('1198765')).toBe('(11) 98765')
      expect(formatBrazilianPhoneInput('11987654321')).toBe('(11) 98765-4321')
      expect(formatBrazilianPhoneInput('11987654321999')).toBe('(11) 98765-4321') // capped at 11 digits
    })
  })

  describe('2. Provider Unconfigured Guard & Disabled Implementation', () => {
    it('has WHATSAPP_OTP_PROVIDER_CONFIGURED set to false as const', () => {
      expect(WHATSAPP_OTP_PROVIDER_CONFIGURED).toBe(false)
    })

    it('unconfigured provider has isConfigured = false', () => {
      const provider = new UnconfiguredWhatsAppOtpProvider()
      expect(provider.isConfigured).toBe(false)
      expect(defaultWhatsAppOtpProvider.isConfigured).toBe(false)
    })

    it('requestOtp returns generic unavailable error and never fakes success', async () => {
      const provider = new UnconfiguredWhatsAppOtpProvider()
      const result = await provider.requestOtp('+5511987654321', 'LOGIN')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('não está disponível')
    })

    it('verifyOtp returns generic unavailable error and never fakes verification', async () => {
      const provider = new UnconfiguredWhatsAppOtpProvider()
      const result = await provider.verifyOtp('+5511987654321', '123456', 'LOGIN')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('não está disponível')
      expect(result.sessionToken).toBeUndefined()
    })
  })

  describe('3. Role Safety & Fail-Closed Intent Model', () => {
    it('preserves existing account role immutably (existing ADVERTISER stays ADVERTISER)', () => {
      const res = resolveWhatsAppUserRole('ADVERTISER', 'CLIENT')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.role).toBe('ADVERTISER')
        expect(res.requiresIntentSelection).toBe(false)
      }
    })

    it('preserves existing account role immutably (existing CLIENT stays CLIENT)', () => {
      const res = resolveWhatsAppUserRole('CLIENT', 'ADVERTISER')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.role).toBe('CLIENT')
        expect(res.requiresIntentSelection).toBe(false)
      }
    })

    it('fails closed for new user attempting LOGIN intent (requires explicit intent choice)', () => {
      const res = resolveWhatsAppUserRole(null, 'LOGIN')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.role).toBeNull()
        expect(res.requiresIntentSelection).toBe(true)
        expect(res.error).toBeDefined()
      }
    })

    it('resolves explicit ADVERTISER intent from signup flow', () => {
      const res = resolveWhatsAppUserRole(null, 'ADVERTISER')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.role).toBe('ADVERTISER')
        expect(res.requiresIntentSelection).toBe(false)
      }
    })

    it('resolves explicit CLIENT intent from client signup flow', () => {
      const res = resolveWhatsAppUserRole(null, 'CLIENT')
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.role).toBe('CLIENT')
        expect(res.requiresIntentSelection).toBe(false)
      }
    })

    it('never assigns role from phone number alone (rejects invalid intent)', () => {
      const res = resolveWhatsAppUserRole(null, 'INVALID_INTENT' as any)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.role).toBeNull()
        expect(res.requiresIntentSelection).toBe(true)
      }
    })
  })

  describe('4. Security & No Plaintext Code Logging Invariant', () => {
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

    it('never logs raw OTP codes during verification', async () => {
      const secretCode = '948215'
      await defaultWhatsAppOtpProvider.verifyOtp('+5511987654321', secretCode, 'LOGIN')

      // Verify secret code was never logged in any console output
      for (const spy of [logSpy, infoSpy, warnSpy, errorSpy]) {
        for (const call of spy.mock.calls) {
          const content = JSON.stringify(call)
          expect(content).not.toContain(secretCode)
        }
      }
    })

    it('masks phone numbers safely for display or audit logs', () => {
      const masked = maskPhoneNumber('+5511987654321')
      expect(masked).toBe('+55119****-**21')
      expect(masked).not.toContain('876543')
    })
  })

  describe('5. Server Actions Contract & Validation', () => {
    it('requestWhatsAppOtpAction validates phone and rejects malformed input', async () => {
      const result = await requestWhatsAppOtpAction('123', 'LOGIN')
      expect(result.success).toBe(false)
      expect(result.error).toContain('DDD')
    })

    it('requestWhatsAppOtpAction rejects invalid intent', async () => {
      const result = await requestWhatsAppOtpAction('(11) 98765-4321', 'UNKNOWN' as any)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Intenção')
    })

    it('requestWhatsAppOtpAction with unconfigured provider returns generic error', async () => {
      const result = await requestWhatsAppOtpAction('(11) 98765-4321', 'LOGIN')
      expect(result.success).toBe(false)
      expect(result.error).toContain('não está disponível')
    })

    it('verifyWhatsAppOtpAction rejects non-6-digit codes', async () => {
      const invalidCodes = ['', '123', '12345', '1234567', 'abcdef', '12345a']
      for (const code of invalidCodes) {
        const result = await verifyWhatsAppOtpAction('(11) 98765-4321', code, 'LOGIN')
        expect(result.success).toBe(false)
        expect(result.error).toContain('6 dígitos')
      }
    })

    it('verifyWhatsAppOtpAction rejects invalid intent', async () => {
      const result = await verifyWhatsAppOtpAction('(11) 98765-4321', '123456', 'UNKNOWN' as any)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Intenção')
    })

    it('verifyWhatsAppOtpAction with unconfigured provider fails closed', async () => {
      const result = await verifyWhatsAppOtpAction('(11) 98765-4321', '123456', 'LOGIN')
      expect(result.success).toBe(false)
      expect(result.error).toContain('não está disponível')
    })
  })

  describe('6. Rate Limit Contract', () => {
    it('defines rate limits for OTP_REQUEST and OTP_VERIFY', () => {
      expect(AUTH_RATE_LIMITS.OTP_REQUEST).toBeDefined()
      expect(AUTH_RATE_LIMITS.OTP_REQUEST.limit).toBe(5)
      expect(AUTH_RATE_LIMITS.OTP_REQUEST.windowSeconds).toBe(900)

      expect(AUTH_RATE_LIMITS.OTP_VERIFY).toBeDefined()
      expect(AUTH_RATE_LIMITS.OTP_VERIFY.limit).toBe(5)
      expect(AUTH_RATE_LIMITS.OTP_VERIFY.windowSeconds).toBe(900)
    })
  })
})
