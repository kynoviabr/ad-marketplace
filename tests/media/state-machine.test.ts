import { describe, it, expect } from 'vitest'
import type { MediaStatus } from '@/modules/media/types'

describe('FASE 05 — Media State Machine Invariants', () => {
  const validTransitions: Record<MediaStatus, MediaStatus[]> = {
    UPLOADING: ['PROCESSING', 'PROCESSING_FAILED', 'DELETED'],
    PROCESSING: ['PENDING_MODERATION', 'PROCESSING_FAILED', 'DELETED'],
    PENDING_MODERATION: ['APPROVED', 'REJECTED', 'QUARANTINED', 'DELETED'],
    APPROVED: ['QUARANTINED', 'DELETED', 'PENDING_MODERATION'],
    PROCESSING_FAILED: ['DELETED'],
    REJECTED: ['DELETED'],
    QUARANTINED: ['APPROVED', 'REJECTED', 'DELETED'],
    DELETED: [],
  }

  function canTransition(from: MediaStatus, to: MediaStatus): boolean {
    return validTransitions[from]?.includes(to) ?? false
  }

  it('allows normal onboarding flow: UPLOADING -> PROCESSING -> PENDING_MODERATION', () => {
    expect(canTransition('UPLOADING', 'PROCESSING')).toBe(true)
    expect(canTransition('PROCESSING', 'PENDING_MODERATION')).toBe(true)
  })

  it('prohibits direct jump from UPLOADING directly to APPROVED without moderation', () => {
    expect(canTransition('UPLOADING', 'APPROVED')).toBe(false)
    expect(canTransition('PROCESSING', 'APPROVED')).toBe(false)
  })

  it('allows transition from PENDING_MODERATION to APPROVED only post-moderation', () => {
    expect(canTransition('PENDING_MODERATION', 'APPROVED')).toBe(true)
    expect(canTransition('PENDING_MODERATION', 'REJECTED')).toBe(true)
  })

  it('terminal DELETED state cannot transition to any active state', () => {
    expect(canTransition('DELETED', 'APPROVED')).toBe(false)
    expect(canTransition('DELETED', 'PENDING_MODERATION')).toBe(false)
  })
})
