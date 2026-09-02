import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { InitialProfessionalProfileSchema } from '@/modules/profiles/schemas'

const ROOT = join(__dirname, '../..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

describe('Velvet professional onboarding foundation', () => {
  it('routes the professional acquisition entry to canonical signup', () => {
    const entry = read('app/anuncie/page.tsx')
    expect(entry).toContain("localizePathname('/signup', locale)")
    expect(entry).toContain('redirect(localizePathname')
  })

  it('sends authenticated auth-page visitors through the onboarding resolver', () => {
    const proxy = read('proxy.ts')
    const login = read('modules/auth/actions.ts')
    const callback = read('app/auth/callback/route.ts')
    expect(proxy).toContain("url.pathname = localizePathname('/onboarding', locale)")
    expect(login).toContain("redirect('/onboarding')")
    expect(callback).toContain("'/onboarding'")
  })

  it('protects onboarding in proxy and at the server data boundary', () => {
    const proxy = read('proxy.ts')
    const page = read('app/(dashboard)/onboarding/voce/page.tsx')
    expect(proxy).toContain("'/onboarding'")
    expect(page).toContain('requireAccount()')
    expect(page).not.toContain("'use client'")
  })

  it('persists only canonical Step 01 profile fields', () => {
    const valid = InitialProfessionalProfileSchema.safeParse({
      stage_name: 'Helena',
      whatsapp_phone: '(11) 99999-8888',
    })
    expect(valid.success).toBe(true)
    if (valid.success) expect(valid.data.whatsapp_phone).toBe('+5511999998888')

    const invalid = InitialProfessionalProfileSchema.safeParse({
      stage_name: 'H',
      whatsapp_phone: '123',
    })
    expect(invalid.success).toBe(false)
  })

  it('never accepts a browser supplied account or profile id', () => {
    const action = read('modules/profiles/actions.ts')
    const stepAction = action.slice(
      action.indexOf('saveInitialProfessionalProfileAction'),
      action.indexOf('Server Action: Create Initial Profile Draft')
    )
    expect(stepAction).toContain('const account = await requireAccount()')
    expect(stepAction).toContain(".eq('account_user_id', account.id)")
    expect(stepAction).toContain('account_user_id: account.id')
    expect(stepAction).not.toContain("formData.get('account")
    expect(stepAction).not.toContain("formData.get('profile")
  })

  it('supports durable resume with server-loaded persisted values', () => {
    const page = read('app/(dashboard)/onboarding/voce/page.tsx')
    expect(page).toContain('getProfileByAccountUserId(account.id)')
    expect(page).toContain("profile?.stage_name ?? ''")
    expect(page).toContain("profile?.whatsapp_phone ?? ''")
  })

  it('keeps the six-step shell and the canonical initial step', () => {
    const shell = read('components/onboarding/onboarding-shell.tsx')
    for (const key of ['onboarding.step.you', 'onboarding.step.profile', 'onboarding.step.locations', 'onboarding.step.verification', 'onboarding.step.photos', 'onboarding.step.review']) {
      expect(shell).toContain(`t('${key}')`)
    }
    expect(existsSync(join(ROOT, 'app/(dashboard)/onboarding/voce/page.tsx'))).toBe(true)
    expect(existsSync(join(ROOT, 'app/(dashboard)/onboarding/seu-perfil/page.tsx'))).toBe(true)
  })

  it('does not add DOB or legal identity to the public profile step', () => {
    const form = read('components/onboarding/initial-profile-form.tsx')
    expect(form).not.toContain('date_of_birth')
    expect(form).not.toContain('legal_name')
    expect(form).not.toContain('public_age')
  })
})
