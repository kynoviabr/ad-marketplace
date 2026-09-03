import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { normalizeSubscriptionState } from '@/modules/billing/entitlements'

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('R10 monetization and entitlements', () => {
  it('normalizes the provider-neutral lifecycle without changing legacy rows', () => {
    expect(normalizeSubscriptionState(null)).toBe('FREE')
    expect(normalizeSubscriptionState({ status: 'INCOMPLETE', subscription_state: null } as never)).toBe('TRIAL')
    expect(normalizeSubscriptionState({ status: 'ACTIVE', subscription_state: 'CANCELED' } as never)).toBe('CANCELED')
  })

  it('uses one server resolver for publication and media quotas', () => {
    const entitlements = source('modules/billing/entitlements.ts')
    expect(entitlements).toContain('export async function resolveEntitlements')
    expect(entitlements).toContain('resolvePublicationEntitlement')
    expect(source('modules/media/actions.ts')).toContain('resolveEntitlements(account.id)')
    expect(source('modules/videos/actions.ts')).toContain('resolveEntitlements(profile.account_user_id)')
  })

  it('keeps publication fail closed and separate from KYC/moderation gates', () => {
    const entitlements = source('modules/billing/entitlements.ts')
    expect(entitlements).toContain('commerciallyEligible && configured === true')
    expect(source('modules/publication/dal.ts')).toContain("from('v_publication_eligible_profiles')")
  })

  it('adds a configurable FREE catalog and future-safe entitlement values', () => {
    const sql = source('supabase/migrations/20260903120000_r10_monetization_entitlements.sql')
    for (const value of ['FREE', 'FOUNDER', 'MAX_PHOTOS', 'MAX_VIDEOS', 'REVIEWS_ACCESS', 'PREMIUM_FEATURES', 'WHATSAPP_AI', 'FOUNDER_STATUS']) expect(sql).toContain(value)
    expect(sql).toContain('display_metadata JSONB')
    expect(sql).toContain('value_text TEXT')
  })

  it('keeps private overrides and audit logs fail closed', () => {
    const sql = source('supabase/migrations/20260903120000_r10_monetization_entitlements.sql')
    expect(sql).toContain('ALTER TABLE public.entitlement_overrides ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('REVOKE ALL ON public.entitlement_overrides FROM PUBLIC, anon, authenticated')
    expect(sql).toContain('GRANT ALL ON public.entitlement_overrides TO service_role')
    expect(sql).not.toMatch(/CREATE POLICY[^;]+entitlement_overrides/i)
  })

  it('supports authorized audited Founder grant and revoke', () => {
    const actions = source('modules/billing/actions.ts')
    expect(actions).toContain('export async function revokeFounderBenefitAction')
    expect(actions).toContain("action: 'FOUNDER_GRANTED'")
    expect(actions).toContain("action: 'FOUNDER_REVOKED'")
    expect(actions.match(/requireAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('shows honest PT/EN account plan UX without checkout', () => {
    const page = source('app/(dashboard)/dashboard/billing/page.tsx')
    expect(page).toContain('resolveEntitlements(account.id)')
    expect(page).toContain("locale === 'en'")
    expect(page).toContain('No payment provider or checkout is currently available.')
    expect(page).not.toContain('CheckoutButton')
  })
})
