import { describe, expect, it } from 'vitest'
import { HELP_CATEGORIES, STARTER_FAQS } from '@/modules/help/data'
import { RESERVED_TOP_LEVEL_SLUGS, isReservedSlug } from '@/modules/seo/constants'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('R11.3A Help Center Foundation', () => {
  const root = process.cwd()
  const read = (relPath: string) => readFileSync(join(root, relPath), 'utf8')

  it('reserves "ajuda" top-level slug to protect against dynamic city routes', () => {
    expect(RESERVED_TOP_LEVEL_SLUGS.has('ajuda')).toBe(true)
    expect(isReservedSlug('ajuda')).toBe(true)
    expect(isReservedSlug('AJUDA')).toBe(true)
  })

  it('defines the required 12 support categories with user-friendly labels', () => {
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

    const prime = HELP_CATEGORIES.find((c) => c.id === 'primeiros-passos')
    expect(prime?.titlePt).toBe('Primeiros passos')

    const vipCat = HELP_CATEGORIES.find((c) => c.id === 'clientes-vip')
    expect(vipCat?.titlePt).toBe('Quem pode ver meu perfil')

    const planoCat = HELP_CATEGORIES.find((c) => c.id === 'planos')
    expect(planoCat?.titlePt).toBe('Plano e publicação')

    const contatoCat = HELP_CATEGORIES.find((c) => c.id === 'servicos-e-regioes')
    expect(contatoCat?.titlePt).toBe('Contato e regiões')
  })

  it('includes starter FAQs covering key platform invariants with clean user language', () => {
    expect(STARTER_FAQS.length).toBeGreaterThanOrEqual(12)

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

    // Public vs VIP (friendly wording, no leaked enums)
    const vipFaq = STARTER_FAQS.find((f) => f.id === 'public-vs-vip-only')
    expect(vipFaq).toBeDefined()
    expect(vipFaq?.contentPt).toContain('Perfil Público')
    expect(vipFaq?.contentPt).toContain('Assinantes VIP')
    expect(vipFaq?.contentPt).not.toContain('VIP_ONLY')

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

  it('verifies help center page hero, category headings and closing guidance copy', () => {
    const pageSource = read('app/(public)/ajuda/page.tsx')
    expect(pageSource).toContain('AJUDA PARA PROFISSIONAIS')
    expect(pageSource).toContain('HELP FOR PROFESSIONALS')
    expect(pageSource).toContain('Central de Ajuda')
    expect(pageSource).toContain('Help Center')
    expect(pageSource).toContain('Encontre respostas para criar, publicar e cuidar do seu perfil na Velvet com mais tranquilidade.')
    expect(pageSource).toContain('Acesso rápido:')
    expect(pageSource).toContain('Como começar na Velvet →')
    expect(pageSource).toContain('Conhecer a Velvet para profissionais →')
    expect(pageSource).toContain('Criar minha conta →')

    // Banned terms removed from page
    expect(pageSource).not.toContain('presença autônoma')
    expect(pageSource).not.toContain('ATENDIMENTO INDIVIDUAL')
    expect(pageSource).not.toContain('onboarding')

    // Search component verifies navigation heading
    const searchSource = read('components/help/help-center-search.tsx')
    expect(searchSource).toContain('Encontre o que você precisa')
    expect(searchSource).toContain('Find what you need')
    expect(searchSource).not.toContain('Categorias de atendimento')
  })

  it('verifies complete removal of banned product and technical jargon across help center data', () => {
    const dataSource = read('modules/help/data.ts')
    expect(dataSource).not.toContain('presença autônoma')
    expect(dataSource).not.toContain('direito de publicação')
    expect(dataSource).not.toContain('CAN_PUBLISH_PROFILE')
    expect(dataSource).not.toContain('VIP_ONLY')
    expect(dataSource).not.toContain('separação absoluta')
    expect(dataSource).not.toContain('total controle')
    expect(dataSource).not.toContain('depoimentos autênticos')
    expect(dataSource).not.toContain('critérios necessários')
    expect(dataSource).not.toContain('garantir padrão editorial')
    expect(dataSource).not.toContain('onboarding')
  })
})
