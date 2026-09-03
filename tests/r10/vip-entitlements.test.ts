import { describe, it, expect, vi } from 'vitest'
import { resolveClientVipEntitlement } from '@/modules/clients/dal'
import { createAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn()
}))

describe('VIP Entitlements', () => {
  it('returns DENIED for null accountId', async () => {
    const res = await resolveClientVipEntitlement(null)
    expect(res).toEqual({ canAccessVipProfiles: false, canAccessVipMedia: false })
  })

  it('returns DENIED when role is not CLIENT', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: '1', role: 'ADVERTISER', status: 'ACTIVE' }, error: null })
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as any)

    const res = await resolveClientVipEntitlement('1')
    expect(res).toEqual({ canAccessVipProfiles: false, canAccessVipMedia: false })
  })

  it('returns DENIED for FREE membership', async () => {
    const mockFrom = vi.fn().mockImplementation((table) => {
      if (table === 'account_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: '1', role: 'CLIENT', status: 'ACTIVE' }, error: null })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { membership_type: 'FREE' }, error: null })
      }
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as any)

    const res = await resolveClientVipEntitlement('1')
    expect(res).toEqual({ canAccessVipProfiles: false, canAccessVipMedia: false })
  })

  it('returns GRANTED for active VIP', async () => {
    const mockFrom = vi.fn().mockImplementation((table) => {
      if (table === 'account_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: '1', role: 'CLIENT', status: 'ACTIVE' }, error: null })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { membership_type: 'VIP', valid_until: '2099-01-01T00:00:00Z' }, error: null })
      }
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as any)

    const res = await resolveClientVipEntitlement('1')
    expect(res).toEqual({ canAccessVipProfiles: true, canAccessVipMedia: true })
  })

  it('returns DENIED for expired VIP', async () => {
    const mockFrom = vi.fn().mockImplementation((table) => {
      if (table === 'account_users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: '1', role: 'CLIENT', status: 'ACTIVE' }, error: null })
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { membership_type: 'VIP', valid_until: '2020-01-01T00:00:00Z' }, error: null })
      }
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as any)

    const res = await resolveClientVipEntitlement('1')
    expect(res).toEqual({ canAccessVipProfiles: false, canAccessVipMedia: false })
  })
})
