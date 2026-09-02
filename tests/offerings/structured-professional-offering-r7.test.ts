import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseOfferingFormData } from '@/modules/offerings/schema'
import {
  OFFERING_GROUPS,
  OFFERING_OPTIONS,
  createUnspecifiedOfferingMap,
  mapOfferingStatusesToAiContext,
} from '@/modules/offerings/types'
import { SearchQuerySchema } from '@/modules/search/schemas'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet R7 structured professional offering', () => {
  const migration = read('supabase/migrations/20260902000001_professional_offerings.sql')
  const offeringDal = read('modules/offerings/dal.ts')
  const searchDal = read('modules/search/dal.ts')
  const filters = read('components/search/public-search-filters.tsx')
  const editor = read('components/onboarding/public-presentation-form.tsx')
  const profile = read('app/(public)/perfil/[slug]/page.tsx')
  const admin = read('components/admin/profile-moderation-card.tsx')
  const publicMessages = read('lib/i18n/messages/public.ts')
  const editorMessages = read('lib/i18n/messages/auth-onboarding.ts')

  it('defines the approved 19-option taxonomy in four groups', () => {
    expect(OFFERING_GROUPS).toEqual(['AUDIENCE', 'SERVICES', 'LOCATIONS', 'AVAILABILITY'])
    expect(OFFERING_OPTIONS).toHaveLength(19)
    expect(new Set(OFFERING_OPTIONS.map(({ code }) => code))).toHaveProperty('size', 19)
  })

  it('uses normalized option and profile-status tables instead of boolean columns', () => {
    expect(migration).toContain('CREATE TABLE public.professional_offering_options')
    expect(migration).toContain('CREATE TABLE public.professional_profile_offerings')
    expect(migration).toContain('PRIMARY KEY (profile_id, option_code)')
    expect(migration).not.toMatch(/offers_(men|women|couples) boolean/i)
  })

  it('backfills every existing profile-option pair as UNSPECIFIED without inference', () => {
    expect(migration).toContain('CROSS JOIN public.professional_offering_options')
    expect(migration).toContain("'UNSPECIFIED'::public.professional_offering_status")
    expect(migration).not.toMatch(/headline|bio/i)
  })

  it('initializes all 19 domain values as UNSPECIFIED', () => {
    const statuses = createUnspecifiedOfferingMap()
    expect(Object.keys(statuses)).toHaveLength(19)
    expect(new Set(Object.values(statuses))).toEqual(new Set(['UNSPECIFIED']))
  })

  it('preserves all three states when parsing editor form data', () => {
    const formData = new FormData()
    formData.set('offering_audience_men', 'OFFERED')
    formData.set('offering_audience_women', 'NOT_OFFERED')
    const parsed = parseOfferingFormData(formData)
    expect(parsed.audience_men).toBe('OFFERED')
    expect(parsed.audience_women).toBe('NOT_OFFERED')
    expect(parsed.audience_couples).toBe('UNSPECIFIED')
  })

  it('rejects invalid tri-state values', () => {
    const formData = new FormData()
    formData.set('offering_audience_men', 'YES')
    expect(() => parseOfferingFormData(formData)).toThrow()
  })

  it('maps future AI context without collapsing NO and UNKNOWN', () => {
    const statuses = createUnspecifiedOfferingMap()
    statuses.audience_men = 'OFFERED'
    statuses.audience_women = 'NOT_OFFERED'
    const context = mapOfferingStatusesToAiContext(statuses)
    expect(context.audience).toEqual({ men: 'OFFERED', women: 'NOT_OFFERED', couples: 'UNSPECIFIED' })
  })

  it('loads full state server-side for editing and OFFERED-only state for public output', () => {
    expect(offeringDal).toContain('getProfileOfferingStatuses')
    expect(offeringDal).toContain(".eq('status', 'OFFERED')")
    expect(profile).toContain('profile.offerings[group]')
    expect(profile).not.toMatch(/NOT_OFFERED|UNSPECIFIED/)
  })

  it('renders a compact, collapsible tri-state editor with an explicit unknown default', () => {
    expect(editor).toContain('<details')
    expect(editor).toContain('<option value="UNSPECIFIED">')
    expect(editor).toContain('<option value="OFFERED">')
    expect(editor).toContain('<option value="NOT_OFFERED">')
    expect(editor).toContain('defaultValue={initialOfferings[option.code]}')
  })

  it('persists all four URL filter families as multi-select query values', () => {
    const parsed = SearchQuerySchema.parse({
      atende: ['audience_men', 'audience_couples'],
      servicos: ['service_gfe', 'service_massage'],
      local: 'location_own',
      disponibilidade: 'availability_travel',
    })
    expect(parsed.atende).toHaveLength(2)
    expect(parsed.servicos).toHaveLength(2)
    expect(parsed.local).toEqual(['location_own'])
    expect(parsed.disponibilidade).toEqual(['availability_travel'])
    for (const key of ['atende', 'servicos', 'local', 'disponibilidade']) expect(filters).toContain(key)
  })

  it('filters exclusively on OFFERED and intersects selections across groups', () => {
    expect(searchDal).toContain(".eq('status', 'OFFERED')")
    expect(searchDal).toContain('for (const groupCodes of byGroup.values())')
    expect(searchDal).toContain('matching = new Set([...matching].filter')
    expect(searchDal).toContain(".from('v_publication_eligible_profiles')")
  })

  it('supports chips, individual X removal, reset and mobile dialog semantics', () => {
    expect(filters).toContain('activeOfferings')
    expect(filters).toContain('remove(chip.key, chip.value)')
    expect(filters).toContain('remaining.forEach((item) => params.append(key, item))')
    expect(filters).toContain('FILTER_KEYS.forEach((key) => params.delete(key))')
    expect(filters).toContain('aria-modal="true"')
  })

  it('provides complete PT/EN taxonomy and editor state labels', () => {
    expect(publicMessages.match(/'offering\.option\.audience_men':/g)).toHaveLength(2)
    expect(publicMessages.match(/'offering\.option\.availability_travel':/g)).toHaveLength(2)
    expect(editorMessages.match(/'offering\.status\.notOffered':/g)).toHaveLength(2)
    expect(editorMessages.match(/'offering\.status\.unspecified':/g)).toHaveLength(2)
  })

  it('shows structured values in the existing moderation surface', () => {
    expect(admin).toContain('profile.offerings.map')
    expect(admin).toContain('item.option_code')
    expect(admin).toContain('item.status')
  })
})
