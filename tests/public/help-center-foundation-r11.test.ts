import { describe, expect, it } from 'vitest'
import { HELP_CATEGORIES, STARTER_FAQS } from '@/modules/help/data'
import { RESERVED_TOP_LEVEL_SLUGS, isReservedSlug } from '@/modules/seo/constants'

describe('R11.3A Help Center Foundation', () => {
  it('reserves "ajuda" top-level slug to protect against dynamic city routes', () => {
    expect(RESERVED_TOP_LEVEL_SLUGS.has('ajuda')).toBe(true)
    expect(isReservedSlug('ajuda')).toBe(true)
    expect(isReservedSlug('AJUDA')).toBe(true)
  })

  it('defines the required 12 support categories', () => {
    expect(HELP_CATEGORIES).toHaveLength(12)
    const categoryIds = HELP_CATEGORIES.map((c) => c.id)
    expect(categoryIds).toContain('primeiros-passos')
    expect(categoryIds).toContain('conta-e-acesso')
    expect(categoryIds).toContain('perfil')
    expect(categoryIds).toContain('fotos-e-videos')
    expect(categoryIds).toContain('verificacao')
    expect(categoryIds).toContain('servicos-e-regioes')
    expect(categoryIds).toContain('clientes-vip')
    expect(categoryIds).toContain('avaliacoes')
    expect(categoryIds).toContain('planos')
    expect(categoryIds).toContain('seguranca-e-privacidade')
    expect(categoryIds).toContain('moderacao')
    expect(categoryIds).toContain('problemas-tecnicos')
  })

  it('includes starter FAQs covering key platform invariants', () => {
    expect(STARTER_FAQS.length).toBeGreaterThanOrEqual(9)

    // Verification 18+
    const kycFaq = STARTER_FAQS.find((f) => f.id === 'verificacao-18-como-funciona')
    expect(kycFaq).toBeDefined()
    expect(kycFaq?.contentPt).toContain('18 anos')

    // Publication criteria
    const pubFaq = STARTER_FAQS.find((f) => f.id === 'como-publicar-perfil')
    expect(pubFaq).toBeDefined()
    expect(pubFaq?.contentPt).toContain('Verificação 18+')
    expect(pubFaq?.contentPt).toContain('Foto aprovada')

    // Privacy separation
    const privacyFaq = STARTER_FAQS.find((f) => f.id === 'o-que-fica-publico-privado')
    expect(privacyFaq).toBeDefined()
    expect(privacyFaq?.contentPt).toContain('nome civil')
    expect(privacyFaq?.contentPt).toContain('CPF')

    // Public vs VIP_ONLY
    const vipFaq = STARTER_FAQS.find((f) => f.id === 'public-vs-vip-only')
    expect(vipFaq).toBeDefined()
    expect(vipFaq?.contentPt).toContain('VIP_ONLY')
    expect(vipFaq?.contentPt).toContain('PUBLIC')

    // Pause profile
    const pauseFaq = STARTER_FAQS.find((f) => f.id === 'pausar-ou-ocultar-perfil')
    expect(pauseFaq).toBeDefined()
    expect(pauseFaq?.contentPt).toContain('pausado')

    // Direct contact
    const contactFaq = STARTER_FAQS.find((f) => f.id === 'contato-direto-sem-intermediacao')
    expect(contactFaq).toBeDefined()
    expect(contactFaq?.contentPt).toContain('WhatsApp')
    expect(contactFaq?.contentPt).toContain('100% dos seus ganhos')
  })

  it('provides bilingual content and valid links for all FAQs', () => {
    for (const faq of STARTER_FAQS) {
      expect(faq.titlePt).toBeTruthy()
      expect(faq.titleEn).toBeTruthy()
      expect(faq.summaryPt).toBeTruthy()
      expect(faq.summaryEn).toBeTruthy()
      expect(faq.contentPt).toBeTruthy()
      expect(faq.contentEn).toBeTruthy()
      expect(faq.keywords.length).toBeGreaterThan(0)

      if (faq.relatedLinks) {
        for (const link of faq.relatedLinks) {
          expect(link.href.startsWith('/')).toBe(true)
          expect(link.labelPt).toBeTruthy()
          expect(link.labelEn).toBeTruthy()
        }
      }
    }
  })
})
