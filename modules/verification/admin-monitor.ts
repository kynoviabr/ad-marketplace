import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OnboardingStatus } from '@/modules/auth/types'
import type { ProfileStatus } from '@/modules/profiles/types'
import type { VerificationStatus } from './types'
import { normalizePhoneToE164 } from '@/modules/profiles/schemas'

export const KYC_WARNING_MINUTES = 30
export const KYC_CRITICAL_MINUTES = 60

export type KycAdminFilter = 'ALL' | 'NOT_STARTED' | 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'PROBLEM'
export type KycAttention = 'NONE' | 'WARNING' | 'CRITICAL'

export interface KycOperationsItem {
  accountUserId: string
  professionalName: string
  profileId: string | null
  profileStatus: ProfileStatus | null
  onboardingStatus: OnboardingStatus
  onboardingStep: number
  verificationStatus: VerificationStatus
  statusLabel: string
  lastUpdatedAt: string
  waitingMinutes: number
  attention: KycAttention
  supportHref: string
}

export interface KycSupportContext {
  accountUserId: string
  professionalName: string
  profileStatus: ProfileStatus | null
  onboardingStatus: OnboardingStatus
  onboardingStep: number
  verificationStatus: VerificationStatus
  statusLabel: string
  lastUpdatedAt: string
  waitingMinutes: number
  whatsappPhone: string | null
  whatsappUrl: string | null
}

export interface KycOperationsSummary {
  notStarted: number
  pending: number
  inReview: number
  verified: number
  problem: number
  unresolved: number
}

interface MonitorAccount { id: string; onboarding_status: OnboardingStatus; onboarding_step: number; created_at: string }
interface MonitorProfile { id: string; account_user_id: string; stage_name: string; status: ProfileStatus }
interface MonitorVerification { account_user_id: string; status: VerificationStatus; created_at: string; updated_at: string }

const STATUS_LABELS: Record<VerificationStatus, string> = {
  NOT_STARTED: 'NÃO INICIADA',
  PENDING: 'AGUARDANDO INÍCIO',
  IN_PROGRESS: 'EM ANDAMENTO',
  IN_REVIEW: 'EM ANÁLISE',
  VERIFIED: 'VERIFICADA',
  REJECTED: 'REJEITADA',
  EXPIRED: 'EXPIRADA',
}

export function getKycStatusLabel(status: VerificationStatus): string {
  return STATUS_LABELS[status]
}

export function buildWhatsAppSupportUrl(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null
  const normalized = normalizePhoneToE164(phone)
  if (!/^\+[1-9]\d{1,14}$/.test(normalized)) return null
  return `https://wa.me/${normalized.replace(/\D/g, '')}`
}

export function getKycAttention(status: VerificationStatus, waitingMinutes: number): KycAttention {
  if (status === 'VERIFIED') return 'NONE'
  if (waitingMinutes >= KYC_CRITICAL_MINUTES) return 'CRITICAL'
  if (waitingMinutes >= KYC_WARNING_MINUTES) return 'WARNING'
  return 'NONE'
}

export function matchesKycFilter(status: VerificationStatus, filter: KycAdminFilter): boolean {
  if (filter === 'ALL') return true
  if (filter === 'PENDING') return status === 'PENDING' || status === 'IN_PROGRESS'
  if (filter === 'PROBLEM') return status === 'REJECTED' || status === 'EXPIRED'
  return status === filter
}

export function summarizeKycOperations(items: KycOperationsItem[]): KycOperationsSummary {
  return {
    notStarted: items.filter((item) => item.verificationStatus === 'NOT_STARTED').length,
    pending: items.filter((item) => ['PENDING', 'IN_PROGRESS'].includes(item.verificationStatus)).length,
    inReview: items.filter((item) => item.verificationStatus === 'IN_REVIEW').length,
    verified: items.filter((item) => item.verificationStatus === 'VERIFIED').length,
    problem: items.filter((item) => ['REJECTED', 'EXPIRED'].includes(item.verificationStatus)).length,
    unresolved: items.filter((item) => item.verificationStatus !== 'VERIFIED').length,
  }
}

