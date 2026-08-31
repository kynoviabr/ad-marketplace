import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildWhatsAppSupportUrl } from '@/modules/verification/admin-monitor'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const monitorPage = read('app/(admin)/admin/kyc/page.tsx')
const supportPage = read('app/(admin)/admin/professionals/[accountUserId]/page.tsx')
const dal = read('modules/verification/admin-monitor.ts')

describe('Simple KYC support contact flow', () => {
  it('routes Ver cadastro to the exact account support context instead of the moderation queue', () => {
    expect(monitorPage).toContain('href={item.supportHref}')
    expect(monitorPage).toContain("t('admin.openRegistration')")
    expect(monitorPage).not.toContain('Ver perfil')
    expect(dal).toContain('supportHref: `/admin/professionals/${account.id}`')
  })

  it('supports DRAFT profiles and account-level fallback without requiring a profile', () => {
    expect(dal).toContain(".from('account_users')")
    expect(dal).toContain(".from('professional_profiles')")
    expect(dal).toContain("professionalName: profile?.stage_name?.trim() || 'Profissional sem perfil'")
    expect(supportPage).toContain("context.profileStatus ?? t('admin.noProfile')")
  })

  it('normalizes valid Brazilian phones into wa.me URLs', () => {
    expect(buildWhatsAppSupportUrl('(11) 99999-8888')).toBe('https://wa.me/5511999998888')
    expect(buildWhatsAppSupportUrl('+55 11 99999-8888')).toBe('https://wa.me/5511999998888')
  })

  it('fails closed for absent or malformed phone values', () => {
    expect(buildWhatsAppSupportUrl(null)).toBeNull()
    expect(buildWhatsAppSupportUrl('')).toBeNull()
    expect(buildWhatsAppSupportUrl('abc')).toBeNull()
  })

  it('shows WhatsApp only when declared and opens a safe new tab', () => {
    expect(supportPage).toContain("context.whatsappPhone ?? t('admin.whatsappMissing')")
    expect(supportPage).toContain('href={context.whatsappUrl}')
    expect(supportPage).toContain('target="_blank"')
    expect(supportPage).toContain('rel="noopener noreferrer"')
    expect(supportPage).toContain("t('admin.openWhatsapp')")
  })

  it('does not prefill or automatically send a message', () => {
    expect(dal).not.toContain('encodeURIComponent')
    expect(dal).not.toContain('?text=')
    expect(supportPage).not.toContain('sendMessage')
    expect(supportPage).toContain("t('admin.supportDisclaimer')")
  })

  it('requires ADMIN before resolving a guessed account URL', () => {
    expect(supportPage.indexOf('await requireAdmin()')).toBeLessThan(supportPage.indexOf('getKycSupportContext(accountUserId)'))
    expect(read('modules/moderation/guards.ts')).toContain("account.role !== 'ADMIN'")
    expect(read('modules/auth/dal.ts')).toContain('export async function requireAccount')
  })

  it('uses a server-only privileged reader and never exposes it to browser code', () => {
    expect(dal).toContain("import 'server-only'")
    expect(dal).toContain('createAdminClient()')
    expect(supportPage).not.toContain('createAdminClient')
    expect(supportPage).not.toContain("'use client'")
  })

  it('selects only support-safe account, profile and KYC fields', () => {
    expect(dal).toContain("select('stage_name, status, whatsapp_phone')")
    expect(dal).toContain("select('status, updated_at')")
    for (const forbidden of ['provider_session_id', 'cpf_verified', 'verified_country', 'date_of_birth', 'document_number', 'vendor_data', 'raw_payload', 'selfie', 'biometric']) {
      expect(dal).not.toContain(forbidden)
      expect(supportPage).not.toContain(forbidden)
    }
  })

  it('loads the latest verification attempt and preserves operational timestamps', () => {
    expect(dal).toContain(".order('updated_at', { ascending: false }).limit(1).maybeSingle()")
    expect(supportPage).toContain('context.lastUpdatedAt')
    expect(supportPage).toContain('context.waitingMinutes')
  })

  it('causes no database mutation merely by opening the support page', () => {
    const supportReader = dal.slice(dal.indexOf('export async function getKycSupportContext'))
    expect(supportReader).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/)
    expect(supportPage).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/)
  })

  it('provides the required backlink to the KYC monitor', () => {
    expect(supportPage).toContain('href="/admin/kyc"')
    expect(supportPage).toContain("t('admin.backKyc')")
  })
})
