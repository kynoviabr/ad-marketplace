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
    const ip = '192.168.1.100'
    const hash1 = generateReporterHash(ip)
    const hash2 = generateReporterHash(ip)
    const hash3 = generateReporterHash('192.168.1.101')

    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
    expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    expect(hash1).not.toContain(ip)
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
