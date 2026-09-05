/**
 * Billing Zod schemas — FASE 07
 */

import { z } from 'zod'

/** Checkout initiation — client sends plan/price IDs only, NEVER amounts. */
export const InitiateCheckoutSchema = z.object({
  planId: z.string().uuid('Plan ID inválido.'),
  priceId: z.string().uuid('Price ID inválido.'),
}).strict()
export type InitiateCheckoutInput = z.infer<typeof InitiateCheckoutSchema>

/** Cancellation request. */
export const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid('Subscription ID inválido.'),
})
export type CancelSubscriptionInput = z.infer<typeof CancelSubscriptionSchema>

/** Admin override grant. */
export const GrantOverrideSchema = z.object({
  accountUserId: z.string().uuid('Account User ID inválido.'),
  reason: z.string().min(3, 'Motivo obrigatório.').max(500),
  expiresAt: z.string().datetime().nullable().optional(),
})
export type GrantOverrideInput = z.infer<typeof GrantOverrideSchema>

/** Admin override revocation. */
export const RevokeOverrideSchema = z.object({
  overrideId: z.string().uuid('Override ID inválido.'),
})
export type RevokeOverrideInput = z.infer<typeof RevokeOverrideSchema>

/** Free-launch subscription creation. */
export const CreateFreeLaunchSchema = z.object({
  accountUserId: z.string().uuid('Account User ID inválido.'),
  periodEnd: z.string().datetime().nullable().optional(),
})
export type CreateFreeLaunchInput = z.infer<typeof CreateFreeLaunchSchema>

/** Admin Founder grant — profile is the authoritative UI context. */
export const GrantFounderBenefitSchema = z.object({
  profileId: z.string().uuid('Profile ID inválido.'),
})
export type GrantFounderBenefitInput = z.infer<typeof GrantFounderBenefitSchema>

export const RevokeFounderBenefitSchema = z.object({
  profileId: z.string().uuid('Profile ID inválido.'),
})
export type RevokeFounderBenefitInput = z.infer<typeof RevokeFounderBenefitSchema>
