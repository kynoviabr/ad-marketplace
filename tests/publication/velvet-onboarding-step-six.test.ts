import { describe, expect, it } from 'vitest'
import { buildPublicationReadiness } from '@/modules/publication/readiness'
import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { ProfileMedia } from '@/modules/media/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const profile = { stage_name: 'Helena', headline: 'Encontros com elegância', bio: 'Uma apresentação pública completa e autêntica.', show_whatsapp: true, whatsapp_phone: '+5511999999999', show_phone: false, direct_phone: null, show_telegram: false, telegram_username: null, status: 'READY_FOR_REVIEW', content_moderation_status: 'APPROVED' } as ProfessionalProfile
const base = { account: { status: 'ACTIVE' as const }, profile, verification: { status: 'VERIFIED' as const, identityVerified: true, ageVerified: true, verifiedAt: null, expiresAt: null }, locations: [{ location: { active: true } }] as never[], media: [{ status: 'APPROVED', is_primary: true, deleted_at: null }] as ProfileMedia[], hasEntitlement: true, activationEligible: true, dataAvailable: true }

describe('Velvet onboarding Step 06 readiness', () => {
  it('reports readiness for a canonically eligible profile', () => { const result = buildPublicationReadiness(base); expect(result.items.every((item) => item.ready)).toBe(true); expect(result.blockingReasons).toEqual([]) })
  it.each([['KYC missing', { verification: null }], ['adult verification missing', { verification: { ...base.verification, ageVerified: false } }], ['service area missing', { locations: [] }], ['profile incomplete', { profile: { ...profile, bio: null, status: 'DRAFT' as const } }], ['billing missing', { hasEntitlement: false }]])('blocks %s', (_label, override) => { const result = buildPublicationReadiness({ ...base, ...override, activationEligible: false }); expect(result.items.some((item) => !item.ready)).toBe(true) })
  it.each(['PENDING_MODERATION', 'REJECTED', 'QUARANTINED'] as const)('does not satisfy media with %s', (status) => { const result = buildPublicationReadiness({ ...base, media: [{ status, is_primary: true, deleted_at: null } as ProfileMedia], activationEligible: false }); expect(result.items.find((item) => item.key === 'photos')?.ready).toBe(false) })
  it('requires an approved primary even when a secondary photo is approved', () => { const result = buildPublicationReadiness({ ...base, media: [{ status: 'APPROVED', is_primary: false, deleted_at: null } as ProfileMedia], activationEligible: false }); expect(result.items.find((item) => item.key === 'photos')?.ready).toBe(false) })
  it('keeps text moderation separate from approved media', () => { const result = buildPublicationReadiness({ ...base, profile: { ...profile, content_moderation_status: 'PENDING' }, activationEligible: false }); expect(result.items.find((item) => item.key === 'photos')?.ready).toBe(true); expect(result.items.find((item) => item.key === 'publication')?.detail).toContain('texto') })
  it('identifies entitlement as the remaining blocker', () => { const result = buildPublicationReadiness({ ...base, hasEntitlement: false, activationEligible: false }); expect(result.items.find((item) => item.key === 'publication')?.detail).toContain('direito de publicação') })
  it('fails closed on unavailable data', () => { const result = buildPublicationReadiness({ ...base, dataAvailable: false, activationEligible: false }); expect(result.items.find((item) => item.key === 'publication')?.ready).toBe(false) })
  it('derives ownership from auth inside the atomic publication RPC', () => {
    const action = readFileSync(resolve(process.cwd(), 'modules/publication/actions.ts'), 'utf8')
    expect(action).toContain('requireAccount()')
    expect(action).toContain("supabase.rpc('publish_owned_profile')")
    expect(action).not.toContain(".from('professional_profiles')")
    expect(action).not.toContain('formData.get')
  })
})
