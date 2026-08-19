import { describe, it, expect } from 'vitest'
import { SubmitReportSchema, ResolveReportSchema } from '@/modules/reports/schemas'
import { generateReporterHash } from '@/modules/reports/abuse'

describe('FASE 06 — Reports Schema & Anti-Abuse Logic', () => {
  it('validates report targeting profile successfully', () => {
    const res = SubmitReportSchema.safeParse({
      profileId: '123e4567-e89b-12d3-a456-426614174000',
      reasonCategory: 'UNDERAGE_SUSPICION',
      description: 'Aparência parece menor de 18 anos.',
    })
    expect(res.success).toBe(true)
  })

  it('validates report targeting media successfully', () => {
    const res = SubmitReportSchema.safeParse({
      mediaId: '123e4567-e89b-12d3-a456-426614174001',
      reasonCategory: 'IMPERSONATION_OR_STOLEN',
      description: 'Foto retirada de rede social de terceiro.',
    })
    expect(res.success).toBe(true)
  })

  it('rejects report having both profileId AND mediaId (violates single target constraint)', () => {
    const res = SubmitReportSchema.safeParse({
      profileId: '123e4567-e89b-12d3-a456-426614174000',
      mediaId: '123e4567-e89b-12d3-a456-426614174001',
      reasonCategory: 'OTHER',
    })
    expect(res.success).toBe(false)
  })

  it('rejects report having neither profileId NOR mediaId', () => {
    const res = SubmitReportSchema.safeParse({
      reasonCategory: 'OTHER',
    })
    expect(res.success).toBe(false)
  })

  it('generates consistent HMAC-SHA256 reporter hash without exposing raw IP', () => {
    // F11-SEC-006: ABUSE_PEPPER is now required. Set it for this test.
    const originalPepper = process.env.ABUSE_PEPPER
    process.env.ABUSE_PEPPER = 'test-pepper-for-unit-tests-only-64chars-abcdefghijklmnopqrstuv'
    try {
      const ip = '192.168.1.100'
      const hash1 = generateReporterHash(ip)
      const hash2 = generateReporterHash(ip)
      const hash3 = generateReporterHash('192.168.1.101')

      expect(hash1).toBe(hash2)
      expect(hash1).not.toBe(hash3)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
      expect(hash1).not.toContain(ip)
    } finally {
      if (originalPepper !== undefined) {
        process.env.ABUSE_PEPPER = originalPepper
      } else {
        delete process.env.ABUSE_PEPPER
      }
    }
  })

  it('throws when ABUSE_PEPPER is not configured (F11-SEC-006)', () => {
    const originalPepper = process.env.ABUSE_PEPPER
    delete process.env.ABUSE_PEPPER
    try {
      expect(() => generateReporterHash('192.168.1.100')).toThrow(/ABUSE_PEPPER/)
    } finally {
      if (originalPepper !== undefined) {
        process.env.ABUSE_PEPPER = originalPepper
      }
    }
  })



  it('validates report resolution schema', () => {
    const res = ResolveReportSchema.safeParse({
      reportId: '123e4567-e89b-12d3-a456-426614174000',
      action: 'QUARANTINE_MEDIA',
      resolutionNotes: 'Conteúdo removido após constatação.',
    })
    expect(res.success).toBe(true)
  })
})
