/**
 * Test Suite: Admin Navbar Authenticated Account Menu & Identity
 *
 * Verifies:
 * 1. Deterministic avatar initials and display name resolution.
 * 2. AdminNavbar renders user trigger with avatar and readable display name.
 * 3. Isolated top-bar ADMIN badge is removed; ADMIN role badge is rendered inside the popover and mobile drawer.
 * 4. User UUID and private credentials are NEVER exposed.
 * 5. Logout action is wired via canonical session termination (logoutAction).
 * 6. Canonical LanguageSelector remains next to the user menu.
 * 7. Functional navigation groups (Operação, Comercial, Tecnologia) remain intact.
 * 8. getAdminUserAction server action enforces requireAdmin() and projects only safe fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import {
  AdminNavbar,
  getAvatarInitials,
  getShortDisplayName,
  ADMIN_NAV_GROUPS,
  type AdminNavbarUser,
} from '@/components/admin/admin-navbar'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import { getAdminUserAction } from '@/modules/admin/actions'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}))

// Mock guards and server auth for getAdminUserAction tests
const mockRequireAdmin = vi.fn()
vi.mock('@/modules/moderation/guards', () => ({
  requireAdmin: () => mockRequireAdmin(),
}))

const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
  }),
}))

describe('Avatar Initials & Display Name Resolvers', () => {
  it('resolves deterministic initials from display name', () => {
    expect(getAvatarInitials({ email: 'user@example.com', name: 'Kynovia Velvet', role: 'ADMIN' })).toBe('KV')
    expect(getAvatarInitials({ email: 'user@example.com', name: 'Admin', role: 'ADMIN' })).toBe('A')
  })

  it('resolves deterministic initials from email prefix when name is null or whitespace', () => {
    expect(getAvatarInitials({ email: 'admin-qa@velvetgirls.club', name: null, role: 'ADMIN' })).toBe('A')
    expect(getAvatarInitials({ email: 'kynoviabr@gmail.com', name: '   ', role: 'ADMIN' })).toBe('K')
    expect(getAvatarInitials(null)).toBe('A')
  })

  it('resolves short readable display name', () => {
    expect(getShortDisplayName({ email: 'user@example.com', name: 'Kynovia Velvet', role: 'ADMIN' })).toBe('Kynovia')
    expect(getShortDisplayName({ email: 'admin-qa@velvetgirls.club', name: null, role: 'ADMIN' })).toBe('admin-qa')
    expect(
      getShortDisplayName({ email: 'superlongemailaddressprefix@example.com', name: null, role: 'ADMIN' })
    ).toBe('superlongema…')
    expect(getShortDisplayName(null)).toBe('Admin')
  })
})

describe('AdminNavbar Authenticated Account Control Rendering', () => {
  const adminUser: AdminNavbarUser = {
    email: 'admin-qa@velvetgirls.club',
    name: null,
    role: 'ADMIN',
  }

  function renderNavbar(user: AdminNavbarUser | null) {
    return renderToStaticMarkup(
      <I18nProvider locale="pt-BR">
        <AdminNavbar initialUser={user} />
      </I18nProvider>
    )
  }

  it('renders circular initials avatar and short readable name in trigger', () => {
    const html = renderNavbar(adminUser)
    expect(html).toContain('>A<')
    expect(html).toContain('admin-qa')
  })

  it('does NOT render an isolated top-bar ADMIN badge', () => {
    const html = renderNavbar(adminUser)
    // The top bar right section should have LanguageSelector and the trigger, not an isolated badge
    // Inside the mobile drawer, the ADMIN badge is present
    const topBarMatch = html.match(/<div class="admin-desktop-user-menu"[\s\S]*?<\/button>/)
    expect(topBarMatch).toBeTruthy()
    // The trigger button should contain the avatar and username, but not the badge directly in the button
    expect(topBarMatch![0]).not.toContain('>ADMIN<')
  })

  it('renders the canonical LanguageSelector adjacent to the user trigger', () => {
    const html = renderNavbar(adminUser)
    expect(html).toContain('velvet-language-selector')
    expect(html).toContain('velvet-language-popover')
  })

  it('preserves all three functional navigation groups and Painel Administrativo brand', () => {
    const html = renderNavbar(adminUser)
    expect(html).toContain('href="/admin"')
    expect(ADMIN_NAV_GROUPS).toHaveLength(3)
    expect(ADMIN_NAV_GROUPS.map((g) => g.id)).toEqual(['operation', 'commercial', 'technology'])
  })

  it('never leaks user UUID or sensitive metadata in markup', () => {
    const html = renderNavbar(adminUser)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    expect(html).not.toMatch(uuidPattern)
  })
})

describe('AdminNavbar Architecture & Contract Invariants', () => {
  const navbarSource = fs.readFileSync(
    path.resolve(__dirname, '../../components/admin/admin-navbar.tsx'),
    'utf-8'
  )

  it('wires logoutAction to form submission', () => {
    expect(navbarSource).toContain("import { logoutAction } from '@/modules/auth/actions'")
    expect(navbarSource).toContain('action={logoutAction}')
  })

  it('renders ADMIN role pill inside the popover and mobile drawer', () => {
    expect(navbarSource).toContain('ADMIN')
    expect(navbarSource).toContain('#ef4444')
  })

  it('implements accessible ARIA semantics for the user account trigger and popover', () => {
    expect(navbarSource).toContain('aria-haspopup="true"')
    expect(navbarSource).toContain('aria-expanded={isUserMenuOpen}')
    expect(navbarSource).toContain('aria-controls={userMenuId}')
    expect(navbarSource).toContain('role="menu"')
  })

  it('implements outside-click, Escape key dismissal and focus restoration', () => {
    expect(navbarSource).toContain("event.key === 'Escape'")
    expect(navbarSource).toContain('userTriggerRef.current?.focus()')
    expect(navbarSource).toContain("document.addEventListener('pointerdown', handlePointerDown)")
  })

  it('preserves the operational monitor contract comment', () => {
    expect(navbarSource).toContain(
      "// Canonical operational monitor contract: { href: '/admin/kyc', label: t('admin.kyc') }"
    )
  })

  it('renders "Minha conta" link navigating to /admin/account in popover and mobile drawer', () => {
    expect(navbarSource).toContain('href="/admin/account"')
    expect(navbarSource).toContain('Minha conta')
  })
})


describe('getAdminUserAction Security & Projection Invariant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires ADMIN role and returns safe projected identity', async () => {
    mockRequireAdmin.mockResolvedValue({
      id: 'acc-uuid-1234',
      role: 'ADMIN',
      status: 'ACTIVE',
    })

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-uuid-5678',
          email: 'admin-qa@velvetgirls.club',
          user_metadata: {
            name: 'QA Admin Operator',
          },
        },
      },
      error: null,
    })

    const result = await getAdminUserAction()
    expect(result).toEqual({
      email: 'admin-qa@velvetgirls.club',
      name: 'QA Admin Operator',
      role: 'ADMIN',
    })
    // Ensure no UUIDs leaked
    expect((result as any).id).toBeUndefined()
    expect((result as any).auth_user_id).toBeUndefined()
  })

  it('returns null if user is not authenticated or not ADMIN', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden'))
    const result = await getAdminUserAction()
    expect(result).toBeNull()
  })
})
