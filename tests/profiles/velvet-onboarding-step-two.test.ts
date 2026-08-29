import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PublicPresentationProfileSchema } from '@/modules/profiles/schemas'

const ROOT = join(__dirname, '../..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

const validPayload = {
  headline: 'Encontros leves e sem pressa',
  bio: 'Paulistana, curiosa e apaixonada por boas conversas e encontros elegantes.',
  public_age: '27',
  height_cm: '170',
  weight_kg: '58',
  eye_color: 'BROWN',
  hair_color: 'BRUNETTE',
  hair_length: 'LONG',
  body_type: 'SLIM',
  show_age: true,
  show_height: true,
  show_weight: false,
}

describe('Velvet onboarding Step 02 — Seu perfil', () => {
  it('uses canonical enums and numeric units', () => {
    const result = PublicPresentationProfileSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.height_cm).toBe(170)
      expect(result.data.weight_kg).toBe(58)
      expect(result.data.hair_color).toBe('BRUNETTE')
    }
  })

  it('rejects invalid enum values', () => {
    expect(PublicPresentationProfileSchema.safeParse({ ...validPayload, eye_color: 'PURPLE' }).success).toBe(false)
  })

  it('enforces bio and numeric domain limits', () => {
    expect(PublicPresentationProfileSchema.safeParse({ ...validPayload, bio: 'Curta' }).success).toBe(false)
    expect(PublicPresentationProfileSchema.safeParse({ ...validPayload, height_cm: '99' }).success).toBe(false)
    expect(PublicPresentationProfileSchema.safeParse({ ...validPayload, weight_kg: '301' }).success).toBe(false)
  })

  it('allows optional public attributes to remain absent', () => {
    const result = PublicPresentationProfileSchema.safeParse({
      ...validPayload,
      public_age: '', height_cm: '', weight_kg: '', eye_color: '', hair_color: '', hair_length: '', body_type: '',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.height_cm).toBeNull()
  })

  it('protects access and preloads persisted profile values on the server', () => {
    const page = read('app/(dashboard)/onboarding/seu-perfil/page.tsx')
    expect(page).toContain('requireAccount()')
    expect(page).toContain('getProfileByAccountUserId(account.id)')
    expect(page).toContain('profile.bio')
    expect(page).not.toContain("'use client'")
  })

  it('derives ownership from the session and never trusts browser ids', () => {
    const action = read('modules/profiles/actions.ts')
    const step = action.slice(action.indexOf('savePublicPresentationProfileAction'), action.indexOf('Persists Step 01'))
    expect(step).toContain('const account = await requireAccount()')
    expect(step).toContain(".eq('account_user_id', account.id)")
    expect(step).not.toContain("formData.get('account")
    expect(step).not.toContain("formData.get('profile")
  })

  it('reuses canonical privacy flags and advances monotonically', () => {
    const action = read('modules/profiles/actions.ts')
    expect(action).toContain('show_age: parsed.data.show_age')
    expect(action).toContain('show_height: parsed.data.show_height')
    expect(action).toContain('show_weight: parsed.data.show_weight')
    expect(action).toContain("onboarding_step: 3")
    expect(action).toContain(".lt('onboarding_step', 3)")
  })

  it('routes successful saves to the next-step boundary', () => {
    const action = read('modules/profiles/actions.ts')
    expect(action).toContain("redirect('/onboarding/onde-atende')")
  })

  it('keeps legal identity, locations, photos and KYC out of Step 02', () => {
    const form = read('components/onboarding/public-presentation-form.tsx')
    for (const forbidden of ['legal_name', 'document', 'location_id', 'profile_media', 'identity_verification']) {
      expect(form).not.toContain(forbidden)
    }
  })
})
