import { describe, it, expect, vi } from 'vitest'
import { recordSearchPerformedEvent, type RecordSearchPerformedParams } from '@/modules/analytics/write'

describe('FASE 09 — Search Analytics Execution Contract', () => {
  it('handles zero-result search events correctly (HD-6)', async () => {
    const params: RecordSearchPerformedParams = {
      cityId: '11111111-1111-1111-1111-111111111111',
      locationId: null,
      resultPage: 1,
      totalProfiles: 0,
      sponsoredCount: 0,
      hasFilters: true,
    }

    // Should complete without throwing
    await expect(recordSearchPerformedEvent(params)).resolves.not.toThrow()
  })

  it('handles search events with filters correctly (HD-7)', async () => {
    const params: RecordSearchPerformedParams = {
      cityId: '11111111-1111-1111-1111-111111111111',
      locationId: '22222222-2222-2222-2222-222222222222',
      resultPage: 2,
      totalProfiles: 25,
      sponsoredCount: 4,
      hasFilters: true,
    }

    await expect(recordSearchPerformedEvent(params)).resolves.not.toThrow()
  })

  it('ensures analytics recording failure does not propagate exceptions to search caller', async () => {
    // If the database write fails, recordSearchPerformedEvent logs and catches the error
    const brokenParams: RecordSearchPerformedParams = {
      cityId: 'invalid-city-uuid',
      locationId: null,
      resultPage: 1,
      totalProfiles: 10,
      sponsoredCount: 0,
      hasFilters: false,
    }

    // Invariant: never throws unhandled exception into request flow
    await expect(recordSearchPerformedEvent(brokenParams)).resolves.not.toThrow()
  })
})
