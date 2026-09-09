import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { authOnboardingPtBR, authOnboardingEn } from '@/lib/i18n/messages/auth-onboarding'

const ROOT = join(__dirname, '../..')

describe('Auth /login Redesign: Dual-Column Vertical Carousel & Calmer Form', () => {
  const layoutContent = readFileSync(join(ROOT, 'app/(auth)/layout.tsx'), 'utf-8')
  const loginFormContent = readFileSync(join(ROOT, 'components/auth/login-form.tsx'), 'utf-8')
  const authEditorialPath = join(ROOT, 'components/auth/auth-editorial.tsx')
  const cssContent = readFileSync(join(ROOT, 'app/globals.css'), 'utf-8')

  it('renders a genuine two-column vertical continuous carousel with approved portraits', () => {
    expect(existsSync(authEditorialPath)).toBe(true)
    const editorialContent = readFileSync(authEditorialPath, 'utf-8')
    expect(editorialContent).toContain('COLUMN_ONE_PORTRAITS')
    expect(editorialContent).toContain('COLUMN_TWO_PORTRAITS')
    expect(editorialContent).toContain('auth-editorial-stream')
    expect(editorialContent).toContain('auth-stream-col--down')
    expect(editorialContent).toContain('auth-stream-col--up')
    expect(editorialContent).toContain('auth-stream-card')
    expect(editorialContent).toContain('auth-stream-track')
    expect(editorialContent).toContain('mural-01.jpg')
    expect(editorialContent).toContain('mural-02.jpg')
    expect(editorialContent).toContain('mural-03.jpg')
    expect(editorialContent).toContain('href={localized(\'/signup\')}')
    expect(editorialContent).toContain('href={localized(\'/anuncie\')}')
    // Single closed card look is removed
    expect(editorialContent).not.toContain('auth-single-portrait-frame')
  })

  it('guarantees text-over-photo is absent with separate copy and dual-stream visual zones', () => {
    const editorialContent = readFileSync(authEditorialPath, 'utf-8')
    expect(editorialContent).toContain('auth-editorial-grid')
    expect(editorialContent).toContain('auth-editorial-copy-zone')
    expect(editorialContent).toContain('auth-editorial-stream')
    // No text nested inside stream cards
    expect(editorialContent).not.toMatch(/auth-stream-card[\s\S]*?<p/)
    expect(editorialContent).not.toMatch(/auth-stream-card[\s\S]*?<h/)
  })

  it('renders AuthEditorial inside AuthLayout with canonical popover LanguageSelector', () => {
    expect(layoutContent).toContain('<AuthEditorial locale={locale} />')
    expect(layoutContent).toContain('<LanguageSelector variant="popover" theme="light" placement="bottom" showLabel />')
    expect(layoutContent).not.toMatch(/<LanguageSelector\s*\/>/)
  })

  it('replaces heavy boxed acquisition card with clean secondary signup treatment in LoginForm', () => {
    expect(loginFormContent).toContain('auth-signup-secondary')
    expect(loginFormContent).toContain('auth-signup-separator')
    expect(loginFormContent).toContain('auth.acquisitionKicker')
    expect(loginFormContent).toContain('auth.acquisitionDesc')
    expect(loginFormContent).toContain('auth.createProfileCta')
    expect(loginFormContent).toContain('href="/signup"')
    expect(loginFormContent).toContain('auth-signup-link')
    expect(loginFormContent).not.toContain('auth-acquisition-block')
    expect(loginFormContent).not.toContain('auth-footer')
  })

  it('includes complete i18n translation keys in both PT-BR and EN matching prompt specifications', () => {
    const requiredKeys = [
      'auth.editorialHeadline',
      'auth.editorialSupport1',
      'auth.editorialSupport2',
      'auth.benefit1',
      'auth.benefit2',
      'auth.benefit3',
      'auth.createProfileCta',
      'auth.howItWorksCta',
      'auth.editorialMicrocopy',
      'auth.acquisitionKicker',
      'auth.acquisitionDesc',
      'auth.loginSubtitle',
    ]

    for (const key of requiredKeys) {
      expect((authOnboardingPtBR as Record<string, string>)[key], `ptBR missing key: ${key}`).toBeDefined()
      expect((authOnboardingEn as Record<string, string>)[key], `en missing key: ${key}`).toBeDefined()
    }

    expect(authOnboardingPtBR['auth.editorialSupport2']).toContain('Você cuida do seu perfil e das suas decisões')
    expect(authOnboardingPtBR['auth.acquisitionDesc']).toBe('Quer criar seu perfil profissional?')
  })

  it('defines desktop split architecture with dual vertical streams and mobile login-first responsive styles', () => {
    expect(cssContent).toContain('.auth-layout')
    expect(cssContent).toContain('.auth-editorial-grid')
    expect(cssContent).toContain('.auth-editorial-copy-zone')
    expect(cssContent).toContain('.auth-editorial-stream')
    expect(cssContent).toContain('.auth-stream-col')
    expect(cssContent).toContain('.auth-stream-card')
    expect(cssContent).toContain('.auth-signup-secondary')
    // Mobile login first: .auth-container order: 1
    expect(cssContent).toMatch(/@media[^{]*\(max-width:\s*600px\)[\s\S]*?\.auth-container\s*\{[^}]*order:\s*1/)
  })
})
