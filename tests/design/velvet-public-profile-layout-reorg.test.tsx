import React from 'react'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProfileInformation } from '@/components/public/profile-information'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Public profile layout reorganization & brand fidelity contracts', () => {
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const css = read('app/velvet-public.css')
  const information = read('components/public/profile-information.tsx')

  it('1. uses the approved canonical Velvet brand mark for verification in the hero', () => {
    expect(route).toContain("import { VelvetBrandMark } from '@/components/ui/velvet-brand-mark'")
    expect(route).toContain('<VelvetBadge variant="verified" className="profile-verification-badge" icon={<VelvetBrandMark size="chip" />}')
    expect(route).not.toMatch(/className="profile-verification-badge"[^>]*icon="✓"/)
  })

  it('2. bounds photo dominance with a compact max-width while preserving portrait framing', () => {
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-hero-photo \{[\s\S]*?width: min\(100%, 416px\);[\s\S]*?max-width: 360px;/)
  })

  it('3. resizes the WhatsApp CTA from an oversized slab to an intentional editorial button', () => {
    expect(css).toMatch(/\.profile-detail-page--r4 \.profile-whatsapp \{[\s\S]*?width: fit-content;[\s\S]*?min-width: 220px;[\s\S]*?max-width: 320px;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.profile-detail-page--r4 \.profile-whatsapp \{[\s\S]*?width: 100%;/)
  })

  it('4. removes the contact disclaimer from immediately under the hero CTA to prevent reading flow interruption', () => {
    const heroBlock = route.slice(route.indexOf('profile-contact-block'), route.indexOf('</section>'))
    expect(heroBlock).not.toContain('velvet-disclaimer--contact')
    expect(heroBlock).not.toContain('velvet-disclaimer-primary')
  })

  it('5. renders Core Profile Details below hero row in a dedicated wrap', () => {
    expect(route).toContain('profile-details-wrap')
    expect(route.indexOf('profile-details-wrap')).toBeGreaterThan(route.indexOf('</section>'))
    expect(route.indexOf('profile-details-wrap')).toBeLessThan(route.indexOf('profile-overview'))
  })

  it('6. provides first-class structured offerings/services chips display', () => {
    expect(information).toContain('profile-offerings-system')
    expect(information).toContain('profile-offerings-grid')
    expect(information).toContain('profile-offering-group')
    expect(information).toContain('profile-offering-chip')
    expect(css).toContain('.profile-detail-page--r4 .profile-offerings-system')
    expect(css).toContain('.profile-detail-page--r4 .profile-offering-chip')
  })

  it('7. renders structured offering chips when provided to ProfileInformation', () => {
    const markup = renderToStaticMarkup(
      <ProfileInformation
        title="Informações"
        facts={[{ label: 'Idade', value: '25 anos' }]}
        serviceAreas={[{ id: 'jardins', label: 'Jardins', annotation: 'Local principal' }]}
        serviceAreasLabel="ONDE ATENDE"
        offeringGroups={[
          { key: 'SERVICES', label: 'Serviços', items: ['GFE', 'Massagem'] },
          { key: 'AUDIENCE', label: 'Atende', items: ['Homens', 'Mulheres'] },
        ]}
      />
    )
    expect(markup).toContain('profile-offerings-system')
    expect(markup).toContain('Serviços')
    expect(markup).toContain('GFE')
    expect(markup).toContain('Massagem')
    expect(markup).toContain('Atende')
    expect(markup).toContain('Homens')
    expect(markup).toContain('Mulheres')
  })

  it('8. groups verification explanation, direct-contact disclaimer, and safety guidance into the dedicated trust section', () => {
    const trustSection = route.slice(route.indexOf('<aside className="profile-trust"'), route.indexOf('</aside>'))
    expect(trustSection).toContain('profile-trust-card')
    expect(trustSection).toContain('profile-trust-header')
    expect(trustSection).toContain('profile-trust-disclaimer')
    expect(trustSection).toContain("t('profile.verificationBadge')")
    expect(trustSection).toContain("t('profile.verificationDisclaimer')")
    expect(trustSection).toContain("t('profile.contactDisclaimer')")
    expect(trustSection).toContain("t('profile.contactSafety')")
    expect(trustSection).toContain("t('profile.learnSafety')")
    expect(trustSection).toContain('<VelvetBrandMark size="chip" />')
  })

  it('9. adapts layout responsively for tablet and mobile', () => {
    expect(css).toMatch(/@media \(max-width: 899px\)[\s\S]*?\.profile-detail-page--r4 \.profile-trust-card \{[\s\S]*?grid-template-columns: 1fr;/)
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.profile-detail-page--r4 \.profile-offerings-grid \{[\s\S]*?grid-template-columns: 1fr;/)
  })

  it('10. renders trust section as 3 clean cards with titles and safety link', () => {
    const trustSection = route.slice(route.indexOf('<aside className="profile-trust"'), route.indexOf('</aside>'))
    expect(trustSection).toContain('profile-trust-item profile-trust-header')
    expect(trustSection).toContain('profile-trust-item profile-trust-disclaimer')
    expect(trustSection).toContain('profile-trust-item profile-trust-safety')
    expect(trustSection).toContain("t('profile.directContactTitle')")
    expect(trustSection).toContain("t('profile.safetyCareTitle')")
    expect(css).toContain('.profile-detail-page--r4 .profile-trust-card')
    expect(css).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));')
  })

  it('11. prevents trust block collapse by ensuring profile-detail-wrap is display: block', () => {
    const globalsCss = read('app/globals.css')
    expect(css).toContain('.profile-detail-page--r4 .profile-trust .profile-detail-wrap {\n  display: block;')
    expect(globalsCss).not.toMatch(/\.profile-trust \.profile-detail-wrap \{\s*display:\s*grid;\s*grid-template-columns:\s*90px/)
  })

  it('12. ensures footer disclaimers are formatted with flex column and gap', () => {
    expect(css).toContain('.velvet-public-footer-disclaimers {\n  display: flex;\n  flex-direction: column;\n  gap: var(--space-2);')
  })
})
