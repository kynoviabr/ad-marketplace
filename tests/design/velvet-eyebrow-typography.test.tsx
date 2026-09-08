import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { VelvetEyebrow } from '@/components/ui/velvet-eyebrow'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

describe('Velvet Global Eyebrow / Overline Typography System', () => {
  const publicCss = read('app/velvet-public.css')

  it('1. defines canonical .velvet-overline and .velvet-eyebrow with target editorial typography', () => {
    expect(publicCss).toContain('.velvet-overline')
    expect(publicCss).toContain('.velvet-eyebrow')
    expect(publicCss).toMatch(/\.velvet-overline,\s*\.velvet-eyebrow\s*\{[\s\S]*?font-size:\s*clamp\(13\.5px,\s*1\.1vw,\s*15\.5px\);/)
    expect(publicCss).toMatch(/\.velvet-overline,\s*\.velvet-eyebrow\s*\{[\s\S]*?font-weight:\s*700;/)
    expect(publicCss).toMatch(/\.velvet-overline,\s*\.velvet-eyebrow\s*\{[\s\S]*?letter-spacing:\s*0\.16em;/)
    expect(publicCss).toMatch(/\.velvet-overline,\s*\.velvet-eyebrow\s*\{[\s\S]*?line-height:\s*1\.25;/)
    expect(publicCss).toMatch(/\.velvet-overline,\s*\.velvet-eyebrow\s*\{[\s\S]*?text-transform:\s*uppercase;/)
    expect(publicCss).toMatch(/\.velvet-overline,\s*\.velvet-eyebrow\s*\{[\s\S]*?color:\s*var\(--public-aubergine,\s*#71357d\);/)
  })

  it('2. provides light/inverse variant for dark backgrounds without using new colors', () => {
    expect(publicCss).toMatch(/\.velvet-overline--inverse,\s*\.velvet-eyebrow--inverse\s*\{[\s\S]*?color:\s*#d4bad8;/)
    // Acquisition and dark cards use the light token
    expect(publicCss).toContain('.velvet-home-acquisition .velvet-overline{color:#d4bad8}')
    expect(publicCss).toContain('.velvet-anuncie-final-card .velvet-overline')
    expect(publicCss).toContain('.velvet-guide-cta-card .velvet-overline')
  })

  it('3. enforces mobile responsive tracking and floor to prevent line wrapping overflow', () => {
    expect(publicCss).toMatch(/@media\(max-width:700px\)\{[\s\S]*?\.velvet-overline,\.velvet-eyebrow\{font-size:clamp\(13px,3\.5vw,14px\);letter-spacing:\.12em;line-height:1\.3\}/)
  })

  it('4. maintains disciplined 14–20px vertical gap to editorial headlines across sections', () => {
    // Hero: 14px on desktop and mobile
    expect(publicCss).toContain('.velvet-home-hero-copy h1{max-width:680px;margin:14px 0 20px;')
    expect(publicCss).toContain('.velvet-home-hero-copy h1{margin:14px 0 16px;')

    // Novas Modelos & Novos Conteúdos: 14px
    expect(publicCss).toMatch(/\.velvet-home-section-header h2\s*\{[\s\S]*?margin:\s*14px 0 0;/)

    // Featured Profiles & Locations: 14px
    expect(publicCss).toContain('.velvet-home-section-head h2{margin:14px 0 0;')

    // Trust Section: 14px
    expect(publicCss).toMatch(/\.velvet-home-trust \.velvet-overline\s*\{[\s\S]*?margin:\s*0 0 14px;/)

    // Legal Documents: 16px
    expect(publicCss).toContain('.velvet-legal-hero h1{max-width:760px;margin:16px 0 28px;')

    // Anuncie sections: 14px
    expect(publicCss).toMatch(/\.velvet-anuncie-section-header h2\s*\{[\s\S]*?margin:\s*14px 0 12px;/)
  })

  it('5. standardizes homepage eyebrow copy and structure', () => {
    const home = read('app/(public)/page.tsx')
    const hero = read('components/public/home-hero.tsx')
    const trust = read('components/public/home-trust-section.tsx')
    const newProf = read('components/public/home-new-professionals.tsx')
    const newContent = read('components/public/home-new-content.tsx')
    const messages = read('lib/i18n/messages/public.ts')

    // Home Hero
    expect(hero).toContain('className="velvet-overline"')
    expect(hero).toContain("t('home.heroOverline')")
    expect(messages).toContain("'home.heroOverline': 'SÃO PAULO · PERFIS VERIFICADOS'")
    expect(messages).toContain("'home.heroOverline': 'SÃO PAULO · VERIFIED PROFILES'")

    // Trust Section
    expect(trust).toContain('className="velvet-overline"')
    expect(trust).toContain("t('home.trustOverline')")
    expect(messages).toContain("'home.trustOverline': 'CONFIANÇA VELVET'")
    expect(messages).toContain("'home.trustOverline': 'TRUST AT VELVET'")

    // Novas Modelos & Novos Conteúdos
    expect(newProf).toContain('className="velvet-overline"')
    expect(newContent).toContain('className="velvet-overline"')
    expect(home).toContain("overline={locale === 'en' ? 'NEW ARRIVALS' : 'RECÉM-CHEGADAS'}")
    expect(home).toContain("overline={locale === 'en' ? 'PHOTOS & VIDEOS' : 'FOTOS & VÍDEOS'}")
  })

  it('6. applies canonical eyebrow system across institutional pages', () => {
    const sobre = read('app/(public)/sobre/page.tsx')
    const comoFunciona = read('app/(public)/como-funciona/page.tsx')
    const cookies = read('app/(public)/cookies/page.tsx')
    const seguranca = read('app/(public)/seguranca/page.tsx')
    const privacidade = read('app/(public)/privacidade/page.tsx')
    const termos = read('app/(public)/termos/page.tsx')
    const anuncie = read('app/(public)/anuncie/page.tsx')
    const comoComecar = read('app/(public)/como-comecar/page.tsx')
    const ajuda = read('app/(public)/ajuda/page.tsx')

    expect(sobre).toContain('className="velvet-overline"')
    expect(sobre).toContain("en ? 'ABOUT VELVET' : 'SOBRE A VELVET'")

    expect(comoFunciona).toContain('className="velvet-overline"')
    expect(comoFunciona).toContain("en ? 'HOW IT WORKS' : 'COMO FUNCIONA'")

    expect(cookies).toContain('className="velvet-overline"')
    expect(cookies).toContain("en ? 'COOKIE POLICY' : 'POLÍTICA DE COOKIES'")

    expect(seguranca).toContain('eyebrow="Confiança e proteção"')
    expect(seguranca).toContain('eyebrow="TRUST AND PROTECTION"')

    expect(privacidade).toContain('eyebrow="Privacidade · versão operacional inicial"')
    expect(privacidade).toContain('eyebrow="PRIVACY · INITIAL OPERATIONAL VERSION"')

    expect(termos).toContain('eyebrow="Termos · versão operacional inicial"')
    expect(termos).toContain('eyebrow="TERMS · INITIAL OPERATIONAL VERSION"')

    expect(anuncie).toContain('className="velvet-overline"')
    expect(comoComecar).toContain('className="velvet-overline"')
    expect(ajuda).toContain('className="velvet-overline')
  })

  it('7. verifies <VelvetEyebrow /> UI primitive renders canonical markup', () => {
    const defaultHtml = renderToStaticMarkup(<VelvetEyebrow>CONFIANÇA VELVET</VelvetEyebrow>)
    expect(defaultHtml).toBe('<p class="velvet-overline">CONFIANÇA VELVET</p>')

    const inverseHtml = renderToStaticMarkup(<VelvetEyebrow variant="inverse">FOR PROFESSIONALS</VelvetEyebrow>)
    expect(inverseHtml).toBe('<p class="velvet-overline velvet-overline--inverse">FOR PROFESSIONALS</p>')

    const compactSpanHtml = renderToStaticMarkup(<VelvetEyebrow variant="compact" as="span">FOUNDER · LAUNCH</VelvetEyebrow>)
    expect(compactSpanHtml).toBe('<span class="velvet-overline velvet-overline--compact">FOUNDER · LAUNCH</span>')
  })

  it('8. confirms legacy tiny 9px/10px eyebrow rules were replaced in public experience', () => {
    // Base rule is no longer 9px
    expect(publicCss).not.toContain('.velvet-overline{margin:0;color:var(--public-aubergine);font:700 9px/1.4 var(--font-body);letter-spacing:.21em}')

    // Trust section is no longer locked to 13px override
    expect(publicCss).not.toMatch(/\.velvet-home-trust \.velvet-overline\s*\{[^}]*font-size:\s*13px;/)

    // Help eyebrow is no longer 10px
    expect(publicCss).not.toMatch(/\.velvet-help-eyebrow\s*\{[^}]*font-size:\s*10px;/)
    expect(publicCss).not.toMatch(/\.velvet-help-banner-eyebrow\s*\{[^}]*font-size:\s*10px;/)
  })
})
