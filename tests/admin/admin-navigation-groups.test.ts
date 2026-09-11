/**
 * Test Suite: Admin Navigation Functional Groups Architecture
 *
 * Verifies that:
 * 1. Admin navigation is strictly partitioned into three functional areas:
 *    - OPERAÇÃO (Operation)
 *    - COMERCIAL (Commercial)
 *    - TECNOLOGIA (Technology)
 * 2. Every canonical admin route is accounted for under the exact designated group.
 * 3. Active resolution accurately flags active groups and active child items without cross-contamination.
 * 4. Painel Administrativo brand link points strictly to /admin.
 * 5. No advertiser /dashboard links exist.
 * 6. Full i18n support exists in pt-BR and en for all group titles and item labels.
 * 7. Accessibility and keyboard navigation contracts are adhered to.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ADMIN_NAV_GROUPS } from '@/components/admin/admin-navbar'
import { ptBRMessages, enMessages } from '@/lib/i18n/catalog'

const REPO_ROOT = path.resolve(__dirname, '../..')

describe('Admin Navigation Groups Structure', () => {
  it('exposes exactly three functional menu groups', () => {
    expect(ADMIN_NAV_GROUPS).toHaveLength(3)
    expect(ADMIN_NAV_GROUPS.map((g) => g.id)).toEqual(['operation', 'commercial', 'technology'])
  })

  it('configures OPERAÇÃO group with the designated 8 operational items', () => {
    const opGroup = ADMIN_NAV_GROUPS.find((g) => g.id === 'operation')
    expect(opGroup).toBeDefined()
    expect(opGroup?.labelKey).toBe('admin.groupOperation')

    const expectedHrefs = [
      '/admin',
      '/admin/profiles/review',
      '/admin/media/review',
      '/admin/moderation',
      '/admin/profiles',
      '/admin/kyc',
      '/admin/reports',
      '/admin/privacy',
    ]
    expect(opGroup?.items.map((i) => i.href)).toEqual(expectedHrefs)

    // Check i18n keys
    expect(opGroup?.items.map((i) => i.labelKey)).toEqual([
      'admin.overview',
      'admin.profileQueue',
      'admin.mediaReview',
      'admin.photoModeration',
      'admin.profileModeration',
      'admin.kyc',
      'admin.reports',
      'admin.privacyLgpd',
    ])
  })

  it('configures COMERCIAL group with the designated 3 commercial items', () => {
    const comGroup = ADMIN_NAV_GROUPS.find((g) => g.id === 'commercial')
    expect(comGroup).toBeDefined()
    expect(comGroup?.labelKey).toBe('admin.groupCommercial')

    const expectedHrefs = [
      '/admin/billing',
      '/admin/boosts',
      '/admin/analytics',
    ]
    expect(comGroup?.items.map((i) => i.href)).toEqual(expectedHrefs)
    expect(comGroup?.items.map((i) => i.labelKey)).toEqual([
      'admin.subscriptions',
      'admin.boosts',
      'admin.analytics',
    ])
  })

  it('configures TECNOLOGIA group with the designated system health item', () => {
    const techGroup = ADMIN_NAV_GROUPS.find((g) => g.id === 'technology')
    expect(techGroup).toBeDefined()
    expect(techGroup?.labelKey).toBe('admin.groupTechnology')

    expect(techGroup?.items.map((i) => i.href)).toEqual(['/admin/health'])
    expect(techGroup?.items.map((i) => i.labelKey)).toEqual(['admin.systemHealth'])
  })
})

describe('Active Group & Item Path Resolution', () => {
  const [opGroup, comGroup, techGroup] = ADMIN_NAV_GROUPS

  function findActive(pathname: string) {
    const activeGroup = ADMIN_NAV_GROUPS.find((g) => g.items.some((i) => i.isActive(pathname)))
    const activeItem = activeGroup?.items.find((i) => i.isActive(pathname))
    return { group: activeGroup?.id, item: activeItem?.href }
  }

  it('correctly resolves /admin to OPERAÇÃO -> /admin (Visão geral)', () => {
    const res = findActive('/admin')
    expect(res.group).toBe('operation')
    expect(res.item).toBe('/admin')
  })

  it('correctly resolves /admin/profiles/review without falsely activating /admin/profiles', () => {
    const res = findActive('/admin/profiles/review')
    expect(res.group).toBe('operation')
    expect(res.item).toBe('/admin/profiles/review')
  })

  it('correctly resolves /admin/profiles without activating review', () => {
    const res = findActive('/admin/profiles')
    expect(res.group).toBe('operation')
    expect(res.item).toBe('/admin/profiles')
  })

  it('correctly resolves /admin/media/review to OPERAÇÃO', () => {
    const res = findActive('/admin/media/review')
    expect(res.group).toBe('operation')
    expect(res.item).toBe('/admin/media/review')
  })

  it('correctly resolves /admin/moderation to OPERAÇÃO', () => {
    const res = findActive('/admin/moderation')
    expect(res.group).toBe('operation')
    expect(res.item).toBe('/admin/moderation')
  })

  it('correctly resolves /admin/kyc and nested kyc professionals routes to OPERAÇÃO', () => {
    const resKyc = findActive('/admin/kyc')
    expect(resKyc.group).toBe('operation')
    expect(resKyc.item).toBe('/admin/kyc')

    const resProf = findActive('/admin/professionals/123-abc')
    expect(resProf.group).toBe('operation')
    expect(resProf.item).toBe('/admin/kyc')
  })

  it('correctly resolves /admin/reports to OPERAÇÃO', () => {
    const res = findActive('/admin/reports')
    expect(res.group).toBe('operation')
    expect(res.item).toBe('/admin/reports')
  })

  it('correctly resolves /admin/privacy to OPERAÇÃO', () => {
    const res = findActive('/admin/privacy')
    expect(res.group).toBe('operation')
    expect(res.item).toBe('/admin/privacy')
  })

  it('correctly resolves /admin/billing and clients to COMERCIAL', () => {
    const resBilling = findActive('/admin/billing')
    expect(resBilling.group).toBe('commercial')
    expect(resBilling.item).toBe('/admin/billing')

    const resClient = findActive('/admin/clients')
    expect(resClient.group).toBe('commercial')
    expect(resClient.item).toBe('/admin/billing')
  })

  it('correctly resolves /admin/boosts to COMERCIAL', () => {
    const res = findActive('/admin/boosts')
    expect(res.group).toBe('commercial')
    expect(res.item).toBe('/admin/boosts')
  })

  it('correctly resolves /admin/analytics to COMERCIAL', () => {
    const res = findActive('/admin/analytics')
    expect(res.group).toBe('commercial')
    expect(res.item).toBe('/admin/analytics')
  })

  it('correctly resolves /admin/health to TECNOLOGIA', () => {
    const res = findActive('/admin/health')
    expect(res.group).toBe('technology')
    expect(res.item).toBe('/admin/health')
  })
})

describe('i18n Translation Completeness for Admin Navigation', () => {
  const allKeys = [
    'admin.groupOperation',
    'admin.groupCommercial',
    'admin.groupTechnology',
    'admin.overview',
    'admin.profileQueue',
    'admin.mediaReview',
    'admin.photoModeration',
    'admin.profileModeration',
    'admin.kyc',
    'admin.reports',
    'admin.privacyLgpd',
    'admin.subscriptions',
    'admin.boosts',
    'admin.analytics',
    'admin.systemHealth',
    'admin.panel',
  ] as const

  it('contains valid Portuguese translations for all nav keys', () => {
    for (const key of allKeys) {
      expect(ptBRMessages[key], `Missing pt-BR for ${key}`).toBeTruthy()
    }
    expect(ptBRMessages['admin.groupOperation']).toBe('Operação')
    expect(ptBRMessages['admin.groupCommercial']).toBe('Comercial')
    expect(ptBRMessages['admin.groupTechnology']).toBe('Tecnologia')
    expect(ptBRMessages['admin.overview']).toBe('Visão geral')
    expect(ptBRMessages['admin.privacyLgpd']).toBe('Privacidade / LGPD')
  })

  it('contains valid English translations for all nav keys', () => {
    for (const key of allKeys) {
      expect(enMessages[key], `Missing en for ${key}`).toBeTruthy()
    }
    expect(enMessages['admin.groupOperation']).toBe('Operations')
    expect(enMessages['admin.groupCommercial']).toBe('Commercial')
    expect(enMessages['admin.groupTechnology']).toBe('Technology')
    expect(enMessages['admin.overview']).toBe('Overview')
    expect(enMessages['admin.privacyLgpd']).toBe('Privacy / LGPD')
  })
})

describe('AdminNavbar Component Contract & Security Checks', () => {
  const navbarSource = fs.readFileSync(
    path.join(REPO_ROOT, 'components/admin/admin-navbar.tsx'),
    'utf-8'
  )

  it('preserves the Painel Administrativo brand link pointing to /admin', () => {
    expect(navbarSource).toContain('href="/admin"')
    expect(navbarSource).toContain("{t('admin.panel')}")
  })

  it('never exposes links to advertiser /dashboard', () => {
    expect(navbarSource).not.toContain('href="/dashboard"')
    expect(navbarSource).not.toContain("href='/dashboard'")
    expect(navbarSource).not.toContain('admin.goDashboard')
  })

  it('includes proper accessibility and ARIA attributes for dropdown popovers', () => {
    expect(navbarSource).toContain('aria-haspopup="true"')
    expect(navbarSource).toContain('aria-expanded={isOpen}')
    expect(navbarSource).toContain('role="menu"')
    expect(navbarSource).toContain('role="menuitem"')
  })

  it('includes responsive mobile drawer and hamburger trigger', () => {
    expect(navbarSource).toContain('admin-mobile-toggle')
    expect(navbarSource).toContain('admin-mobile-menu')
  })
})
