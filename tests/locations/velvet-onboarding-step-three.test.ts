import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MAX_SERVICE_AREAS, SaveProfileLocationsSchema } from '@/modules/locations/schemas'

const ROOT = join(__dirname, '../..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const ids = Array.from({ length: 6 }, (_, index) => `00000000-0000-4000-8000-00000000000${index}`)

describe('Velvet onboarding Step 03 — Onde atende', () => {
  it('protects the route and preloads canonical selections', () => {
    const page = read('app/(dashboard)/onboarding/onde-atende/page.tsx')
    expect(page).toContain('requireAccount()')
    expect(page).toContain('getProfileLocations(profile.id)')
    expect(page).toContain("getLocationsByCitySlug('sao-paulo')")
  })

  it('accepts one or multiple canonical service areas', () => {
    expect(SaveProfileLocationsSchema.safeParse({ location_ids: [ids[0]], primary_location_id: ids[0] }).success).toBe(true)
    expect(SaveProfileLocationsSchema.safeParse({ location_ids: ids.slice(0, 3), primary_location_id: ids[1] }).success).toBe(true)
  })

  it('reuses the canonical maximum-area rule', () => {
    expect(MAX_SERVICE_AREAS).toBe(5)
    expect(SaveProfileLocationsSchema.safeParse({ location_ids: ids, primary_location_id: ids[0] }).success).toBe(false)
  })

  it('requires the primary area to belong to the selection', () => {
    expect(SaveProfileLocationsSchema.safeParse({ location_ids: [ids[0]], primary_location_id: ids[1] }).success).toBe(false)
  })

  it('rejects invalid location identifiers', () => {
    expect(SaveProfileLocationsSchema.safeParse({ location_ids: ['moema'], primary_location_id: 'moema' }).success).toBe(false)
  })

  it('derives ownership from session and never trusts browser profile ids', () => {
    const action = read('modules/locations/actions.ts')
    const step = action.slice(action.indexOf('saveOnboardingLocationsAction'), action.indexOf('Server Action: Save Service Locations'))
    expect(step).toContain('const account = await requireAccount()')
    expect(step).toContain('getProfileByAccountUserId(account.id)')
    expect(step).not.toContain("formData.get('profile_id')")
    expect(step).not.toContain("formData.get('account_id')")
  })

  it('fails closed for inactive or unknown locations before persistence', () => {
    const action = read('modules/locations/actions.ts')
    expect(action).toContain(".eq('active', true)")
    expect(action).toContain('validLocations.length !== location_ids.length')
  })

  it('reuses the atomic RPC and advances onboarding monotonically', () => {
    const action = read('modules/locations/actions.ts')
    expect(action).toContain("admin.rpc('save_profile_service_areas'")
    expect(action).toContain('onboarding_step: 4')
    expect(action).toContain(".lt('onboarding_step', 4)")
    expect(action).toContain("redirect('/onboarding/verificacao')")
  })

  it('provides search, selected-state and accessible primary controls', () => {
    const form = read('components/onboarding/location-selection-form.tsx')
    expect(form).toContain('type="search"')
    expect(form).toContain('aria-pressed={selected}')
    expect(form).toContain('type="radio"')
    expect(form).toContain('aria-live="polite"')
  })

  it('does not collect private or freeform geographic data', () => {
    const form = read('components/onboarding/location-selection-form.tsx')
    for (const forbidden of ['street_address', 'building_number', 'latitude', 'longitude', 'coordinates']) {
      expect(form).not.toContain(forbidden)
    }
  })
})
