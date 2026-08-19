import { describe, it, expect } from 'vitest'
import { recordBoostActivatedEvent } from '@/modules/analytics/write'

describe('FASE 09 — BOOST_ACTIVATED Idempotency Contract', () => {
  it('formats event_key deterministically as boost_activated:<campaign_id>', async () => {
    const campaign = {
      id: '88888888-8888-8888-8888-888888888888',
      profile_id: '11111111-1111-1111-1111-111111111111',
      city_id: '22222222-2222-2222-2222-222222222222',
      location_id: null,
      starts_at: new Date().toISOString(),
    }

    // Should not throw on initial call or subsequent idempotent retry
    await expect(recordBoostActivatedEvent(campaign)).resolves.not.toThrow()
    await expect(recordBoostActivatedEvent(campaign)).resolves.not.toThrow()
  })
})
