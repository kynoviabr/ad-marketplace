import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTestSupabaseAdmin } from '../helpers/supabase-test-client'
import { getEligiblePublicProfileBySlug } from '@/modules/profiles/public-detail'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet public profile route contract', () => {
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const dal = read('modules/profiles/public-detail.ts')
  const review = read('app/(dashboard)/onboarding/revisar/page.tsx')

  it('keeps the canonical /perfil/[slug] route and Step 06 link', () => {
    expect(route).toContain('getEligiblePublicProfileBySlug')
    expect(review).toContain('Ver meu perfil')
    expect(review).toContain('href={`/perfil/${review.slug}`}')
  })

  it('fails closed through the canonical eligibility view before reading the DTO', () => {
    expect(dal).toContain(".from('v_publication_eligible_profiles')")
    expect(dal.indexOf("v_publication_eligible_profiles")).toBeLessThan(dal.indexOf('getPublicProfileDTO(normalizedSlug)'))
    expect(route).toContain('if (!detail) notFound()')
  })

  it('queries and delivers approved non-deleted media only', () => {
    expect(dal).toContain(".eq('status', 'APPROVED')")
    expect(dal).toContain(".is('deleted_at', null)")
    expect(dal).toContain('getApprovedMediaDeliveryUrl(item)')
    expect(dal).not.toContain('getManageableProfileMedia')
    expect(route).not.toContain('storage_path')
  })

  it('renders only the canonical public DTO and truthful trust claims', () => {
    expect(route).toContain('profile.publicAge')
    expect(route).toContain('profile.heightCm')
    expect(route).toContain('profile.whatsappPhone')
    expect(route).not.toContain('account_user_id')
    expect(route).not.toContain('provider_session_id')
    expect(route).toContain('Identidade verificada')
    expect(route).toContain('Maioridade confirmada')
    expect(route).not.toMatch(/background check|fotos reais verificadas|profissional segura/i)
  })

  it('uses adaptive unique gallery classes without duplication', () => {
    expect(dal).toContain('new Map')
    expect(route).toContain('count-${Math.min(media.length, 4)}')
    expect(route).toContain('media.map')
  })

  it('reuses canonical WhatsApp analytics and reserved PROFILE_VIEWED event', () => {
    expect(route).toContain('<WhatsAppCTA')
    expect(read('components/public/profile-view-tracker.tsx')).toContain("event_type: 'PROFILE_VIEWED'")
  })

  it('uses prepared canonical SEO helpers and omits expiring signed social images', () => {
    expect(route).toContain('constructProfileMetadata')
    expect(route).toContain('generateProfileJsonLd')
    expect(route).toContain('primaryMediaUrl: null')
  })
})

describe('Velvet public profile route — LIVE DEV', () => {
  it('resolves an eligible fixture with approved delivery, service area and privacy DTO', async () => {
    const admin = getTestSupabaseAdmin()
    const { data, error } = await admin
      .from('v_publication_eligible_profiles')
      .select('profile_slug')
      .limit(20)
    if (error || !data?.length) throw new Error('No eligible synthetic DEV fixture available')

    // The full integration suite mutates synthetic fixtures concurrently. Resolve
    // the first row that remains eligible through the complete fail-closed read.
    let resolved = null
    for (const row of data) {
      resolved = await getEligiblePublicProfileBySlug(row.profile_slug)
      if (resolved) break
    }

    expect(resolved).not.toBeNull()
    expect(resolved?.media.length).toBeGreaterThan(0)
    expect(resolved?.locations.length).toBeGreaterThan(0)
    expect(resolved?.verifiedAdult).toBe(true)
  })

  it('returns the same generic null for unknown and known-ineligible slugs', async () => {
    const admin = getTestSupabaseAdmin()
    const { data: eligibleRows } = await admin.from('v_publication_eligible_profiles').select('profile_slug')
    const eligible = new Set((eligibleRows ?? []).map((row) => row.profile_slug))
    const { data: candidates } = await admin.from('professional_profiles').select('slug').limit(50)
    const ineligible = (candidates ?? []).find((row) => !eligible.has(row.slug))?.slug
    expect(await getEligiblePublicProfileBySlug('slug-publico-inexistente')).toBeNull()
    if (ineligible) expect(await getEligiblePublicProfileBySlug(ineligible)).toBeNull()
  })
})