export function buildKycOperationsItems(
  accounts: MonitorAccount[], profiles: MonitorProfile[], verifications: MonitorVerification[], now = new Date()
): KycOperationsItem[] {
  const profileByAccount = new Map(profiles.map((profile) => [profile.account_user_id, profile]))
  const latestVerificationByAccount = new Map<string, MonitorVerification>()
  for (const verification of [...verifications].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())) {
    if (!latestVerificationByAccount.has(verification.account_user_id)) latestVerificationByAccount.set(verification.account_user_id, verification)
  }

  const items: KycOperationsItem[] = accounts.map((account) => {
    const profile = profileByAccount.get(account.id)
    const verification = latestVerificationByAccount.get(account.id)
    const status = verification?.status ?? 'NOT_STARTED'
    const lastUpdatedAt = verification?.updated_at ?? account.created_at
    const waitingMinutes = status === 'VERIFIED' ? 0 : Math.max(0, Math.floor((now.getTime() - new Date(lastUpdatedAt).getTime()) / 60_000))
    return {
      accountUserId: account.id,
      professionalName: profile?.stage_name?.trim() || 'Profissional sem perfil',
      profileId: profile?.id ?? null,
      profileStatus: profile?.status ?? null,
      onboardingStatus: account.onboarding_status,
      onboardingStep: account.onboarding_step,
      verificationStatus: status,
      statusLabel: getKycStatusLabel(status),
      lastUpdatedAt,
      waitingMinutes,
      attention: getKycAttention(status, waitingMinutes),
      supportHref: `/admin/professionals/${account.id}`,
    }
  })
  return items.sort((a, b) => {
    if (a.verificationStatus === 'VERIFIED' && b.verificationStatus !== 'VERIFIED') return 1
    if (a.verificationStatus !== 'VERIFIED' && b.verificationStatus === 'VERIFIED') return -1
    return b.waitingMinutes - a.waitingMinutes
  })
}

export async function getKycSupportContext(accountUserId: string, now = new Date()): Promise<KycSupportContext | null> {
  const admin = createAdminClient()
  const [{ data: account, error: accountError }, { data: profile, error: profileError }, { data: verification, error: verificationError }] = await Promise.all([
    admin.from('account_users').select('id, onboarding_status, onboarding_step, created_at').eq('id', accountUserId).eq('role', 'ADVERTISER').neq('status', 'DELETED').maybeSingle(),
    admin.from('professional_profiles').select('stage_name, status, whatsapp_phone').eq('account_user_id', accountUserId).maybeSingle(),
    admin.from('identity_verifications').select('status, updated_at').eq('account_user_id', accountUserId).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (accountError || profileError || verificationError) throw new Error('KYC support context unavailable')
  if (!account) return null
  const status = (verification?.status as VerificationStatus | undefined) ?? 'NOT_STARTED'
  const lastUpdatedAt = verification?.updated_at ?? account.created_at
  const waitingMinutes = status === 'VERIFIED' ? 0 : Math.max(0, Math.floor((now.getTime() - new Date(lastUpdatedAt).getTime()) / 60_000))
  const whatsappPhone = profile?.whatsapp_phone?.trim() || null
  return {
    accountUserId: account.id,
    professionalName: profile?.stage_name?.trim() || 'Profissional sem perfil',
    profileStatus: (profile?.status as ProfileStatus | undefined) ?? null,
    onboardingStatus: account.onboarding_status as OnboardingStatus,
    onboardingStep: account.onboarding_step,
    verificationStatus: status,
    statusLabel: getKycStatusLabel(status),
    lastUpdatedAt,
    waitingMinutes,
    whatsappPhone,
    whatsappUrl: buildWhatsAppSupportUrl(whatsappPhone),
  }
}

export async function getKycOperationsMonitor(now = new Date()): Promise<{ items: KycOperationsItem[]; summary: KycOperationsSummary }> {
  const admin = createAdminClient()
  const [{ data: accounts, error: accountError }, { data: profiles, error: profileError }, { data: verifications, error: verificationError }] = await Promise.all([
    admin.from('account_users').select('id, onboarding_status, onboarding_step, created_at').eq('role', 'ADVERTISER').neq('status', 'DELETED'),
    admin.from('professional_profiles').select('id, account_user_id, stage_name, status'),
    admin.from('identity_verifications').select('account_user_id, status, created_at, updated_at').order('updated_at', { ascending: false }),
  ])

  if (accountError || profileError || verificationError) throw new Error('KYC operations data unavailable')

  const items = buildKycOperationsItems(
    (accounts ?? []) as MonitorAccount[], (profiles ?? []) as MonitorProfile[], (verifications ?? []) as MonitorVerification[], now
  )
  return { items, summary: summarizeKycOperations(items) }
}
