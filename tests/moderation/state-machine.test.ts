import { describe, it, expect } from 'vitest'
import { ModerateMediaSchema, ModerateProfileSchema } from '@/modules/moderation/schemas'

describe('FASE 06 — Moderation State Machine & Validation', () => {
  it('validates successful APPROVE decision for media', () => {
    const res = ModerateMediaSchema.safeParse({
      mediaId: '123e4567-e89b-12d3-a456-426614174000',
      decision: 'APPROVE',
    })
    expect(res.success).toBe(true)
  })

  it('validates successful REJECT decision with reason code', () => {
    const res = ModerateMediaSchema.safeParse({
      mediaId: '123e4567-e89b-12d3-a456-426614174000',
      decision: 'REJECT',
      reasonCode: 'LOW_QUALITY_OR_BLURRY',
      notes: 'Foto com resolução muito baixa.',
    })
    expect(res.success).toBe(true)
  })

  it('validates successful QUARANTINE decision with UNDERAGE_SUSPICION', () => {
    const res = ModerateMediaSchema.safeParse({
      mediaId: '123e4567-e89b-12d3-a456-426614174000',
      decision: 'QUARANTINE',
      reasonCode: 'UNDERAGE_SUSPICION',
      notes: 'Aparência inconsistente com maioridade.',
    })
    expect(res.success).toBe(true)
  })

  it('fails validation on invalid decision string', () => {
    const res = ModerateMediaSchema.safeParse({
      mediaId: '123e4567-e89b-12d3-a456-426614174000',
      decision: 'INVALID_STATUS',
    })
    expect(res.success).toBe(false)
  })

  it('validates profile moderation schema with APPROVE / REJECT / FLAG', () => {
    const validApprove = ModerateProfileSchema.safeParse({
      profileId: '123e4567-e89b-12d3-a456-426614174000',
      decision: 'APPROVE',
    })
    expect(validApprove.success).toBe(true)

    const validFlag = ModerateProfileSchema.safeParse({
      profileId: '123e4567-e89b-12d3-a456-426614174000',
      decision: 'FLAG',
      reasonCode: 'UNDERAGE_OR_POLICY',
      notes: 'Investigação necessária',
    })
    expect(validFlag.success).toBe(true)
  })
})
