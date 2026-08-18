import { describe, it, expect } from 'vitest'
import {
  RequestUploadSchema,
  ConfirmUploadSchema,
  ReorderMediaSchema,
  SetPrimaryMediaSchema,
  DeleteMediaSchema,
} from '@/modules/media/schemas'

describe('FASE 05 — Media Management Schemas Validation', () => {
  it('validates RequestUploadSchema with supported formats and size limits', () => {
    expect(
      RequestUploadSchema.safeParse({
        mime_type: 'image/jpeg',
        file_size_bytes: 5 * 1024 * 1024,
      }).success
    ).toBe(true)

    expect(
      RequestUploadSchema.safeParse({
        mime_type: 'image/webp',
        file_size_bytes: 1024,
      }).success
    ).toBe(true)

    // Rejects SVG (security policy for profile photography)
    expect(
      RequestUploadSchema.safeParse({
        mime_type: 'image/svg+xml',
        file_size_bytes: 1024,
      }).success
    ).toBe(false)

    // Rejects oversized files (>15MB)
    expect(
      RequestUploadSchema.safeParse({
        mime_type: 'image/jpeg',
        file_size_bytes: 20 * 1024 * 1024,
      }).success
    ).toBe(false)
  })

  it('validates ConfirmUploadSchema requiring a valid UUID', () => {
    const validUuid = crypto.randomUUID()
    expect(ConfirmUploadSchema.safeParse({ media_id: validUuid, width: 1200, height: 1600 }).success).toBe(true)
    expect(ConfirmUploadSchema.safeParse({ media_id: 'invalid-id' }).success).toBe(false)
  })

  it('validates ReorderMediaSchema requiring at least one valid UUID', () => {
    const uuid1 = crypto.randomUUID()
    const uuid2 = crypto.randomUUID()

    expect(ReorderMediaSchema.safeParse({ media_ids: [uuid1, uuid2] }).success).toBe(true)
    expect(ReorderMediaSchema.safeParse({ media_ids: [] }).success).toBe(false)
  })

  it('validates SetPrimaryMediaSchema and DeleteMediaSchema', () => {
    const uuid = crypto.randomUUID()
    expect(SetPrimaryMediaSchema.safeParse({ media_id: uuid }).success).toBe(true)
    expect(DeleteMediaSchema.safeParse({ media_id: uuid }).success).toBe(true)
    expect(SetPrimaryMediaSchema.safeParse({ media_id: '123' }).success).toBe(false)
  })
})
