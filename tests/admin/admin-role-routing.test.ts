/**
 * Test Suite: Admin Role-Aware Routing & Authorization Guardrails
 *
 * Verifies that:
 * 1. AdminNavbar never exposes a link to advertiser /dashboard.
 * 2. AdminNavbar canonical "Painel Administrativo" brand link points strictly to /admin.
 * 3. requireAdvertiser() blocks ADMIN and redirects to /admin.
 * 4. requireAdvertiser() blocks CLIENT and redirects to /cliente.
 * 5. requireAdvertiser() allows ADVERTISER.
 * 6. resolveAdvertiserDestination() routes ADMIN to /admin and CLIENT to /cliente.
 * 7. loginAction enforces role-authoritative redirect order: ADMIN -> /admin, CLIENT -> /cliente, ADVERTISER -> dashboard/onboarding.
 * 8. Onboarding layout and Dashboard layout enforce requireAdvertiser().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`)
    ;(error as any).digest = `NEXT_REDIRECT;replace;${url};307;;`
    throw error
  }),
}))

import * as authDal from '@/modules/auth/dal'
import { requireAdvertiser, resolveAdvertiserDestination, requireAdmin } from '@/modules/moderation/guards'
import type { AccountUser } from '@/modules/auth/types'

const REPO_ROOT = path.resolve(__dirname, '../..')

describe('Admin Role-Aware Navigation & Navbar', () => {
  it('AdminNavbar does not contain any link to advertiser /dashboard', () => {
    const navbarContent = fs.readFileSync(
      path.join(REPO_ROOT, 'components/admin/admin-navbar.tsx'),
      'utf-8'
    )
    expect(navbarContent).not.toContain('href="/dashboard"')
    expect(navbarContent).not.toContain("href='/dashboard'")
    expect(navbarContent).not.toContain('admin.goDashboard')
  })

  it('AdminNavbar canonical brand link points strictly to /admin', () => {
    const navbarContent = fs.readFileSync(
      path.join(REPO_ROOT, 'components/admin/admin-navbar.tsx'),
      'utf-8'
    )
    expect(navbarContent).toContain('href="/admin"')
    expect(navbarContent).toContain("{t('admin.panel')}")
  })
})

describe('Server-Side Role Guard: requireAdvertiser()', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('redirects ADMIN accounts to /admin', async () => {
    vi.spyOn(authDal, 'requireAccount').mockResolvedValue({
      id: 'admin-1',
      auth_user_id: 'auth-admin-1',
      role: 'ADMIN',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      onboarding_step: 6,
      terms_version: 'v1.0',
      privacy_version: 'v1.0',
    } as AccountUser)

    await expect(requireAdvertiser()).rejects.toThrow('NEXT_REDIRECT: /admin')
  })

  it('redirects CLIENT accounts to /cliente', async () => {
    vi.spyOn(authDal, 'requireAccount').mockResolvedValue({
      id: 'client-1',
      auth_user_id: 'auth-client-1',
      role: 'CLIENT',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      onboarding_step: 0,
      terms_version: 'v1.0',
      privacy_version: 'v1.0',
    } as AccountUser)

    await expect(requireAdvertiser()).rejects.toThrow('NEXT_REDIRECT: /cliente')
  })

  it('allows ADVERTISER accounts through', async () => {
    const mockAdvertiser: AccountUser = {
      id: 'adv-1',
      auth_user_id: 'auth-adv-1',
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      onboarding_step: 6,
      terms_version: 'v1.0',
      privacy_version: 'v1.0',
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.spyOn(authDal, 'requireAccount').mockResolvedValue(mockAdvertiser)

    const account = await requireAdvertiser()
    expect(account.id).toBe('adv-1')
    expect(account.role).toBe('ADVERTISER')
  })
})

describe('Server-Side Role Guard: requireAdmin()', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('allows ADMIN accounts through', async () => {
    const mockAdmin: AccountUser = {
      id: 'admin-1',
      auth_user_id: 'auth-admin-1',
      role: 'ADMIN',
      status: 'ACTIVE',
      onboarding_status: 'NOT_STARTED',
      onboarding_step: 0,
      terms_version: 'v1.0',
      privacy_version: 'v1.0',
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.spyOn(authDal, 'requireAccount').mockResolvedValue(mockAdmin)

    const account = await requireAdmin()
    expect(account.id).toBe('admin-1')
    expect(account.role).toBe('ADMIN')
  })

  it('redirects CLIENT accounts from admin to /cliente', async () => {
    vi.spyOn(authDal, 'requireAccount').mockResolvedValue({
      id: 'client-1',
      auth_user_id: 'auth-client-1',
      role: 'CLIENT',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      onboarding_step: 0,
    } as AccountUser)

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT: /cliente')
  })

  it('redirects ADVERTISER accounts from admin to dashboard or onboarding', async () => {
    vi.spyOn(authDal, 'requireAccount').mockResolvedValue({
      id: 'adv-1',
      auth_user_id: 'auth-adv-1',
      role: 'ADVERTISER',
      status: 'ACTIVE',
      onboarding_status: 'COMPLETED',
      onboarding_step: 6,
    } as AccountUser)

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT: /dashboard')
  })
})

describe('Destination Resolver: resolveAdvertiserDestination()', () => {
  it('safely routes ADMIN role to /admin', async () => {
    const dest = await resolveAdvertiserDestination({
      id: 'admin-1',
      role: 'ADMIN',
      onboarding_status: 'NOT_STARTED',
      onboarding_step: 0,
    } as AccountUser)

    expect(dest).toBe('/admin')
  })

  it('safely routes CLIENT role to /cliente', async () => {
    const dest = await resolveAdvertiserDestination({
      id: 'client-1',
      role: 'CLIENT',
      onboarding_status: 'NOT_STARTED',
      onboarding_step: 0,
    } as AccountUser)

    expect(dest).toBe('/cliente')
  })

  it('routes completed ADVERTISER to /dashboard', async () => {
    const dest = await resolveAdvertiserDestination({
      id: 'adv-1',
      role: 'ADVERTISER',
      onboarding_status: 'COMPLETED',
      onboarding_step: 6,
    } as AccountUser)

    expect(dest).toBe('/dashboard')
  })

  it('routes incomplete ADVERTISER according to progression step', async () => {
    const destStep1 = await resolveAdvertiserDestination({
      id: 'adv-2',
      role: 'ADVERTISER',
      onboarding_status: 'IN_PROGRESS',
      onboarding_step: 1,
    } as AccountUser)
    expect(destStep1).toBe('/onboarding/voce')

    const destStep2 = await resolveAdvertiserDestination({
      id: 'adv-2',
      role: 'ADVERTISER',
      onboarding_status: 'IN_PROGRESS',
      onboarding_step: 2,
    } as AccountUser)
    expect(destStep2).toBe('/onboarding/seu-perfil')

    const destStep3 = await resolveAdvertiserDestination({
      id: 'adv-2',
      role: 'ADVERTISER',
      onboarding_status: 'IN_PROGRESS',
      onboarding_step: 3,
    } as AccountUser)
    expect(destStep3).toBe('/onboarding/onde-atende')
  })
})

describe('Layout & Page Guard Protection', () => {
  it('app/(dashboard)/onboarding/layout.tsx enforces requireAdvertiser()', () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, 'app/(dashboard)/onboarding/layout.tsx'),
      'utf-8'
    )
    expect(content).toContain('requireAdvertiser()')
  })

  it('app/(dashboard)/dashboard/layout.tsx enforces requireAdvertiser()', () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, 'app/(dashboard)/dashboard/layout.tsx'),
      'utf-8'
    )
    expect(content).toContain('requireAdvertiser()')
  })

  it('app/(dashboard)/onboarding/page.tsx checks role before progression', () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, 'app/(dashboard)/onboarding/page.tsx'),
      'utf-8'
    )
    expect(content).toContain("account.role === 'ADMIN'")
    expect(content).toContain("redirect('/admin')")
    expect(content).toContain("account.role === 'CLIENT'")
    expect(content).toContain("redirect('/cliente')")
  })

  it('app/(dashboard)/dashboard/page.tsx checks role before onboarding_status', () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, 'app/(dashboard)/dashboard/page.tsx'),
      'utf-8'
    )
    expect(content).toContain("account.role === 'ADMIN'")
    expect(content).toContain("redirect('/admin')")
    expect(content).toContain("account.role === 'CLIENT'")
    expect(content).toContain("redirect('/cliente')")
  })

  it('app/(dashboard)/cliente/page.tsx redirects ADMIN to /admin', () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, 'app/(dashboard)/cliente/page.tsx'),
      'utf-8'
    )
    expect(content).toContain("account.role === 'ADMIN'")
    expect(content).toContain("redirect('/admin')")
  })

  it('loginAction enforces strict role priority in actions.ts', () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, 'modules/auth/actions.ts'),
      'utf-8'
    )
    const adminIndex = content.indexOf("account?.role === 'ADMIN'")
    const clientIndex = content.indexOf("account?.role === 'CLIENT'")
    const advertiserIndex = content.indexOf("account?.role === 'ADVERTISER'")

    expect(adminIndex).toBeGreaterThan(-1)
    expect(clientIndex).toBeGreaterThan(adminIndex)
    expect(advertiserIndex).toBeGreaterThan(clientIndex)
  })
})
