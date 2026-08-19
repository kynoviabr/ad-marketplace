/**
 * Analytics Validation Schemas — FASE 09
 *
 * Strict Zod validation for client-ingested analytics events.
 * Strips unknown fields, enforces string bounds, and validates timestamps.
 */

import { z } from 'zod'

const OCCURRED_AT_TOLERANCE_MS = 5 * 60 * 1000 // ±5 minutes

export function isOccurredAtWithinTolerance(occurredAtStr: string, referenceTimeMs = Date.now()): boolean {
  const ts = new Date(occurredAtStr).getTime()
  if (isNaN(ts)) return false
  return Math.abs(referenceTimeMs - ts) <= OCCURRED_AT_TOLERANCE_MS
}

export const ProfileImpressionPayloadSchema = z.object({
  event_type: z.literal('PROFILE_IMPRESSION'),
  profile_slug: z.string().min(1, 'profile_slug is required').max(120),
  city_slug: z.string().min(1, 'city_slug is required').max(120),
  location_slug: z.string().max(120).optional().nullable(),
  placement_type: z.enum(['ORGANIC', 'SPONSORED']),
  result_page: z.number().int().min(1).max(500),
  result_position: z.number().int().min(0).max(100),
  occurred_at: z.string().datetime(),
  visitor_session_id: z.string().uuid('visitor_session_id must be a valid UUID'),
  referrer_type: z.enum(['SEARCH', 'DIRECT', 'OTHER']).optional().nullable(),
})

export const ContactWhatsAppClickedPayloadSchema = z.object({
  event_type: z.literal('CONTACT_WHATSAPP_CLICKED'),
  profile_slug: z.string().min(1, 'profile_slug is required').max(120),
  city_slug: z.string().min(1, 'city_slug is required').max(120),
  location_slug: z.string().max(120).optional().nullable(),
  placement_type: z.enum(['ORGANIC', 'SPONSORED']),
  result_page: z.number().int().min(1).max(500).optional().nullable(),
  result_position: z.number().int().min(0).max(100).optional().nullable(),
  occurred_at: z.string().datetime(),
  visitor_session_id: z.string().uuid('visitor_session_id must be a valid UUID'),
  referrer_type: z.enum(['SEARCH', 'DIRECT', 'OTHER']).optional().nullable(),
})

export const ContactPhoneClickedPayloadSchema = z.object({
  event_type: z.literal('CONTACT_PHONE_CLICKED'),
  profile_slug: z.string().min(1, 'profile_slug is required').max(120),
  city_slug: z.string().min(1, 'city_slug is required').max(120),
  location_slug: z.string().max(120).optional().nullable(),
  placement_type: z.enum(['ORGANIC', 'SPONSORED']),
  occurred_at: z.string().datetime(),
  visitor_session_id: z.string().uuid('visitor_session_id must be a valid UUID'),
})

export const ContactTelegramClickedPayloadSchema = z.object({
  event_type: z.literal('CONTACT_TELEGRAM_CLICKED'),
  profile_slug: z.string().min(1, 'profile_slug is required').max(120),
  city_slug: z.string().min(1, 'city_slug is required').max(120),
  location_slug: z.string().max(120).optional().nullable(),
  placement_type: z.enum(['ORGANIC', 'SPONSORED']),
  occurred_at: z.string().datetime(),
  visitor_session_id: z.string().uuid('visitor_session_id must be a valid UUID'),
})

export const ProfileViewedPayloadSchema = z.object({
  event_type: z.literal('PROFILE_VIEWED'),
  profile_slug: z.string().min(1, 'profile_slug is required').max(120),
  city_slug: z.string().min(1, 'city_slug is required').max(120),
  location_slug: z.string().max(120).optional().nullable(),
  placement_type: z.enum(['ORGANIC', 'SPONSORED']).optional().nullable(),
  occurred_at: z.string().datetime(),
  visitor_session_id: z.string().uuid('visitor_session_id must be a valid UUID'),
  referrer_type: z.enum(['SEARCH', 'DIRECT', 'OTHER']).optional().nullable(),
})

export const IngestionEventPayloadSchema = z.discriminatedUnion('event_type', [
  ProfileImpressionPayloadSchema,
  ContactWhatsAppClickedPayloadSchema,
  ContactPhoneClickedPayloadSchema,
  ContactTelegramClickedPayloadSchema,
  ProfileViewedPayloadSchema,
])

export type IngestionEventPayload = z.infer<typeof IngestionEventPayloadSchema>
