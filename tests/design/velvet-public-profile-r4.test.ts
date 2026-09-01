import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Velvet R4 public profile contracts', () => {
  const route = read('app/(public)/perfil/[slug]/page.tsx')
  const css = read('app/velvet-public.css')
  const r4Css = css.slice(css.indexOf('VELVET R4'))
  const detail = read('modules/profiles/public-detail.ts')
  const messages = read('lib/i18n/messages/public.ts')
  const seo = read('modules/seo/metadata.ts')

  it('1. remains fail-closed behind the ACTIVE-only canonical publication view', () => {
    expect(detail).toContain(".from('v_publication_eligible_profiles')")
    expect(route).toContain('if (!detail) notFound()')
    expect(route).not.toContain("status: 'ACTIVE'")
  })

  it('2. renders verification, identity, location and conversion in the hero hierarchy', () => {
    expect(route.indexOf('profile.verificationBadge')).toBeLessThan(route.indexOf('id="profile-title"'))
    expect(route.indexOf('profile-location')).toBeLessThan(route.indexOf('profile-contact-block'))
  })

  it('3. consumes only the existing public-safe verification booleans', () => {
    expect(detail).toContain('verifiedIdentity: true')
    expect(detail).toContain('verifiedAdult: true')
    expect(route).toContain("t('profile.verificationBadge')")
  })

  it('4. does not render sensitive KYC identity data', () => {
    expect(route).not.toMatch(/legal_name|date_of_birth|\bdob\b|\bcpf\b|biometric|selfie|provider_session_id|document_number/i)
  })

  it('5. moves optional essential facts into the first decision surface', () => {
    expect(route.indexOf('profile-information')).toBeLessThan(route.indexOf('profile-overview'))
    expect(route).toContain('profile.heightCm ?')
    expect(route).toContain('profile.bodyType ?')
  })

  it('6. renders canonical public service areas without private address data', () => {
    expect(route).toContain('locations.map')
    expect(route).toContain("t('profile.primaryLocation')")
    expect(route).not.toMatch(/street|address|latitude|longitude/i)
  })

  it('7. preserves full professional-authored biography while avoiding exact short-copy repetition', () => {
    expect(route).toContain('createBioPresentation(profile.bio)')
    expect(route).toContain('if (normalized.length <= HERO_BIO_LIMIT)')
    expect(route).toContain('{bio.full}')
    expect(route).not.toContain('translate(profile.bio')
  })

  it('8. preserves the exact canonical wa.me destination construction', () => {
    expect(route).toContain("profile.whatsappPhone?.replace(/\\D/g, '')")
    expect(route).toContain('`https://wa.me/${whatsappDigits}`')
  })

  it('9. preserves WhatsApp analytics behavior and does not prefill or send messages', () => {
    expect(route).toContain('<WhatsAppCTA')
    expect(route).toContain("placementType: 'ORGANIC' as const")
    expect(route).not.toMatch(/text=|sendMessage|prefill/i)
  })

  it('10. includes localized PT-BR profile-system copy', () => {
    expect(messages).toContain("'profile.verificationBadge': 'Identidade e maioridade verificadas'")
    expect(messages).toContain("'profile.whatsapp': 'Conversar no WhatsApp'")
  })

  it('11. includes localized English profile-system copy', () => {
    expect(messages).toContain("'profile.verificationBadge': 'Identity and legal age verified'")
    expect(messages).toContain("'profile.whatsapp': 'Chat on WhatsApp'")
  })

  it('12. preserves canonical profile metadata generation', () => {
    expect(route).toContain('constructProfileMetadata')
    expect(route).toContain('primaryMediaUrl: null')
  })

  it('13. preserves hreflang alternates through the canonical metadata helper', () => {
    expect(seo).toContain('languages: buildLanguageAlternates(pathname)')
    expect(route).toContain('constructProfileMetadata')
  })

  it('14. preserves public profile JSON-LD without signed media URLs', () => {
    expect(route).toContain('generateProfileJsonLd(seoContract)')
    expect(route).toContain("replace(/</g, '\\\\u003c')")
    expect(route).toContain('primaryMediaUrl: null')
  })

  it('15. defines explicit desktop, tablet and mobile responsive contracts', () => {
    expect(r4Css).toContain('@media (max-width: 1023px)')
    expect(r4Css).toContain('@media (max-width: 899px)')
    expect(r4Css).toContain('@media (max-width: 767px)')
  })

  it('16. bounds primary photography relative to viewport height', () => {
    expect(r4Css).toContain('width: min(100%, 416px)')
    expect(r4Css).toContain('aspect-ratio: 4 / 5')
    expect(r4Css).toContain('max-height: 64vh')
  })

  it('17. uses one H1 and labelled H2 sections for a semantic heading hierarchy', () => {
    expect(route.match(/<h1\b/g)).toHaveLength(1)
    expect(route).toContain('aria-labelledby="profile-about-title"')
    expect(route).toContain("title={t('profile.information')}")
    expect(route).toContain('aria-labelledby="profile-gallery-title"')
  })

  it('18. keeps primary interactive targets at least 44px tall', () => {
    expect(r4Css).toContain('min-height: 44px')
    expect(r4Css).toContain('min-height: var(--control-h)')
    expect(r4Css).toContain('min-height: var(--control-h-mobile)')
  })

  it('19. introduces no business-state mutation in the public route', () => {
    expect(route).not.toMatch(/\.update\(|\.insert\(|\.upsert\(|\.delete\(|revalidatePath|redirect\(/)
  })

  it('20. introduces no database client or schema mutation in the presentation route', () => {
    expect(route).not.toMatch(/createAdminClient|createClient|supabase|migration|execute_sql/i)
  })

  it('21. refines every touched velvet. wordmark to regular editorial weight', () => {
    expect(r4Css).toMatch(/\.velvet-public-wordmark,[\s\S]*?font-weight: 400;/)
    expect(r4Css).toContain('.velvet-mobile-nav-wordmark')
  })

  it('22. explicitly removes synthetic blur, shadow and filters from the wordmark', () => {
    const wordmarkRule = r4Css.slice(0, r4Css.indexOf('.velvet-public-footer .velvet-public-wordmark'))
    expect(wordmarkRule).toContain('text-shadow: none')
    expect(wordmarkRule).toContain('filter: none')
    expect(wordmarkRule).not.toContain('font-weight: 500')
  })

  it('23. uses natural localized capitalization for footer group headings', () => {
    expect(messages).toContain("'footer.discover': 'Descobrir'")
    expect(messages).toContain("'footer.professionals': 'Profissionais'")
    expect(messages).toContain("'footer.trustLegal': 'Confiança'")
  })

  it('24. removes forced uppercase as the footer hierarchy mechanism', () => {
    expect(r4Css).toMatch(/\.velvet-public-footer-group h2[\s\S]*?text-transform: none;/)
  })

  it('25. renders important public CTA labels at 16px', () => {
    expect(r4Css).toMatch(/\.velvet-home-acquisition[\s\S]*?font-size: 16px;/)
    expect(r4Css).toMatch(/\.profile-detail-page--r4 \.profile-whatsapp[\s\S]*?font-size: 16px;/)
  })

  it('26. keeps primary CTA controls at the shared 48/52px heights', () => {
    expect(r4Css).toContain('min-height: var(--control-h)')
    expect(r4Css).toContain('min-height: var(--control-h-mobile)')
  })

  it('27. keeps the PT-BR CTA readable without a no-wrap truncation contract', () => {
    expect(messages).toContain("'home.createProfile': 'Criar meu perfil'")
    expect(messages).toContain("'profile.whatsapp': 'Conversar no WhatsApp'")
    expect(r4Css).not.toMatch(/profile-whatsapp[^}]*white-space:\s*nowrap/)
  })

  it('28. keeps the English CTA readable without a no-wrap truncation contract', () => {
    expect(messages).toContain("'home.createProfile': 'Create my profile'")
    expect(messages).toContain("'profile.whatsapp': 'Chat on WhatsApp'")
    expect(r4Css).not.toMatch(/home-acquisition[^}]*text-overflow:\s*ellipsis/)
  })

  it('29. preserves R3 route-aware public navigation behavior', () => {
    const navigation = read('components/public/public-navigation-state.ts')
    expect(navigation).toContain("logicalPath.startsWith('/perfil/')")
    expect(navigation).toContain("item === 'explore'")
  })

  it('30. does not alter Home or Search information architecture', () => {
    const home = read('app/(public)/page.tsx')
    const search = read('app/[city]/page.tsx')
    expect(home).toContain('<HomeHero')
    expect(home).toContain('<PublicProfileGrid')
    expect(search).toContain('<PublicProfileCard')
    expect(route).not.toContain('PublicProfileGrid')
  })

  it('31. keeps the editorial wordmark crisp without increasing its weight', () => {
    expect(r4Css).toContain('font-synthesis: none')
    expect(r4Css).toContain('-webkit-font-smoothing: auto')
    expect(r4Css).toContain('transform: none')
  })

  it('32. makes the repeated verification treatments quieter but readable', () => {
    expect(r4Css).toMatch(/\.profile-verification-badge[\s\S]*?min-height: 32px;[\s\S]*?font-size: var\(--text-label\);[\s\S]*?font-weight: 500;/)
    expect(r4Css).toMatch(/\.profile-trust \.velvet-badge[\s\S]*?background: transparent;[\s\S]*?font-size: var\(--text-label\);/)
  })

  it('33. preserves compact readable fact typography', () => {
    expect(r4Css).toMatch(/\.profile-information dt[\s\S]*?font-size: max\(12px, var\(--text-label\)\);/)
    expect(r4Css).toMatch(/\.profile-information dd[\s\S]*?font-size: max\(15px, var\(--text-body\)\);/)
  })

  it('34. keeps gallery metadata readable without competing with its heading', () => {
    expect(r4Css).toMatch(/\.profile-gallery-heading > p[\s\S]*?font-size: var\(--text-body-s\);[\s\S]*?font-weight: 500;/)
  })

  it('35. reduces only the desktop whitespace between regions and gallery', () => {
    expect(r4Css).toMatch(/\.profile-overview \{[\s\S]*?padding-block: var\(--space-6\);/)
    expect(r4Css).toMatch(/\.profile-overview \+ \.profile-gallery[\s\S]*?padding-top: var\(--space-5\);/)
    expect(r4Css).toMatch(/@media \(max-width: 767px\)[\s\S]*?\.profile-overview \{ padding-block: var\(--space-7\); \}/)
  })

  it('36. gives footer legal copy an explicit readable floor', () => {
    expect(r4Css).toMatch(/\.velvet-public-footer \.velvet-public-footer-legal small[\s\S]*?font-size: max\(12px, var\(--text-label\)\);/)
  })
})
