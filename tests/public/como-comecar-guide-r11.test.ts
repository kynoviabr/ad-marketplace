import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'
import { RESERVED_TOP_LEVEL_SLUGS } from '@/modules/seo/constants'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('R11.2A — Professional Guide (Como começar na velvet.)', () => {
  const guide = read('app/(public)/como-comecar/page.tsx')
  const anuncie = read('app/(public)/anuncie/page.tsx')
  const css = read('app/velvet-public.css')

  it('is implemented under app/(public)/como-comecar/page.tsx inheriting PublicLayout shell', () => {
    expect(guide).toBeTruthy()
    expect(guide).not.toContain('<PublicHeader')
    expect(guide).not.toContain('<PublicFooter')
  })

  it('reserves "como-comecar" in RESERVED_TOP_LEVEL_SLUGS', () => {
    expect(RESERVED_TOP_LEVEL_SLUGS.has('como-comecar')).toBe(true)
  })

  it('generates canonical URLs and hreflang alternates for /como-comecar and /en/como-comecar', () => {
    expect(guide).toContain("buildCanonicalUrl('/como-comecar', undefined, locale)")
    expect(guide).toContain("buildLanguageAlternates('/como-comecar')")

    expect(buildCanonicalUrl('/como-comecar', undefined, 'pt-BR')).toMatch(/\/como-comecar$/)
    expect(buildCanonicalUrl('/como-comecar', undefined, 'en')).toMatch(/\/en\/como-comecar$/)

    const alternates = buildLanguageAlternates('/como-comecar')
    expect(alternates['pt-BR']).toMatch(/\/como-comecar$/)
    expect(alternates['en']).toMatch(/\/en\/como-comecar$/)
    expect(alternates['x-default']).toMatch(/\/como-comecar$/)
  })

  it('Section 1: Intro contains headline and explains staged creation with control', () => {
    expect(guide).toContain('Como começar na velvet.')
    expect(guide).toContain('How to start on velvet.')
    expect(guide).toContain('etapas')
    expect(guide).toContain('controle')
  })

  it('Section 2: Journey presents all 8 visual steps in sequence with action, check, and visibility', () => {
    const stepsPT = [
      'Criar sua conta',
      'Verificar identidade e maioridade',
      'Montar seu perfil',
      'Adicionar fotos e vídeos',
      'Informar serviços e regiões',
      'Escolher Público ou VIP',
      'Enviar para análise',
      'Publicar',
    ]
    for (const step of stepsPT) {
      expect(guide).toContain(step)
    }

    const stepsEN = [
      'Create your account',
      'Verify identity & legal age',
      'Build your profile',
      'Add photos & videos',
      'Set services & regions',
      'Choose Public or VIP',
      'Submit for review',
      'Publish',
    ]
    for (const step of stepsEN) {
      expect(guide).toContain(step)
    }

    // Explains what she does and what velvet checks
    expect(guide).toContain('whatYouDo')
    expect(guide).toContain('whatVelvetChecks')
    expect(guide).toContain('visibility')
  })

  it('Section 3: Privacy Callout explicitly clarifies civil name/CPF protection vs stage identity', () => {
    expect(guide).toContain('nome civil')
    expect(guide).toContain('CPF')
    expect(guide).toContain('documentos')
    expect(guide).toContain('nome artístico')
    expect(guide).toContain('NUNCA são mostrados publicamente')
    expect(guide).toContain('NEVER displayed publicly')
  })

  it('Section 4: Publication conditions covers verification, completeness, media, area, plan, moderation', () => {
    expect(guide).toContain('Verificação 18+')
    expect(guide).toContain('Perfil preenchido')
    expect(guide).toContain('Mídia e fotos aprovadas')
    expect(guide).toContain('Região de atendimento informada')
    expect(guide).toContain('Plano ou acesso ativo')
    expect(guide).toContain('Moderação responsável')
    // No internal technical jargon
    expect(guide).not.toContain('v_publication_eligible_profiles')
    expect(guide).not.toContain('RLS')
    expect(guide).not.toContain('Didit')
  })

  it('Section 5: CTAs link to canonical signup and anuncie', () => {
    expect(guide).toContain('Começar meu perfil')
    expect(guide).toContain('Start my profile')
    expect(guide).toContain('Anuncie na velvet.')
    expect(guide).toContain('Advertise on velvet.')
    expect(guide).toContain("localizePathname('/signup', locale)")
    expect(guide).toContain("localizePathname('/anuncie', locale)")
  })

  it('links to /como-comecar from the professional acquisition page (/anuncie)', () => {
    expect(anuncie).toContain("localizePathname('/como-comecar', locale)")
  })

  it('contains dedicated velvet-guide CSS styles in velvet-public.css', () => {
    expect(css).toContain('.velvet-guide')
    expect(css).toContain('.velvet-guide-intro')
    expect(css).toContain('.velvet-guide-journey')
    expect(css).toContain('.velvet-guide-privacy-callout')
    expect(css).toContain('.velvet-guide-publication')
    expect(css).toContain('.velvet-guide-cta')
  })
})
