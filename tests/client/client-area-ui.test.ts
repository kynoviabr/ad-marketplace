import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Client Area Visual Polish & Structural Invariants', () => {
  const filePath = join(__dirname, '../../app/(dashboard)/cliente/page.tsx')
  const content = readFileSync(filePath, 'utf-8')

  it('does not nest a <main> landmark inside the protected dashboard layout', () => {
    expect(content).not.toContain('<main>')
    expect(content).not.toContain('</main>')
  })

  it('includes compact header with velvet. wordmark and client area title', () => {
    expect(content).toContain('velvet-client-header')
    expect(content).toContain('velvet-wordmark')
    expect(content).toContain("t('client.areaTitle')")
    expect(content).toContain('LanguageSelector')
    expect(content).toContain('logoutAction')
  })

  it('includes welcome section with velvet. editorial title', () => {
    expect(content).toContain('velvet-client-hero')
    expect(content).toContain("t('client.welcomeTitle')")
    expect(content).toContain("t('client.welcomeSubtitle')")
  })

  it('includes primary action "Explorar perfis" pointing to marketplace route', () => {
    expect(content).toContain('velvet-client-primary-action')
    expect(content).toContain('href="/"')
    expect(content).toContain("t('client.exploreProfiles')")
  })

  it('includes secondary action pointing to Help Center', () => {
    expect(content).toContain('velvet-client-secondary-action')
    expect(content).toContain("t('client.helpCenter')")
  })

  it('shows membership plan status and access summary with active badge', () => {
    expect(content).toContain('velvet-client-status-badge')
    expect(content).toContain("t('client.activeStatus')")
    expect(content).toContain("t('client.planFreeName')")
    expect(content).toContain("t('client.planVipName')")
    expect(content).toContain("t('client.includedTitle')")
    expect(content).toContain("t('client.featurePublicProfiles')")
  })

  it('presents VIP as upcoming option without fake pricing or availability', () => {
    expect(content).toContain('velvet-client-badge-upcoming')
    expect(content).toContain("t('client.vipUpcomingTag')")
    expect(content).toContain("t('client.vipCardTitle')")
    expect(content).toContain("t('client.vipButtonDisabled')")
    expect(content).toContain('disabled')
    expect(content).toContain('aria-disabled="true"')
  })

  it('preserves existing security and role checks', () => {
    expect(content).toContain('if (!account) redirect(\'/login\')')
    expect(content).toContain('if (account.role !== \'CLIENT\') redirect(\'/dashboard\')')
    expect(content).toContain('resolveClientVipEntitlement(account.id)')
  })
})
