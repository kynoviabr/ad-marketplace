import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { evaluateProfileCompleteness } from '@/modules/profiles/completeness'
import { isPublicSearchEligible } from '@/modules/search/eligibility'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')
const completeProfile = {
  stage_name: 'Helena',
  headline: 'Encontros com elegância',
  bio: 'Uma apresentação pública completa e autêntica.',
  show_whatsapp: true,
  whatsapp_phone: '+5511999999999',
  show_phone: false,
  direct_phone: null,
  show_telegram: false,
  telegram_username: null,
}

describe('Velvet Founder lifecycle and public gate alignment', () => {
  it('uses canonical completeness and conditionally submits a complete DRAFT', () => {
    expect(evaluateProfileCompleteness(completeProfile).isComplete).toBe(true)
    const submission = read('modules/profiles/submission.ts')
    expect(submission).toContain('evaluateProfileCompleteness(profile)')
    expect(submission).toContain("status: 'READY_FOR_REVIEW'")
    expect(submission).toContain(".eq('account_user_id', accountUserId)")
    expect(submission).toContain(".eq('status', 'DRAFT')")
  })

  it('keeps incomplete profile data incomplete and does not duplicate rules', () => {
    expect(evaluateProfileCompleteness({ ...completeProfile, bio: null }).isComplete).toBe(false)
    const submission = read('modules/profiles/submission.ts')
    expect(submission).toContain('if (!completeness.isComplete')
    expect(submission.match(/headline.*length|bio.*length/g)).toBeNull()
  })

  it('makes repeated submission safe and prevents cross-account updates', () => {
    const submission = read('modules/profiles/submission.ts')
    expect(submission).toContain("profile.status !== 'DRAFT'")
    expect(submission.match(/\.eq\('account_user_id', accountUserId\)/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('separates activation eligibility from ACTIVE-only public visibility', () => {
    const migration = read('supabase/migrations/20260830000001_founder_publication_gate_alignment.sql')
    expect(migration).toContain('v_publication_eligible_profiles')
    expect(migration).toContain("WHERE p.status = 'ACTIVE'")
    expect(migration).toContain('pm.is_primary = TRUE')
    const dal = read('modules/publication/dal.ts')
    expect(dal).toContain('evaluateProfileCompleteness(profile).isComplete')
    expect(dal).toContain("profile?.status === 'READY_FOR_REVIEW'")
  })

  it('never considers READY_FOR_REVIEW publicly searchable', () => {
    const account = { status: 'ACTIVE' as const }
    const verification = { status: 'VERIFIED' as const, identity_verified: true, age_verified: true }
    expect(isPublicSearchEligible(
      { status: 'READY_FOR_REVIEW', content_moderation_status: 'APPROVED' },
      account,
      verification,
      1,
      1,
      true
    )).toBe(false)
    expect(isPublicSearchEligible(
      { status: 'ACTIVE', content_moderation_status: 'APPROVED' },
      account,
      verification,
      1,
      1,
      true
    )).toBe(true)
  })

  it('public search and slug lookup consume only the ACTIVE-only canonical view', () => {
    expect(read('modules/search/dal.ts')).toContain(".from('v_publication_eligible_profiles')")
    expect(read('modules/profiles/public-detail.ts')).toContain(".from('v_publication_eligible_profiles')")
  })

  it('requires activation eligibility before the READY_FOR_REVIEW to ACTIVE transition', () => {
    const action = read('modules/publication/actions.ts')
    expect(action.indexOf('isProfileReadyForActivation')).toBeLessThan(action.indexOf("status: 'ACTIVE'"))
    expect(action).toContain(".eq('status', 'READY_FOR_REVIEW')")
    expect(action).toContain('isProfileCanonicallyEligible')
  })

  it('reconciles approval to an approved deterministic primary', () => {
    const migration = read('supabase/migrations/20260830000001_founder_publication_gate_alignment.sql')
    expect(migration).toContain("status = 'APPROVED'")
    expect(migration).toContain('is_primary = TRUE')
    expect(migration).toContain('ORDER BY position ASC, created_at ASC, id ASC')
    expect(migration).toContain("p_decision IN ('REJECT', 'QUARANTINE')")
  })

  it('keeps the profile queue narrow and derives safe KYC state from verification rows', () => {
    const dal = read('modules/moderation/dal.ts')
    expect(dal).toContain(".eq('content_moderation_status', 'PENDING')")
    expect(dal).toContain(".in('status', ['READY_FOR_REVIEW', 'ACTIVE'])")
    expect(dal).toContain(".from('identity_verifications')")
    expect(dal).not.toContain('verified_adult: true')
  })

  it('keeps moderation actions behind the existing ADMIN boundary', () => {
    const actions = read('modules/moderation/actions.ts')
    expect(actions.match(/requireAdmin\(\)/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
