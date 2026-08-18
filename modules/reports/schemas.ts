import { z } from 'zod'

export const SubmitReportSchema = z
  .object({
    profileId: z.string().uuid().optional().nullable(),
    mediaId: z.string().uuid().optional().nullable(),
    reasonCategory: z.enum(
      [
        'UNDERAGE_SUSPICION',
        'NON_CONSENSUAL',
        'IMPERSONATION_OR_STOLEN',
        'VIOLENCE_OR_EXPLOITATION',
        'SCAM_OR_FRAUD',
        'MISLEADING_LOCATION',
        'OTHER',
      ],
      { message: 'Selecione uma categoria de denúncia válida' }
    ),
    description: z
      .string()
      .max(1000, { message: 'Descrição não pode exceder 1000 caracteres' })
      .optional(),
  })
  .refine(
    (data) =>
      (Boolean(data.profileId) && !data.mediaId) || (!data.profileId && Boolean(data.mediaId)),
    {
      message: 'A denúncia deve apontar exatamente para um perfil ou uma foto',
      path: ['profileId'],
    }
  )

export const ResolveReportSchema = z.object({
  reportId: z.string().uuid({ message: 'ID de denúncia inválido' }),
  action: z.enum(['NONE', 'QUARANTINE_MEDIA', 'FLAG_PROFILE', 'DISMISS'], {
    message: 'Ação de resolução inválida',
  }),
  resolutionNotes: z.string().max(1000).optional(),
})
