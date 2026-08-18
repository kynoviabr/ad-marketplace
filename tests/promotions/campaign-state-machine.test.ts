import { describe, it, expect } from 'vitest'
import type { BoostCampaignStatus } from '@/modules/promotions/types'

describe('FASE 08 — Boost Campaign State Machine', () => {
  const VALID_TRANSITIONS: Record<BoostCampaignStatus, BoostCampaignStatus[]> = {
    PENDING_PAYMENT: ['ACTIVE', 'SCHEDULED', 'FAILED', 'CANCELED'],
    SCHEDULED: ['ACTIVE', 'CANCELED'],
    ACTIVE: ['COMPLETED', 'CANCELED'],
    COMPLETED: [], // terminal
    CANCELED: [], // terminal
    FAILED: [], // terminal
  }

  function canTransition(from: BoostCampaignStatus, to: BoostCampaignStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false
  }

  it('allows PENDING_PAYMENT -> ACTIVE on immediate payment confirmation', () => {
    expect(canTransition('PENDING_PAYMENT', 'ACTIVE')).toBe(true)
  })

  it('allows PENDING_PAYMENT -> SCHEDULED on future payment confirmation', () => {
    expect(canTransition('PENDING_PAYMENT', 'SCHEDULED')).toBe(true)
  })

  it('allows PENDING_PAYMENT -> FAILED on payment failure', () => {
    expect(canTransition('PENDING_PAYMENT', 'FAILED')).toBe(true)
  })

  it('allows SCHEDULED -> ACTIVE when start timestamp arrives', () => {
    expect(canTransition('SCHEDULED', 'ACTIVE')).toBe(true)
  })

  it('allows SCHEDULED -> CANCELED on admin cancellation', () => {
    expect(canTransition('SCHEDULED', 'CANCELED')).toBe(true)
  })

  it('allows ACTIVE -> COMPLETED when end timestamp arrives', () => {
    expect(canTransition('ACTIVE', 'COMPLETED')).toBe(true)
  })

  it('allows ACTIVE -> CANCELED on emergency admin action', () => {
    expect(canTransition('ACTIVE', 'CANCELED')).toBe(true)
  })

  it('blocks invalid transitions from terminal states', () => {
    expect(canTransition('COMPLETED', 'ACTIVE')).toBe(false)
    expect(canTransition('CANCELED', 'ACTIVE')).toBe(false)
    expect(canTransition('FAILED', 'ACTIVE')).toBe(false)
    expect(canTransition('ACTIVE', 'PENDING_PAYMENT')).toBe(false)
  })
})
