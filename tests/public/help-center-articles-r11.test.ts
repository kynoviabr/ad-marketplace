import { describe, expect, it } from 'vitest'
import {
  ESSENTIAL_HELP_SLUGS,
  getHelpArticleBySlug,
  getHelpCategoryById,
  getRelatedHelpArticles,
  isEssentialHelpSlug,
} from '@/modules/help/data'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'
import { isReservedSlug } from '@/modules/seo/constants'

describe('R11.3B Essential Help Articles', () => {
  it('defines exactly the 6 required essential article slugs', () => {
    expect(ESSENTIAL_HELP_SLUGS).toHaveLength(6)
    expect(ESSENTIAL_HELP_SLUGS).toEqual([
      'como-publicar-meu-perfil',
      'verificacao-de-identidade-e-maioridade',
      'o-que-fica-publico-e-o-que-fica-privado',
      'fotos-e-videos-envio-aprovacao-e-limites',
      'perfil-publico-vs-vip',
      'como-pausar-ou-reativar-meu-perfil',
    ])
  })

  it('correctly validates essential slugs with isEssentialHelpSlug', () => {
    for (const slug of ESSENTIAL_HELP_SLUGS) {
      expect(isEssentialHelpSlug(slug)).toBe(true)
    }
    expect(isEssentialHelpSlug('non-existent-article')).toBe(false)
    expect(isEssentialHelpSlug('random-slug')).toBe(false)
  })

  it('retrieves each essential article by its exact slug with valid bilingual content', () => {
    for (const slug of ESSENTIAL_HELP_SLUGS) {
      const article = getHelpArticleBySlug(slug)
      expect(article).toBeDefined()
      expect(article?.slug).toBe(slug)
      expect(article?.titlePt).toBeTruthy()
      expect(article?.titleEn).toBeTruthy()
      expect(article?.summaryPt).toBeTruthy()
      expect(article?.summaryEn).toBeTruthy()
      expect(article?.contentPt).toBeTruthy()
      expect(article?.contentEn).toBeTruthy()
      expect(article?.keywords.length).toBeGreaterThan(0)

      // Must belong to a valid registered category
      const category = getHelpCategoryById(article!.categoryId)
      expect(category).toBeDefined()
      expect(category?.titlePt).toBeTruthy()
      expect(category?.titleEn).toBeTruthy()
    }
  })

  it('returns undefined for non-existent or unslugged FAQs', () => {
    expect(getHelpArticleBySlug('invalid-slug')).toBeUndefined()
    expect(getHelpArticleBySlug('como-funcionam-avaliacoes')).toBeUndefined()
  })

  it('returns valid related articles for all 6 essential articles', () => {
    for (const slug of ESSENTIAL_HELP_SLUGS) {
      const article = getHelpArticleBySlug(slug)!
      const related = getRelatedHelpArticles(article, 3)

      expect(related.length).toBeGreaterThan(0)
      expect(related.length).toBeLessThanOrEqual(3)

      // Related articles must not include the current article
      expect(related.some((r) => r.id === article.id)).toBe(false)

      // All related articles must have slugs
      for (const rel of related) {
        expect(rel.slug).toBeDefined()
        expect(isEssentialHelpSlug(rel.slug!)).toBe(true)
      }
    }
  })

  it('generates proper SEO canonical URLs and language alternates for article routes', () => {
    const slug = 'como-publicar-meu-perfil'
    const ptCanonical = buildCanonicalUrl(`/ajuda/${slug}`, undefined, 'pt-BR')
    const enCanonical = buildCanonicalUrl(`/ajuda/${slug}`, undefined, 'en')
    const alternates = buildLanguageAlternates(`/ajuda/${slug}`)

    expect(ptCanonical).toContain(`/ajuda/${slug}`)
    expect(ptCanonical).not.toContain('/en/')
    expect(enCanonical).toContain(`/en/ajuda/${slug}`)

    expect(alternates['pt-BR']).toContain(`/ajuda/${slug}`)
    expect(alternates['en']).toContain(`/en/ajuda/${slug}`)
    expect(alternates['x-default']).toBe(alternates['pt-BR'])
  })

  it('protects "ajuda" top-level route from collision with dynamic city slugs', () => {
    expect(isReservedSlug('ajuda')).toBe(true)
  })
})
