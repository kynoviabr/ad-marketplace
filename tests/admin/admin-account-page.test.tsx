/**
 * Test Suite: Admin Account Page & Account Management Actions
 *
 * Verifies:
 * 1. /admin/account requires ADMIN role via requireAdmin().
 * 2. AdminAccountPage resolves and renders authenticated display name, read-only email, and ADMIN role badge.
 * 3. Zero UUIDs or sensitive credentials are ever exposed in page markup.
 * 4. updateAdminDisplayNameAction validates inputs, updates user metadata, and enforces current-user session binding.
 * 5. updateAdminPasswordAction enforces minimum length, confirmation match, and updates password securely.
 * 6. Canonical LanguageSelector is rendered inside the Preferências section.
 * 7. Deduplication invariant: AdminAccountPage does NOT import or render AdminNavbar.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { I18nProvider } from '@/components/i18n/i18n-provider'
import AdminAccountPage from '@/app/(admin)/admin/account/page'
import { AdminAccountForm } from '@/components/admin/account/admin-account-form'
import {
  updateAdminDisplayNameAction,
  updateAdminPasswordAction,
} from '@/modules/admin/actions'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/account',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
  redirect: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const mockRequireAdmin = vi.fn()
vi.mock('@/modules/moderation/guards', () => ({
  requireAdmin: () => mockRequireAdmin(),
}))

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: () => mockGetUser(),
      updateUser: (params: any) => mockUpdateUser(params),
    },
  }),
}))

const mockAdminUpdateUserById = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: (...args: any[]) => mockAdminUpdateUserById(...args),
      },
    },
  }),
}))


describe('AdminAccountPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
            name: 'Kynovia Velvet',
          },
        },
      },
      error: null,
    })
  })

  it('enforces requireAdmin() before rendering', async () => {
    const pageComponent = await AdminAccountPage()
    expect(mockRequireAdmin).toHaveBeenCalledTimes(1)
    expect(pageComponent).toBeTruthy()
  })

  it('renders eyebrow CONTA, H1 Minha conta, and intro text', async () => {
    const pageComponent = await AdminAccountPage()
    const html = renderToStaticMarkup(
      <I18nProvider locale="pt-BR">{pageComponent}</I18nProvider>
    )

    expect(html).toContain('CONTA')
    expect(html).toContain('Minha conta')
    expect(html).toContain('Gerencie as informações básicas da sua conta e suas preferências de acesso.')
  })

  it('never exposes auth UUID or account UUID in the page markup', async () => {
    const pageComponent = await AdminAccountPage()
    const html = renderToStaticMarkup(
      <I18nProvider locale="pt-BR">{pageComponent}</I18nProvider>
    )

    expect(html).not.toContain('acc-uuid-1234')
    expect(html).not.toContain('auth-uuid-5678')
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    expect(html).not.toMatch(uuidPattern)
  })

  it('does NOT import or render AdminNavbar (guaranteed by layout deduplication)', () => {
    const pageSource = fs.readFileSync(
      path.resolve(__dirname, '../../app/(admin)/admin/account/page.tsx'),
      'utf-8'
    )
    expect(pageSource).not.toContain('AdminNavbar')
    expect(pageSource).not.toContain('admin-navbar')
  })
})

describe('AdminAccountForm Client Component Rendering', () => {
  it('renders all three restrained sections: Perfil da conta, Segurança, and Preferências', () => {
    const html = renderToStaticMarkup(
      <I18nProvider locale="pt-BR">
        <AdminAccountForm initialName="Admin QA" email="admin-qa@velvetgirls.club" role="ADMIN" />
      </I18nProvider>
    )

    expect(html).toContain('Perfil da conta')
    expect(html).toContain('Segurança')
    expect(html).toContain('Preferências')
  })

  it('renders display name, read-only email, and ADMIN role badge', () => {
    const html = renderToStaticMarkup(
      <I18nProvider locale="pt-BR">
        <AdminAccountForm initialName="Admin QA" email="admin-qa@velvetgirls.club" role="ADMIN" />
      </I18nProvider>
    )

    expect(html).toContain('value="Admin QA"')
    expect(html).toContain('value="admin-qa@velvetgirls.club"')
    expect(html).toContain('Este é o e-mail usado para entrar na sua conta.')
    expect(html).toContain('ADMIN')
    expect(html).toContain('Acesso administrativo irrestrito ao sistema.')
  })

  it('renders password change form with appropriate attributes', () => {
    const html = renderToStaticMarkup(
      <I18nProvider locale="pt-BR">
        <AdminAccountForm initialName="Admin QA" email="admin-qa@velvetgirls.club" role="ADMIN" />
      </I18nProvider>
    )

    expect(html).toContain('Nova senha')
    expect(html).toContain('Confirmar nova senha')
    expect(html).toContain('type="password"')
    expect(html).toContain('autoComplete="new-password"')
    expect(html).toContain('Alterar senha')
  })

  it('renders the canonical LanguageSelector in Preferências section', () => {
    const html = renderToStaticMarkup(
      <I18nProvider locale="pt-BR">
        <AdminAccountForm initialName="Admin QA" email="admin-qa@velvetgirls.club" role="ADMIN" />
      </I18nProvider>
    )

    expect(html).toContain('velvet-language-selector')
    expect(html).toContain('velvet-language-popover')
  })
})

describe('updateAdminDisplayNameAction Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      id: 'acc-uuid-1234',
      auth_user_id: 'auth-uuid-5678',
      role: 'ADMIN',
      status: 'ACTIVE',
    })
  })

  it('enforces requireAdmin() guard', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'))
    const result = await updateAdminDisplayNameAction({ name: 'Valid Name' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INTERNAL_ERROR')
  })

  it('rejects empty or whitespace-only names', async () => {
    const result = await updateAdminDisplayNameAction({ name: '   ' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('EMPTY_NAME')
    expect(result.message).toBe('O nome de exibição não pode estar vazio.')
  })

  it('rejects names exceeding 60 characters', async () => {
    const longName = 'A'.repeat(61)
    const result = await updateAdminDisplayNameAction({ name: longName })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NAME_TOO_LONG')
  })

  it('successfully updates name in Supabase user_metadata', async () => {
    mockAdminUpdateUserById.mockResolvedValueOnce({ data: { user: {} }, error: null })

    const result = await updateAdminDisplayNameAction({ name: '  Kynovia  ' })
    expect(result.success).toBe(true)
    expect(result.name).toBe('Kynovia')
    expect(result.message).toBe('Nome atualizado.')
    expect(mockAdminUpdateUserById).toHaveBeenCalledWith('auth-uuid-5678', {
      user_metadata: { name: 'Kynovia' },
    })
  })

  it('handles FormData input safely', async () => {
    mockAdminUpdateUserById.mockResolvedValueOnce({ data: { user: {} }, error: null })

    const formData = new FormData()
    formData.append('name', 'Operator QA')

    const result = await updateAdminDisplayNameAction(formData)
    expect(result.success).toBe(true)
    expect(result.name).toBe('Operator QA')
  })
})

describe('updateAdminPasswordAction Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      id: 'acc-uuid-1234',
      auth_user_id: 'auth-uuid-5678',
      role: 'ADMIN',
      status: 'ACTIVE',
    })
  })

  it('enforces requireAdmin() guard', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('Forbidden'))
    const result = await updateAdminPasswordAction({
      password: 'newPassword123!',
      confirmPassword: 'newPassword123!',
    })
    expect(result.success).toBe(false)
  })

  it('rejects passwords shorter than 8 characters', async () => {
    const result = await updateAdminPasswordAction({
      password: 'short',
      confirmPassword: 'short',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('PASSWORD_TOO_SHORT')
    expect(result.message).toBe('A nova senha deve ter no mínimo 8 caracteres.')
  })

  it('rejects mismatched confirmation passwords', async () => {
    const result = await updateAdminPasswordAction({
      password: 'password12345',
      confirmPassword: 'different12345',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('PASSWORD_MISMATCH')
    expect(result.message).toBe('As senhas não coincidem.')
  })

  it('successfully updates password via adminClient.auth.admin.updateUserById', async () => {
    mockAdminUpdateUserById.mockResolvedValueOnce({ data: { user: {} }, error: null })

    const result = await updateAdminPasswordAction({
      password: 'SecureAdminPassword123!',
      confirmPassword: 'SecureAdminPassword123!',
    })
    expect(result.success).toBe(true)
    expect(result.message).toBe('Senha alterada com sucesso.')
    expect(mockAdminUpdateUserById).toHaveBeenCalledWith('auth-uuid-5678', {
      password: 'SecureAdminPassword123!',
    })
  })
})

