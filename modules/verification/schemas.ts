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
const DiditSessionWebhookTypeSchema = z.enum(['status.updated', 'data.updated'])
const DiditTimestampSchema = z.union([z.number().int(), z.string()])
const DiditNullableStringSchema = z.string().nullable().optional()
const DiditProviderObjectSchema = z.record(z.string(), z.unknown()).nullable().optional()

const DiditWebhookEnvelopeSchema = z.object({
  webhook_type: DiditSessionWebhookTypeSchema,
  event_id: z.string().min(1).optional(),
  timestamp: z.union([z.number().int(), z.string()]).optional(),
  created_at: DiditTimestampSchema.optional(),
  session_id: z.string().min(1),
  status: DiditNullableStringSchema,
  vendor_data: DiditNullableStringSchema,
  workflow_id: DiditNullableStringSchema,
  metadata: DiditProviderObjectSchema,
  decision: DiditProviderObjectSchema,
}).superRefine((payload, context) => {
  if (!payload.event_id && payload.created_at === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['created_at'],
      message: 'created_at is required when event_id is absent',
    })
  }
})

const DiditLegacyWebhookEnvelopeSchema = z.object({
  webhook_type: DiditSessionWebhookTypeSchema,
  event_id: z.string().min(1),
  timestamp: DiditTimestampSchema.optional(),
  data: z.object({
    session_id: z.string().min(1),
    status: DiditNullableStringSchema,
    vendor_data: DiditNullableStringSchema,
    workflow_id: DiditNullableStringSchema,
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
          created_at: undefined,
          session_id: payload.data.session_id,
          status: payload.data.status ?? undefined,
          vendor_data: payload.data.vendor_data ?? undefined,
          workflow_id: payload.data.workflow_id ?? undefined,
        }
      : {
          webhook_type: payload.webhook_type,
          event_id: payload.event_id,
          timestamp: payload.timestamp,
          created_at: payload.created_at,
          session_id: payload.session_id,
          status: payload.status ?? undefined,
          vendor_data: payload.vendor_data ?? undefined,
          workflow_id: payload.workflow_id ?? undefined,
        }
  )

export type DiditWebhookPayload = z.infer<typeof DiditWebhookPayloadSchema>
