import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from '@/modules/moderation/guards'
import * as authDal from '@/modules/auth/dal'
import { redirect } from 'next/navigation'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('FASE 06 — Admin Authorization Boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows access when user has role = ADMIN and status = ACTIVE', async () => {
    vi.spyOn(authDal, 'requireAccount').mockResolvedValue({
      id: 'acc-admin-1',
      auth_user_id: 'auth-admin-1',
      role: 'ADMIN',
      status: 'ACTIVE',
      terms_version: '1.0',
      terms_accepted_at: new Date().toISOString(),
      privacy_version: '1.0',
      privacy_accepted_at: new Date().toISOString(),
      onboarding_step: 5,
      onboarding_status: 'COMPLETED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const account = await requireAdmin()
    expect(account).toBeDefined()
    expect(account.role).toBe('ADMIN')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects to /dashboard when user has role = ADVERTISER', async () => {
    vi.spyOn(authDal, 'requireAccount').mockResolvedValue({
      id: 'acc-user-1',
      auth_user_id: 'auth-user-1',
      role: 'ADVERTISER',
      status: 'ACTIVE',
      terms_version: '1.0',
      terms_accepted_at: new Date().toISOString(),
      privacy_version: '1.0',
      privacy_accepted_at: new Date().toISOString(),
      onboarding_step: 5,
      onboarding_status: 'COMPLETED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await requireAdmin()
    expect(redirect).toHaveBeenCalledWith('/dashboard')
  })
})
