import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildKycOperationsItems,
  getKycAttention,
  KYC_CRITICAL_MINUTES,
  KYC_WARNING_MINUTES,
  matchesKycFilter,
  summarizeKycOperations,
} from '@/modules/verification/admin-monitor'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const now = new Date('2026-08-30T12:00:00.000Z')
const accounts = [
  { id: 'a1', onboarding_status: 'NOT_STARTED' as const, onboarding_step: 1, created_at: '2026-08-30T10:00:00.000Z' },
  { id: 'a2', onboarding_status: 'IN_PROGRESS' as const, onboarding_step: 4, created_at: '2026-08-30T09:00:00.000Z' },
  { id: 'a3', onboarding_status: 'COMPLETED' as const, onboarding_step: 6, created_at: '2026-08-29T09:00:00.000Z' },
  { id: 'a4', onboarding_status: 'IN_PROGRESS' as const, onboarding_step: 4, created_at: '2026-08-30T08:00:00.000Z' },
]
const profiles = [
  { id: 'p2', account_user_id: 'a2', stage_name: 'Luna', status: 'DRAFT' as const },
  { id: 'p3', account_user_id: 'a3', stage_name: 'Helena', status: 'ACTIVE' as const },
]
const verifications = [
  { account_user_id: 'a2', status: 'PENDING' as const, created_at: '2026-08-30T10:00:00.000Z', updated_at: '2026-08-30T11:10:00.000Z' },
  { account_user_id: 'a2', status: 'REJECTED' as const, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T11:00:00.000Z' },
  { account_user_id: 'a3', status: 'VERIFIED' as const, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-30T11:30:00.000Z' },
  { account_user_id: 'a4', status: 'REJECTED' as const, created_at: '2026-08-30T10:00:00.000Z', updated_at: '2026-08-30T11:55:00.000Z' },
]

describe('Admin KYC operations monitor', () => {
  const items = buildKycOperationsItems(accounts, profiles, verifications, now)

  it('derives NOT_STARTED when no verification exists', () => {
    expect(items.find((item) => item.accountUserId === 'a1')?.verificationStatus).toBe('NOT_STARTED')
  })

  it('uses the latest verification attempt when multiple records exist', () => {
    expect(items.find((item) => item.accountUserId === 'a2')?.verificationStatus).toBe('PENDING')
  })

  it('maps pending, verified and rejected states without mutation', () => {
    expect(items.find((item) => item.accountUserId === 'a2')?.statusLabel).toBe('AGUARDANDO INÍCIO')
    expect(items.find((item) => item.accountUserId === 'a3')?.statusLabel).toBe('VERIFICADA')
    expect(items.find((item) => item.accountUserId === 'a4')?.statusLabel).toBe('REJEITADA')
  })

  it('calculates unresolved waiting duration from the last canonical update', () => {
    expect(items.find((item) => item.accountUserId === 'a2')?.waitingMinutes).toBe(50)
    expect(items.find((item) => item.accountUserId === 'a3')?.waitingMinutes).toBe(0)
  })

  it('uses centralized 30/60 minute support thresholds', () => {
    expect(KYC_WARNING_MINUTES).toBe(30)
    expect(KYC_CRITICAL_MINUTES).toBe(60)
    expect(getKycAttention('PENDING', 29)).toBe('NONE')
    expect(getKycAttention('PENDING', 30)).toBe('WARNING')
    expect(getKycAttention('IN_REVIEW', 60)).toBe('CRITICAL')
    expect(getKycAttention('VERIFIED', 500)).toBe('NONE')
  })

  it('supports all operational filter groups', () => {
    expect(items.filter((item) => matchesKycFilter(item.verificationStatus, 'NOT_STARTED'))).toHaveLength(1)
    expect(items.filter((item) => matchesKycFilter(item.verificationStatus, 'PENDING'))).toHaveLength(1)
    expect(items.filter((item) => matchesKycFilter(item.verificationStatus, 'VERIFIED'))).toHaveLength(1)
    expect(items.filter((item) => matchesKycFilter(item.verificationStatus, 'PROBLEM'))).toHaveLength(1)
  })

  it('keeps counters aligned with the complete queue', () => {
    expect(summarizeKycOperations(items)).toEqual({ notStarted: 1, pending: 1, inReview: 0, verified: 1, problem: 1, unresolved: 3 })
  })

  it('links every account to its exact support context, including accounts without profiles', () => {
    expect(items.find((item) => item.accountUserId === 'a2')?.supportHref).toBe('/admin/professionals/a2')
    expect(items.find((item) => item.accountUserId === 'a1')?.supportHref).toBe('/admin/professionals/a1')
  })

  it('requires ADMIN before loading monitor data', () => {
    const page = read('app/(admin)/admin/kyc/page.tsx')
    expect(page.indexOf('await requireAdmin()')).toBeLessThan(page.indexOf('getKycOperationsMonitor()'))
    expect(read('app/(admin)/layout.tsx')).toContain('await requireAdmin()')
  })

  it('relies on the existing advertiser and anonymous denial boundary', () => {
    const guard = read('modules/moderation/guards.ts')
    expect(guard).toContain("account.role !== 'ADMIN'")
    expect(guard).toContain("redirect('/dashboard')")
    expect(guard.indexOf('requireAccount()')).toBeLessThan(guard.indexOf("account.role !== 'ADMIN'"))
  })

  it('selects only minimized operational verification columns', () => {
    const dal = read('modules/verification/admin-monitor.ts')
    expect(dal).toContain("select('account_user_id, status, created_at, updated_at')")
    for (const forbidden of ['provider_session_id', 'cpf_verified', 'verified_country', 'date_of_birth', 'document_number', 'raw_payload', 'vendor_data', 'selfie', 'biometric']) {
      expect(dal).not.toContain(forbidden)
    }
  })

  it('performs three parallel bulk reads and no per-row query', () => {
    const dal = read('modules/verification/admin-monitor.ts')
    const monitorReader = dal.slice(dal.indexOf('export async function getKycOperationsMonitor'))
    expect(monitorReader).toContain('await Promise.all([')
    expect(monitorReader.match(/admin\.from\(/g)).toHaveLength(3)
  })

  it('has no write operation in the monitor module or page', () => {
    const source = read('modules/verification/admin-monitor.ts') + read('app/(admin)/admin/kyc/page.tsx')
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/)
  })

  it('adds the monitor to the existing admin navigation', () => {
    expect(read('components/admin/admin-navbar.tsx')).toContain("{ href: '/admin/kyc', label: t('admin.kyc') }")
  })
})
