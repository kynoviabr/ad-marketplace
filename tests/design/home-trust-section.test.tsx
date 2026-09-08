import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeTrustSection } from '@/components/public/home-trust-section'

// Mock server-only modules
vi.mock('server-only', () => ({}))

let mockLocale = 'pt-BR'

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === 'x-velvet-locale') return mockLocale
      return null
    },
  })),
}))

describe('HomeTrustSection — Trust & Verification Refinement', () => {
  beforeEach(() => {
    mockLocale = 'pt-BR'
  })

  it('renders correctly in Portuguese (pt-BR) with approved copy and canonical v mark semantics', async () => {
    mockLocale = 'pt-BR'
    const element = await HomeTrustSection()
    const html = renderToStaticMarkup(element)

    // Eyebrow and intro
    expect(html).toContain('CONFIANÇA VELVET')
    expect(html).toContain('Perfis verificados.')
    expect(html).toContain('Contato direto.')
    expect(html).toContain('No Velvet, identidade e maioridade são verificadas antes da publicação do perfil. Depois disso, o contato acontece diretamente entre você e a profissional.')

    // Intro has large canonical v mark
    expect(html).toContain('velvet-trust-v-mark--large')

    // 3 Trust items
    expect(html).toContain('Identidade verificada')
    expect(html).toContain('Confirmamos a identidade antes que o perfil possa ser publicado.')
    expect(html).toContain('Maioridade confirmada')
    expect(html).toContain('Apenas adultos com 18 anos ou mais podem anunciar no Velvet.')
    expect(html).toContain('Contato direto')
    expect(html).toContain('Você conversa diretamente com a profissional, sem intermediação do Velvet.')

    // Check that small v mark is present for verification points
    const vMarkMatches = html.match(/velvet-trust-v-mark--small/g) || []
    expect(vMarkMatches.length).toBe(2)

    // Check that point 3 uses direct contact icon (arrow), not v mark
    expect(html).toContain('velvet-trust-contact-icon')

    // CTA
    expect(html).toContain('Entenda como verificamos os perfis')
    expect(html).toContain('href="/como-funciona"')
  })

  it('renders correctly in English (en) with approved copy and localized routing', async () => {
    mockLocale = 'en'
    const element = await HomeTrustSection()
    const html = renderToStaticMarkup(element)

    // Eyebrow and intro
    expect(html).toContain('TRUST AT VELVET')
    expect(html).toContain('Verified profiles.')
    expect(html).toContain('Direct contact.')
    expect(html).toContain('At Velvet, identity and age are verified before a profile can be published. From there, you connect directly with the professional.')

    // 3 Trust items
    expect(html).toContain('Identity verified')
    expect(html).toContain('We verify identity before a profile can be published.')
    expect(html).toContain('Age confirmed')
    expect(html).toContain('Only adults aged 18 or older can advertise on Velvet.')
    expect(html).toContain('Direct contact')
    expect(html).toContain('You communicate directly with the professional, without Velvet acting as an intermediary.')

    // CTA
    expect(html).toContain('Learn how profile verification works')
    expect(html).toContain('href="/en/how-it-works"')
  })

  it('ensures contact item does not have v mark inside its article container', async () => {
    mockLocale = 'pt-BR'
    const element = await HomeTrustSection()
    const html = renderToStaticMarkup(element)

    // Split by articles
    const articles = html.split('</article>')
    expect(articles.length).toBeGreaterThanOrEqual(3)

    // First article: Identidade verificada -> must have v-mark
    expect(articles[0]).toContain('velvet-trust-v-mark')
    expect(articles[0]).toContain('Identidade verificada')

    // Second article: Maioridade confirmada -> must have v-mark
    expect(articles[1]).toContain('velvet-trust-v-mark')
    expect(articles[1]).toContain('Maioridade confirmada')

    // Third article: Contato direto -> must NOT have v-mark, MUST have contact icon
    expect(articles[2]).not.toContain('velvet-trust-v-mark')
    expect(articles[2]).toContain('velvet-trust-contact-icon')
    expect(articles[2]).toContain('Contato direto')
  })
})
