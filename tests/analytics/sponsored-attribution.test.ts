import { describe, it, expect } from 'vitest'
import { IngestionEventPayloadSchema } from '@/modules/analytics/schemas'

describe('FASE 09 — Sponsored Attribution & Campaign Gate Tests', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000'
  const nowIso = new Date().toISOString()

  it('rejects client payloads attempting to submit boost_campaign_id', () => {
    const maliciousPayload = {
      event_type: 'PROFILE_IMPRESSION',
      profile_slug: 'juliana-moema',
      city_slug: 'sao-paulo',
      placement_type: 'SPONSORED',
      result_page: 1,
      result_position: 0,
      occurred_at: nowIso,
      visitor_session_id: validUuid,
      boost_campaign_id: '99999999-9999-9999-9999-999999999999', // INJECTED
    }

    // IngestionEventPayloadSchema strips or rejects unknown fields; safeParse must not include boost_campaign_id
    const parsed = IngestionEventPayloadSchema.safeParse(maliciousPayload)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      // @ts-expect-error - boost_campaign_id must not exist on parsed data
      expect(parsed.data.boost_campaign_id).toBeUndefined()
    }
  })

  it('rejects client payloads attempting to submit amount_minor or pricing fields', () => {
    const maliciousPayload = {
      event_type: 'CONTACT_WHATSAPP_CLICKED',
      profile_slug: 'juliana-moema',
      city_slug: 'sao-paulo',
      placement_type: 'SPONSORED',
      occurred_at: nowIso,
      visitor_session_id: validUuid,
      amount_minor: 2990, // INJECTED
    }

    const parsed = IngestionEventPayloadSchema.safeParse(maliciousPayload)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      // @ts-expect-error - amount_minor must not exist on parsed data
      expect(parsed.data.amount_minor).toBeUndefined()
    }
  })
})
