import { beforeEach, describe, expect, it, vi } from 'vitest'

const dal = vi.hoisted(() => ({
  getActiveSubscription: vi.fn(),
  getActiveOverride: vi.fn(),
  getPlanEntitlementValue: vi.fn(),
}))
vi.mock('@/modules/billing/dal', () => dal)

import { hasPublicationEntitlement } from '@/modules/billing/entitlements'

const activeSubscription = {
  plan_id: 'plan-1', status: 'ACTIVE', current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
  cancel_at_period_end: false, grace_period_end: null,
}

describe('publication plan entitlement alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dal.getActiveSubscription.mockResolvedValue(activeSubscription)
    dal.getActiveOverride.mockResolvedValue(null)
  })

  it('requires explicit PROFILE_PUBLICATION=true for an eligible subscription', async () => {
    dal.getPlanEntitlementValue.mockResolvedValue(true)
    await expect(hasPublicationEntitlement('account-1')).resolves.toBe(true)
    expect(dal.getPlanEntitlementValue).toHaveBeenCalledWith('plan-1', 'PROFILE_PUBLICATION')
  })

  it('fails closed when the plan omits or disables publication', async () => {
    dal.getPlanEntitlementValue.mockResolvedValue(null)
    await expect(hasPublicationEntitlement('account-1')).resolves.toBe(false)
    dal.getPlanEntitlementValue.mockResolvedValue(false)
    await expect(hasPublicationEntitlement('account-1')).resolves.toBe(false)
  })

  it('preserves a valid administrative override as the alternate authority', async () => {
    dal.getPlanEntitlementValue.mockResolvedValue(false)
    dal.getActiveOverride.mockResolvedValue({ id: 'override-1' })
    await expect(hasPublicationEntitlement('account-1')).resolves.toBe(true)
  })
})
