import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../..')

describe('Auth Language Switcher Position', () => {
  const layoutContent = readFileSync(join(ROOT, 'app/(auth)/layout.tsx'), 'utf-8')
  const cssContent = readFileSync(join(ROOT, 'app/globals.css'), 'utf-8')

  it('places LanguageSelector inside .auth-lang-switch outside of .auth-container', () => {
    expect(layoutContent).toContain('<div className="auth-lang-switch">')
    expect(layoutContent).toContain('<LanguageSelector />')
    expect(layoutContent).toContain('<div className="auth-container">{children}</div>')
    expect(layoutContent).not.toContain('<div className="auth-container"><LanguageSelector />')
  })

  it('preserves velvet. brand wordmark in AuthLayout', () => {
    expect(layoutContent).toContain('velvet<span>.</span>')
    expect(layoutContent).toContain('className="velvet-wordmark auth-wordmark"')
  })

  it('defines desktop positioning for .auth-lang-switch aligning with .auth-wordmark top: 30px', () => {
    expect(cssContent).toMatch(/\.auth-wordmark\s*\{[^}]*top:\s*30px/)
    expect(cssContent).toMatch(/\.auth-lang-switch\s*\{[^}]*position:\s*absolute/)
    expect(cssContent).toMatch(/\.auth-lang-switch\s*\{[^}]*top:\s*30px/)
    expect(cssContent).toMatch(/\.auth-lang-switch\s*\{[^}]*right:\s*clamp\(28px,\s*4\.2vw,\s*72px\)/)
  })

  it('defines mobile positioning for .auth-lang-switch inside the top-right header bar', () => {
    expect(cssContent).toMatch(/@media[^{]*\(max-width:\s*600px\)[\s\S]*?\.auth-lang-switch\s*\{[^}]*top:\s*18px;\s*right:\s*16px;/)
  })
})
