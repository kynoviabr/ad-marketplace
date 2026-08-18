import { z } from 'zod'

/**
 * Schema for saving advertiser service locations.
 * Enforces:
 * - At least 1 location and at most 5 locations per profile
 * - primary_location_id must be in location_ids
 */
export const SaveProfileLocationsSchema = z
  .object({
    location_ids: z
      .array(z.string().uuid({ message: 'ID de localização inválido' }))
      .min(1, 'Selecione pelo menos um bairro de atendimento')
      .max(5, 'Você pode selecionar no máximo 5 bairros de atendimento'),
    primary_location_id: z.string().uuid({ message: 'ID da localização principal inválido' }),
  })
  .refine((data) => data.location_ids.includes(data.primary_location_id), {
    message: 'A localização principal deve estar entre os bairros selecionados',
    path: ['primary_location_id'],
  })

export type SaveProfileLocationsInput = z.infer<typeof SaveProfileLocationsSchema>
