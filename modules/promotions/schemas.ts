/**
 * Promotions input validation schemas — FASE 08
 *
 * Zod schemas for initiating boost checkout and admin operations.
 * Enforces that client NEVER determines price, amount, currency, or duration.
 */

import { z } from 'zod'

export const InitiateBoostCheckoutSchema = z.object({
  profileId: z.string().uuid('ID do perfil inválido'),
  boostProductId: z.string().uuid('ID do produto inválido'),
  boostPriceId: z.string().uuid('ID do preço inválido'),
  locationId: z.string().uuid('ID da localização inválido').optional(),
  scheduledStartsAt: z.string().datetime('Data de início programada inválida').optional(),
})

export type InitiateBoostCheckoutInput = z.infer<typeof InitiateBoostCheckoutSchema>

export const CancelBoostCampaignSchema = z.object({
  campaignId: z.string().uuid('ID da campanha inválido'),
  reason: z
    .string()
    .min(3, 'Motivo deve ter pelo menos 3 caracteres')
    .max(500, 'Motivo deve ter no máximo 500 caracteres'),
})

export type CancelBoostCampaignInput = z.infer<typeof CancelBoostCampaignSchema>
