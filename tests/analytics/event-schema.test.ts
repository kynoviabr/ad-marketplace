import { describe, it, expect } from 'vitest'
import {
  IngestionEventPayloadSchema,
  ProfileImpressionPayloadSchema,
  ContactWhatsAppClickedPayloadSchema,
  isOccurredAtWithinTolerance,
} from '@/modules/analytics/schemas'

describe('FASE 09 — Analytics Event Schemas & Ingestion Validation', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'
  const nowIso = new Date().toISOString()

  it('validates a correct PROFILE_IMPRESSION event payload', () => {
    const payload = {
      event_type: 'PROFILE_IMPRESSION',
      profile_slug: 'juliana-moema',
      city_slug: 'sao-paulo',
      location_slug: 'moema',
      placement_type: 'ORGANIC',
      result_page: 1,
      result_position: 0,
      occurred_at: nowIso,
      visitor_session_id: validUuid,
    }

    const res = IngestionEventPayloadSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('validates a correct CONTACT_WHATSAPP_CLICKED event payload', () => {
    const payload = {
      event_type: 'CONTACT_WHATSAPP_CLICKED',
      profile_slug: 'juliana-moema',
      city_slug: 'sao-paulo',
      placement_type: 'SPONSORED',
      result_page: 1,
      result_position: 2,
      occurred_at: nowIso,
      visitor_session_id: validUuid,
    }

    const res = IngestionEventPayloadSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('rejects invalid or unknown event_type', () => {
    const payload = {
      event_type: 'UNAUTHORIZED_CUSTOM_EVENT',
      profile_slug: 'juliana-moema',
      city_slug: 'sao-paulo',
      occurred_at: nowIso,
      visitor_session_id: validUuid,
    }

    const res = IngestionEventPayloadSchema.safeParse(payload)
    expect(res.success).toBe(false)
  })

  it('rejects invalid UUID for visitor_session_id', () => {
    const payload = {
      event_type: 'PROFILE_IMPRESSION',
      profile_slug: 'juliana-moema',
      city_slug: 'sao-paulo',
      placement_type: 'ORGANIC',
      result_page: 1,
      result_position: 0,
      occurred_at: nowIso,
      visitor_session_id: 'not-a-valid-uuid-12345',
    }

    const res = IngestionEventPayloadSchema.safeParse(payload)
    expect(res.success).toBe(false)
  })

  it('rejects missing profile_slug', () => {
    const payload = {
      event_type: 'PROFILE_IMPRESSION',
      profile_slug: '',
      city_slug: 'sao-paulo',
      placement_type: 'ORGANIC',
      result_page: 1,
      result_position: 0,
      occurred_at: nowIso,
      visitor_session_id: validUuid,
    }

    const res = IngestionEventPayloadSchema.safeParse(payload)
    expect(res.success).toBe(false)
  })

  it('rejects invalid placement_type', () => {
    const payload = {
      event_type: 'PROFILE_IMPRESSION',
      profile_slug: 'juliana-moema',
      city_slug: 'sao-paulo',
      placement_type: 'VIP_FEATURED', // Invalid placement type
      result_page: 1,
      result_position: 0,
      occurred_at: nowIso,
      visitor_session_id: validUuid,
    }

    const res = IngestionEventPayloadSchema.safeParse(payload)
    expect(res.success).toBe(false)
  })

  it('enforces occurred_at tolerance of ±5 minutes', () => {
    const now = Date.now()
    const fourMinPast = new Date(now - 4 * 60 * 1000).toISOString()
    const fourMinFuture = new Date(now + 4 * 60 * 1000).toISOString()
    const tenMinPast = new Date(now - 10 * 60 * 1000).toISOString()
    const tenMinFuture = new Date(now + 10 * 60 * 1000).toISOString()

    expect(isOccurredAtWithinTolerance(fourMinPast, now)).toBe(true)
    expect(isOccurredAtWithinTolerance(fourMinFuture, now)).toBe(true)
    expect(isOccurredAtWithinTolerance(tenMinPast, now)).toBe(false)
    expect(isOccurredAtWithinTolerance(tenMinFuture, now)).toBe(false)
    expect(isOccurredAtWithinTolerance('invalid-date-string', now)).toBe(false)
  })
})
