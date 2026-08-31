import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const actions = read('modules/billing/actions.ts')
const dal = read('modules/billing/dal.ts')
const ui = read('components/admin/founder-entitlement-manager.tsx')
const page = read('app/(admin)/admin/billing/page.tsx')
const migration = read('supabase/migrations/20260830000002_admin_founder_entitlement_management.sql')

describe('Admin Founder entitlement management', () => {
  it('lives in the existing protected billing admin surface and displays safe status', () => {
    expect(page).toContain('FounderEntitlementManager')
    expect(page).toContain('getAdminFounderEntitlementSummaries')
    for (const key of ['admin.publication', 'admin.plan', 'admin.price', 'admin.status', 'admin.validUntil', 'admin.founderPeriod']) expect(ui).toContain(`t('${key}')`)
    expect(dal).not.toContain('provider_customer_id, provider_subscription_id')
  })

  it('requires ADMIN before resolving or mutating the target', () => {
    const actionStart = actions.indexOf('export async function grantFounderBenefitAction')
    const action = actions.slice(actionStart)
    expect(action.indexOf('requireAdmin()')).toBeGreaterThan(-1)
    expect(action.indexOf('requireAdmin()')).toBeLessThan(action.indexOf("from('professional_profiles')"))
  })

  it('uses profile context and revalidates profile to ACTIVE account relationship server-side', () => {
    expect(actions).toContain('GrantFounderBenefitSchema')
    expect(actions).toContain("from('professional_profiles')")
    expect(actions).toContain('account:account_users!inner(id, status)')
    expect(actions).toContain('account.id !== target.account_user_id')
    expect(actions).toContain("account.status !== 'ACTIVE'")
  })

  it('creates an audited three-month FOUNDER/LAUNCH_FREE grant without provider', () => {
    expect(actions).toContain(".eq('code', 'FOUNDER')")
    expect(actions).toContain(".eq('price_code', 'LAUNCH_FREE')")
    expect(actions).toContain('periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 3)')
    expect(actions).toContain("status: 'ACTIVE'")
    expect(actions).toContain('provider: null')
    expect(actions).toContain('granted_by: input.grantedBy')
    expect(actions).toContain("grant_source: FOUNDER_GRANT_SOURCE")
  })

  it('is idempotent for an active Founder grant and blocks conflicting subscriptions', () => {
    expect(actions).toContain("plan?.code === 'FOUNDER'")
    expect(actions).toContain("price?.price_code === 'LAUNCH_FREE'")
    expect(actions).toContain('return { success: true, data: existingFounder as Subscription }')
    expect(actions).toContain('Já existe uma assinatura não encerrada para esta conta.')
    expect(migration).toContain('granted_by UUID REFERENCES public.account_users(id)')
    expect(migration).toContain('grant_source TEXT')
  })

  it('does not modify profile, KYC or moderation state during a grant', () => {
    const service = actions.slice(actions.indexOf('async function createFounderFreeLaunch'), actions.indexOf('export async function createFreeLaunchAction'))
    expect(service).not.toContain(".from('professional_profiles').update")
    expect(service).not.toContain(".from('identity_verifications')")
    expect(service).not.toContain('content_moderation_status')
  })

  it('aligns the SQL view with explicit PROFILE_PUBLICATION=true', () => {
    expect(migration).toContain("pe.code = 'PROFILE_PUBLICATION'")
    expect(migration).toContain('pe.value_bool = TRUE')
    expect(migration).toContain("WHERE p.status = 'ACTIVE'")
    expect(migration).toContain('pm.is_primary = TRUE')
  })

  it('prevents duplicate clicks and exposes no arbitrary account-id input', () => {
    expect(ui).toContain('if (pendingProfile) return')
    expect(ui).toContain('disabled={pendingProfile !== null}')
    expect(ui).not.toContain('accountUserId')
    expect(ui).not.toContain('<input')
  })
})
