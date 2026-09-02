import { z } from 'zod'
import { OFFERING_OPTIONS, type OfferingCode, type OfferingStatusMap } from './types'

export const OfferingStatusSchema = z.enum(['OFFERED', 'NOT_OFFERED', 'UNSPECIFIED'])

export function parseOfferingFormData(formData: FormData): OfferingStatusMap {
  return Object.fromEntries(OFFERING_OPTIONS.map(({ code }) => [code, OfferingStatusSchema.parse(formData.get(`offering_${code}`) ?? 'UNSPECIFIED')])) as Record<OfferingCode, z.infer<typeof OfferingStatusSchema>>
}
