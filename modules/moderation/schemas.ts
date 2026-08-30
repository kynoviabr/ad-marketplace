import { z } from 'zod'

export const ModerateMediaSchema = z.object({
  mediaId: z.string().uuid({ message: 'ID de mídia inválido' }),
  decision: z.enum(['APPROVE', 'REJECT', 'QUARANTINE'], {
    message: 'Decisão de moderação inválida',
  }),
  reasonCode: z
    .enum([
      'UNDERAGE_SUSPICION',
      'EXPLICIT_ILLEGAL_CONTENT',
      'LOW_QUALITY_OR_BLURRY',
      'WATERMARK_OR_PROMOTIONAL',
      'NON_HUMAN_OR_MISMATCH',
      'VIOLENCE_OR_COERCION',
      'OTHER_POLICY_VIOLATION',
    ])
    .optional(),
  notes: z.string().max(1000).optional(),
}).superRefine((value, context) => {
  if (['REJECT', 'QUARANTINE'].includes(value.decision) && !value.reasonCode) {
    context.addIssue({ code: 'custom', path: ['reasonCode'], message: 'Informe o motivo da decisão' })
  }
})

export const ModerateProfileSchema = z.object({
  profileId: z.string().uuid({ message: 'ID de perfil inválido' }),
  decision: z.enum(['APPROVE', 'REJECT', 'FLAG'], {
    message: 'Decisão de perfil inválida',
  }),
  reasonCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
}).superRefine((value, context) => {
  if (['REJECT', 'FLAG'].includes(value.decision) && !value.reasonCode?.trim()) {
    context.addIssue({ code: 'custom', path: ['reasonCode'], message: 'Informe o motivo da decisão' })
  }
})
