import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initiateCheckoutAction } from '@/modules/billing/actions'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const requireAccount = vi.fn()
vi.mock('@/modules/auth/dal', () => ({ requireAccount: () => requireAccount() }))
vi.mock('@/modules/moderation/guards', () => ({ requireAdmin: vi.fn() }))

const adminFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: adminFrom }) }))

const getActiveSubscription = vi.fn()
const getPriceById = vi.fn()
vi.mock('@/modules/billing/dal', () => ({
  getActiveSubscription: (...args: unknown[]) => getActiveSubscription(...args),
  getPriceById: (...args: unknown[]) => getPriceById(...args),
  getSubscriptionWithPlan: vi.fn(),
}))

const createCustomer = vi.fn()
const createCheckoutSession = vi.fn()
const getPaymentProvider = vi.fn(() => ({
  providerId: 'MOCK',
  createCustomer,
  createCheckoutSession,
}))
vi.mock('@/modules/billing/providers/registry', () => ({ getPaymentProvider: () => getPaymentProvider() }))

const getTrustedCheckoutReturnUrls = vi.fn(() => ({
  successUrl: 'https://velvetgirls.club/dashboard/billing?success=true',
  cancelUrl: 'https://velvetgirls.club/dashboard/billing?canceled=true',
}))
vi.mock('@/modules/billing/return-urls', () => ({
  getTrustedCheckoutReturnUrls: () => getTrustedCheckoutReturnUrls(),
}))

const planId = '123e4567-e89b-42d3-a456-426614174000'
const priceId = '987fcdeb-51a2-43f7-9876-543210987654'

describe('R12 P1-4 checkout action return URL enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAccount.mockResolvedValue({ id: 'account-1', auth_user_id: 'auth-1' })
    getActiveSubscription.mockResolvedValue(null)
    getPriceById.mockResolvedValue({
      id: priceId,
      plan_id: planId,
      amount_minor: 4900,
      currency: 'BRL',
      billing_interval: 'MONTH',
      is_active: true,
      valid_from: null,
      valid_until: null,
    })
    adminFrom.mockImplementation((table: string) => {
      if (table === 'subscription_plans') {
        const query: any = {
          select: vi.fn(() => query),
          eq: vi.fn(() => query),
          single: vi.fn().mockResolvedValue({ data: { id: planId, code: 'PRO' }, error: null }),
        }
        return query
      }
      if (table === 'subscriptions') return { insert: vi.fn().mockResolvedValue({ error: null }) }
      return {}
    })
    createCustomer.mockResolvedValue({ providerCustomerId: 'cus_1' })
    createCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://provider.example/checkout/1',
      providerSubscriptionId: 'sub_1',
      expiresAt: '2026-09-05T14:00:00.000Z',
    })
  })

  it('passes only trusted server-generated success and cancel URLs to the provider', async () => {
    const result = await initiateCheckoutAction({ planId, priceId })
    expect(result).toEqual({ success: true, data: { checkoutUrl: 'https://provider.example/checkout/1' } })
    expect(createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      successUrl: 'https://velvetgirls.club/dashboard/billing?success=true',
      cancelUrl: 'https://velvetgirls.club/dashboard/billing?canceled=true',
      priceAmountMinor: 4900,
      currency: 'BRL',
    }))
  })

  it.each([
    { successUrl: 'https://evil.example/return' },
    { cancelUrl: 'https://phishing.example/return' },
    { successUrl: '//evil.example/path' },
    { cancelUrl: 'javascript:alert(1)' },
  ])('rejects injected return input and never calls the provider: %o', async (injected) => {
    const result = await initiateCheckoutAction({ planId, priceId, ...injected } as never)
    expect(result.success).toBe(false)
    expect(getPaymentProvider).not.toHaveBeenCalled()
    expect(createCustomer).not.toHaveBeenCalled()
    expect(createCheckoutSession).not.toHaveBeenCalled()
    expect(adminFrom).not.toHaveBeenCalled()
  })

  it('preserves the authenticated-account boundary before checkout work', async () => {
    requireAccount.mockRejectedValueOnce(new Error('UNAUTHORIZED'))
    const result = await initiateCheckoutAction({ planId, priceId })
    expect(result.success).toBe(false)
    expect(getPaymentProvider).not.toHaveBeenCalled()
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })
})
