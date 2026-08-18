import { z } from 'zod'

/**
 * Schema for starting a verification flow.
 */
export const StartVerificationSchema = z.object({
  callbackUrl: z.string().url().optional(),
})

export type StartVerificationInput = z.infer<typeof StartVerificationSchema>

/**
 * Schema for validating incoming Didit webhook payloads.
 */
export const DiditWebhookPayloadSchema = z.object({
  webhook_type: z.string().min(1),
  event_id: z.string().min(1),
  timestamp: z.string().optional(),
  data: z.object({
    session_id: z.string().min(1),
    status: z.string().optional(),
    vendor_data: z.string().optional(),
    workflow_id: z.string().optional(),
  }),
})

export type DiditWebhookPayload = z.infer<typeof DiditWebhookPayloadSchema>
