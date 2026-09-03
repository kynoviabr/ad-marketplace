import { z } from 'zod'

/**
 * Normalizes phone strings to E.164 (+5511999998888).
 * Strips formatting characters, adds +55 if local Brazilian format.
 */
export function normalizePhoneToE164(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return `+${cleaned}`
  }
  if (cleaned.length >= 10 && cleaned.length <= 11) {
    return `+55${cleaned}`
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`
}

export const EyeColorEnum = z.enum(['BLACK', 'BROWN', 'GREEN', 'BLUE', 'HAZEL', 'OTHER'])
export const HairColorEnum = z.enum(['BLACK', 'BRUNETTE', 'BLONDE', 'REDHEAD', 'OTHER'])
export const HairLengthEnum = z.enum(['SHORT', 'MEDIUM', 'LONG', 'VERY_LONG', 'BALD'])
export const BodyTypeEnum = z.enum(['SLIM', 'ATHLETIC', 'CURVY', 'AVERAGE', 'PLUS_SIZE', 'OTHER'])

/**
 * Schema for initial profile draft creation.
 */
export const CreateProfileDraftSchema = z.object({
  stage_name: z
    .string({ message: 'O nome artístico é obrigatório' })
    .trim()
    .min(2, 'O nome artístico deve ter no mínimo 2 caracteres')
    .max(60, 'O nome artístico deve ter no máximo 60 caracteres'),
})

export type CreateProfileDraftInput = z.infer<typeof CreateProfileDraftSchema>

/**
 * First onboarding step: public identity and preferred direct contact.
 * Legal identity and date of birth intentionally remain in the KYC domain.
 */
export const InitialProfessionalProfileSchema = z.object({
  stage_name: CreateProfileDraftSchema.shape.stage_name,
  whatsapp_phone: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z
      .string()
      .transform(normalizePhoneToE164)
      .pipe(z.string().regex(/^\+[1-9]\d{1,14}$/, 'Informe um WhatsApp válido com DDD.'))
      .nullable()
  ),
})

export type InitialProfessionalProfileInput = z.infer<typeof InitialProfessionalProfileSchema>

const optionalIntegerFromForm = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === '' || value === null ? null : Number(value)),
    schema.nullable()
  )

const optionalEnumFromForm = <T extends z.ZodEnum>(schema: T) =>
  z.preprocess((value) => (value === '' ? null : value), schema.nullable())

/**
 * Step 02: canonical public presentation fields. Visibility flags reuse the
 * profile domain's existing privacy model; no legal/KYC data belongs here.
 */
export const PublicPresentationProfileSchema = z.object({
  headline: z
    .string()
    .trim()
    .min(5, 'O título deve ter no mínimo 5 caracteres')
    .max(120, 'O título deve ter no máximo 120 caracteres'),
  bio: z
    .string()
    .trim()
    .min(20, 'A apresentação deve ter no mínimo 20 caracteres')
    .max(2000, 'A apresentação deve ter no máximo 2000 caracteres'),
  public_age: optionalIntegerFromForm(
    z.number().int().min(18, 'A idade pública deve ser de no mínimo 18 anos').max(99, 'Idade máxima permitida é 99 anos')
  ),
  height_cm: optionalIntegerFromForm(
    z.number().int().min(100, 'Altura mínima de 100 cm').max(250, 'Altura máxima de 250 cm')
  ),
  weight_kg: optionalIntegerFromForm(
    z.number().int().min(30, 'Peso mínimo de 30 kg').max(300, 'Peso máximo de 300 kg')
  ),
  eye_color: optionalEnumFromForm(EyeColorEnum),
  hair_color: optionalEnumFromForm(HairColorEnum),
  hair_length: optionalEnumFromForm(HairLengthEnum),
  body_type: optionalEnumFromForm(BodyTypeEnum),
  show_age: z.boolean(),
  show_height: z.boolean(),
  show_weight: z.boolean(),
})

export type PublicPresentationProfileInput = z.infer<typeof PublicPresentationProfileSchema>

/**
 * Schema for editing profile draft data (relaxed validation for partial saves).
 */
export const UpdateProfileSchema = z.object({
  stage_name: z
    .string()
    .trim()
    .min(2, 'O nome artístico deve ter no mínimo 2 caracteres')
    .max(60, 'O nome artístico deve ter no máximo 60 caracteres'),
  headline: z
    .string()
    .trim()
    .max(120, 'O título deve ter no máximo 120 caracteres')
    .optional()
    .nullable(),
  bio: z
    .string()
    .trim()
    .max(2000, 'A biografia deve ter no máximo 2000 caracteres')
    .optional()
    .nullable(),
  public_age: z
    .number()
    .int()
    .min(18, 'A idade pública deve ser de no mínimo 18 anos')
    .max(99, 'Idade máxima permitida é 99 anos')
    .optional()
    .nullable(),
  height_cm: z
    .number()
    .int()
    .min(100, 'Altura mínima de 100 cm')
    .max(250, 'Altura máxima de 250 cm')
    .optional()
    .nullable(),
  weight_kg: z
    .number()
    .int()
    .min(30, 'Peso mínimo de 30 kg')
    .max(300, 'Peso máximo de 300 kg')
    .optional()
    .nullable(),
  bust_cm: z
    .number()
    .int()
    .min(40, 'Busto mínimo de 40 cm')
    .max(200, 'Busto máximo de 200 cm')
    .optional()
    .nullable(),
  waist_cm: z
    .number()
    .int()
    .min(30, 'Cintura mínima de 30 cm')
    .max(200, 'Cintura máxima de 200 cm')
    .optional()
    .nullable(),
  hips_cm: z
    .number()
    .int()
    .min(40, 'Quadril mínimo de 40 cm')
    .max(250, 'Quadril máximo de 250 cm')
    .optional()
    .nullable(),
  eye_color: EyeColorEnum.optional().nullable(),
  hair_color: HairColorEnum.optional().nullable(),
  hair_length: HairLengthEnum.optional().nullable(),
  body_type: BodyTypeEnum.optional().nullable(),
  has_tattoos: z.boolean().default(false),
  has_piercings: z.boolean().default(false),
  languages: z.array(z.string().trim().min(1)).default(['Português']),
  whatsapp_phone: z
    .string()
    .transform((val) => (val ? normalizePhoneToE164(val) : val))
    .pipe(z.string().regex(/^\+[1-9]\d{1,14}$/, 'Formato inválido de WhatsApp (+5511999998888)'))
    .optional()
    .nullable(),
  direct_phone: z
    .string()
    .transform((val) => (val ? normalizePhoneToE164(val) : val))
    .pipe(z.string().regex(/^\+[1-9]\d{1,14}$/, 'Formato de telefone inválido'))
    .optional()
    .nullable(),
  telegram_username: z
    .string()
    .trim()
    .transform((val) => val?.replace(/^@/, '') || val)
    .pipe(z.string().regex(/^[a-zA-Z0-9_]{5,32}$/, 'Username de Telegram inválido (5 a 32 caracteres)'))
    .optional()
    .nullable(),
  show_age: z.boolean().default(false),
  show_height: z.boolean().default(true),
  show_weight: z.boolean().default(false),
  show_measurements: z.boolean().default(false),
  show_whatsapp: z.boolean().default(true),
  show_phone: z.boolean().default(false),
  show_telegram: z.boolean().default(false),
  audience_setting: z.enum(['PUBLIC', 'VIP_ONLY']).default('PUBLIC'),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
