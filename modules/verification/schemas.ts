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
const DiditWebhookEnvelopeSchema = z.object({
  webhook_type: z.string().min(1),
  event_id: z.string().min(1),
  timestamp: z.union([z.number().int(), z.string()]).optional(),
  session_id: z.string().min(1),
  status: z.string().optional(),
  vendor_data: z.string().optional(),
  workflow_id: z.string().optional(),
})

const DiditLegacyWebhookEnvelopeSchema = z.object({
  webhook_type: z.string().min(1),
  event_id: z.string().min(1),
  timestamp: z.union([z.number().int(), z.string()]).optional(),
  data: z.object({
    session_id: z.string().min(1),
    status: z.string().optional(),
    vendor_data: z.string().optional(),
    workflow_id: z.string().optional(),
  }),
})

export const DiditWebhookPayloadSchema = z
  .union([DiditWebhookEnvelopeSchema, DiditLegacyWebhookEnvelopeSchema])
  .transform((payload) =>
    'data' in payload
      ? {
          webhook_type: payload.webhook_type,
          event_id: payload.event_id,
          timestamp: payload.timestamp,
          session_id: payload.data.session_id,
          status: payload.data.status,
          vendor_data: payload.data.vendor_data,
          workflow_id: payload.data.workflow_id,
        }
      : payload
  )

export type DiditWebhookPayload = z.infer<typeof DiditWebhookPayloadSchema>
