import { z } from 'zod'

/** Configurable quota for MVP */
export const MAX_PHOTOS_PER_PROFILE = 10

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB

export const RequestUploadSchema = z.object({
  mime_type: z.enum(ALLOWED_MIME_TYPES, {
    message: 'Formato inválido. Apenas JPEG, PNG e WebP são permitidos.',
  }),
  file_size_bytes: z
    .number()
    .int()
    .min(1, 'Arquivo vazio')
    .max(MAX_FILE_SIZE_BYTES, 'O arquivo deve ter no máximo 15 MB'),
})

export const ConfirmUploadSchema = z.object({
  media_id: z.string().uuid({ message: 'ID de mídia inválido' }),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

export const ReorderMediaSchema = z.object({
  media_ids: z
    .array(z.string().uuid({ message: 'ID de mídia inválido' }))
    .min(1, 'Pelo menos uma foto deve ser fornecida'),
})

export const SetPrimaryMediaSchema = z.object({
  media_id: z.string().uuid({ message: 'ID de mídia inválido' }),
})

export const DeleteMediaSchema = z.object({
  media_id: z.string().uuid({ message: 'ID de mídia inválido' }),
})

export type RequestUploadInput = z.infer<typeof RequestUploadSchema>
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadSchema>
export type ReorderMediaInput = z.infer<typeof ReorderMediaSchema>
export type SetPrimaryMediaInput = z.infer<typeof SetPrimaryMediaSchema>
export type DeleteMediaInput = z.infer<typeof DeleteMediaSchema>
