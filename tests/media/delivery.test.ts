import { describe, it, expect } from 'vitest'
import { getApprovedMediaDeliveryUrl } from '@/modules/media/delivery'

describe('FASE 06 — Media Delivery Abstraction', () => {
  it('returns null when media is null or undefined', async () => {
    expect(await getApprovedMediaDeliveryUrl(null)).toBeNull()
    expect(await getApprovedMediaDeliveryUrl(undefined)).toBeNull()
  })

  it('returns null when media status is PENDING_MODERATION', async () => {
    const url = await getApprovedMediaDeliveryUrl({
      status: 'PENDING_MODERATION',
      storage_path: 'profiles/123/photo.jpg',
    })
    expect(url).toBeNull()
  })

  it('returns null when media status is REJECTED', async () => {
    const url = await getApprovedMediaDeliveryUrl({
      status: 'REJECTED',
      storage_path: 'profiles/123/photo.jpg',
    })
    expect(url).toBeNull()
  })

  it('returns null when media status is QUARANTINED', async () => {
    const url = await getApprovedMediaDeliveryUrl({
      status: 'QUARANTINED',
      storage_path: 'profiles/123/photo.jpg',
    })
    expect(url).toBeNull()
  })

  it('returns null when media status is UPLOADING or PROCESSING', async () => {
    expect(
      await getApprovedMediaDeliveryUrl({
        status: 'UPLOADING',
        storage_path: 'profiles/123/photo.jpg',
      })
    ).toBeNull()

    expect(
      await getApprovedMediaDeliveryUrl({
        status: 'PROCESSING',
        storage_path: 'profiles/123/photo.jpg',
      })
    ).toBeNull()
  })

  it('returns null for failed and deleted media', async () => {
    for (const status of ['PROCESSING_FAILED', 'DELETED'] as const) {
      expect(await getApprovedMediaDeliveryUrl({ status, storage_path: 'profiles/123/photo.jpg' })).toBeNull()
    }
  })
})
