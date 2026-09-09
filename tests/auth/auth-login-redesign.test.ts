import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { authOnboardingPtBR, authOnboardingEn } from '@/lib/i18n/messages/auth-onboarding'

const ROOT = join(__dirname, '../..')

describe('Auth /login Redesign & Professional Acquisition', () => {
  const layoutContent = readFileSync(join(ROOT, 'app/(auth)/layout.tsx'), 'utf-8')
  const loginFormContent = readFileSync(join(ROOT, 'components/auth/login-form.tsx'), 'utf-8')
  const authEditorialPath = join(ROOT, 'components/auth/auth-editorial.tsx')
  const cssContent = readFileSync(join(ROOT, 'app/globals.css'), 'utf-8')

  it('verifies AuthEditorial component exists with approved editorial portraits', () => {
    expect(existsSync(authEditorialPath)).toBe(true)
    const editorialContent = readFileSync(authEditorialPath, 'utf-8')
    expect(editorialContent).toContain('mural-01.jpg')
    expect(editorialContent).toContain('mural-04.jpg')
    expect(editorialContent).toContain('mural-12.jpg')
    expect(editorialContent).toContain('mural-07.jpg')
    expect(editorialContent).toContain('href={localized(\'/signup\')}')
    expect(editorialContent).toContain('href={localized(\'/anuncie\')}')
  })

  it('renders AuthEditorial inside AuthLayout with canonical popover LanguageSelector', () => {
    expect(layoutContent).toContain('<AuthEditorial locale={locale} />')
    expect(layoutContent).toContain('<LanguageSelector variant="popover" theme="light" placement="bottom" showLabel />')
    // Ensure raw unconfigured LanguageSelector is not present
    expect(layoutContent).not.toMatch(/<LanguageSelector\s*\/>/)
  })

  it('replaces tiny generic "Criar conta" link with dedicated acquisition block in LoginForm', () => {
    expect(loginFormContent).toContain('auth-acquisition-block')
    expect(loginFormContent).toContain('auth.acquisitionKicker')
    expect(loginFormContent).toContain('auth.acquisitionDesc')
    expect(loginFormContent).toContain('auth.createProfileCta')
    expect(loginFormContent).toContain('href="/signup"')
    expect(loginFormContent).toContain('auth-acquisition-cta')
    // Generic legacy link pattern should not be in the footer
    expect(loginFormContent).not.toContain('auth-footer')
  })

  it('includes complete i18n translation keys in both PT-BR and EN', () => {
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
      'auth.roleNotice',
      'auth.acquisitionKicker',
      'auth.acquisitionDesc',
      'auth.loginSubtitle',
    ]

    for (const key of requiredKeys) {
      expect((authOnboardingPtBR as Record<string, string>)[key], `ptBR missing key: ${key}`).toBeDefined()
      expect((authOnboardingEn as Record<string, string>)[key], `en missing key: ${key}`).toBeDefined()
    }
  })

  it('defines CSS for split layout, editorial visuals, and prefers-reduced-motion overrides', () => {
    expect(cssContent).toContain('.auth-layout')
    expect(cssContent).toContain('.auth-editorial')
    expect(cssContent).toContain('.auth-editorial-visuals')
    expect(cssContent).toContain('.auth-portrait-card')
    expect(cssContent).toContain('.auth-acquisition-block')
    expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)')
    expect(cssContent).toContain('animation: none !important')
  })
})
