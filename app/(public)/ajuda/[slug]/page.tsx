import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'
import { JsonLd } from '@/components/seo/json-ld'
import { getSeoConfig } from '@/modules/seo/config'
import {
  ESSENTIAL_HELP_SLUGS,
  getHelpArticleBySlug,
  getHelpCategoryById,
  getRelatedHelpArticles,
} from '@/modules/help/data'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return ESSENTIAL_HELP_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getHelpArticleBySlug(slug)

  if (!article || !article.slug) {
    return {
      title: 'Artigo não encontrado | velvet.',
    }
  }

  const locale = await getRequestLocale()
  const en = locale === 'en'
  const title = en ? `${article.titleEn} | Help Center | velvet.` : `${article.titlePt} | Central de Ajuda | velvet.`
  const description = en ? article.summaryEn : article.summaryPt

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: buildCanonicalUrl(`/ajuda/${slug}`, undefined, locale),
      languages: buildLanguageAlternates(`/ajuda/${slug}`),
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: buildCanonicalUrl(`/ajuda/${slug}`, undefined, locale),
    },
  }
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = getHelpArticleBySlug(slug)

  if (!article || !article.slug) {
    notFound()
  }

  const locale = await getRequestLocale()
  const en = locale === 'en'
  const siteUrl = getSeoConfig().siteUrl

  const category = getHelpCategoryById(article.categoryId)
  const relatedArticles = getRelatedHelpArticles(article, 3)

  const ajudaHref = localizePathname('/ajuda', locale)
  const comoComecarHref = localizePathname('/como-comecar', locale)
  const canonicalUrl = buildCanonicalUrl(`/ajuda/${slug}`, undefined, locale)

  const articleTitle = en ? article.titleEn : article.titlePt
  const articleSummary = en ? article.summaryEn : article.summaryPt
  const articleContent = en ? article.contentEn : article.contentPt
  const categoryTitle = en ? (category?.titleEn ?? 'Help') : (category?.titlePt ?? 'Ajuda')

  const jsonLdData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: articleTitle,
        description: articleSummary,
        inLanguage: locale,
        url: canonicalUrl,
        publisher: {
          '@type': 'Organization',
          name: 'velvet.',
          url: siteUrl,
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: en ? 'Help Center' : 'Central de Ajuda',
            item: buildCanonicalUrl('/ajuda', undefined, locale),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: categoryTitle,
            item: buildCanonicalUrl('/ajuda', undefined, locale),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: articleTitle,
            item: canonicalUrl,
          },
        ],
      },
    ],
  }

  const paragraphs = articleContent.split('\n\n')

  return (
    <>
      <JsonLd data={jsonLdData} />

      <div className="velvet-help-article-page">
        <div className="velvet-help-container">
          {/* Breadcrumbs: Central de Ajuda → category → article */}
          <nav className="velvet-help-breadcrumbs" aria-label={en ? 'Breadcrumbs' : 'Navegação estrutural'}>
            <ol className="velvet-help-breadcrumbs-list">
              <li className="velvet-help-breadcrumbs-item">
                <Link href={ajudaHref} className="velvet-help-breadcrumbs-link">
                  {en ? 'Help Center' : 'Central de Ajuda'}
                </Link>
              </li>
              <li className="velvet-help-breadcrumbs-separator" aria-hidden="true">
                ›
              </li>
              <li className="velvet-help-breadcrumbs-item">
                <Link href={ajudaHref} className="velvet-help-breadcrumbs-link">
                  {categoryTitle}
                </Link>
              </li>
              <li className="velvet-help-breadcrumbs-separator" aria-hidden="true">
                ›
              </li>
              <li className="velvet-help-breadcrumbs-item is-current" aria-current="page">
                <span>{articleTitle}</span>
              </li>
            </ol>
          </nav>

          {/* Main Article Container */}
          <article className="velvet-help-article-main">
            <header className="velvet-help-article-header">
              <div className="velvet-help-article-meta">
                <span className="velvet-help-article-badge">
                  {category?.icon && <span className="velvet-help-badge-icon">{category.icon}</span>}
                  <span>{categoryTitle}</span>
                </span>
              </div>
              <h1 className="velvet-help-article-title">{articleTitle}</h1>
              <p className="velvet-help-article-lead">{articleSummary}</p>
            </header>

            <div className="velvet-help-article-body">
              {paragraphs.map((p, idx) => (
                <p key={idx} className="velvet-help-article-p">
                  {p}
                </p>
              ))}
            </div>

            {/* In-article contextual resource links */}
            {article.relatedLinks && article.relatedLinks.length > 0 && (
              <div className="velvet-help-article-resources">
                <span className="velvet-help-resources-label">
                  {en ? 'Related resources:' : 'Recursos e atalhos:'}
                </span>
                <div className="velvet-help-resources-list">
                  {article.relatedLinks.map((link, lIdx) => (
                    <Link
                      key={lIdx}
                      href={localizePathname(link.href, locale)}
                      className="velvet-help-resource-link"
                    >
                      {en ? link.labelEn : link.labelPt} <span aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Related Articles Section */}
          {relatedArticles.length > 0 && (
            <section className="velvet-help-related-section" aria-labelledby="related-articles-title">
              <div className="velvet-help-related-header">
                <p className="velvet-overline">
                  {en ? 'CONTINUE READING' : 'CONTINUE LENDO'}
                </p>
                <h2 id="related-articles-title" className="velvet-help-related-title">
                  {en ? 'Related articles' : 'Artigos relacionados'}
                </h2>
              </div>
              <div className="velvet-help-related-grid">
                {relatedArticles.map((rel) => {
                  const relCat = getHelpCategoryById(rel.categoryId)
                  const relCatTitle = en ? relCat?.titleEn : relCat?.titlePt
                  const relTitle = en ? rel.titleEn : rel.titlePt
                  const relSummary = en ? rel.summaryEn : rel.summaryPt
                  const relHref = localizePathname(`/ajuda/${rel.slug}`, locale)

                  return (
                    <Link key={rel.id} href={relHref} className="velvet-help-related-card">
                      <div className="velvet-help-related-cat">
                        <span className="velvet-help-related-icon">{relCat?.icon}</span>
                        <span>{relCatTitle}</span>
                      </div>
                      <h3 className="velvet-help-related-card-title">{relTitle}</h3>
                      <p className="velvet-help-related-card-summary">{relSummary}</p>
                      <span className="velvet-help-related-cta">
                        {en ? 'Read article' : 'Ler artigo'} <span aria-hidden="true">→</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Escalation / Help Banner */}
          <section className="velvet-help-article-footer-banner">
            <div className="velvet-help-banner-card">
              <div className="velvet-help-banner-info">
                <span className="velvet-help-banner-eyebrow">
                  {en ? 'QUESTIONS & SUPPORT' : 'DÚVIDAS & ORIENTAÇÃO'}
                </span>
                <h2>{en ? 'Need more guidance?' : 'Precisa de mais orientações?'}</h2>
                <p>
                  {en
                    ? 'Explore our step-by-step onboarding guide or browse other topics in the Help Center.'
                    : 'Consulte nosso guia passo a passo de onboarding ou explore outros tópicos na Central de Ajuda.'}
                </p>
              </div>
              <div className="velvet-help-banner-actions">
                <Link href={comoComecarHref} className="velvet-help-btn-primary">
                  {en ? 'View guide' : 'Ver guia passo a passo'}
                </Link>
                <Link href={ajudaHref} className="velvet-help-btn-secondary">
                  {en ? 'All topics' : 'Todas as dúvidas'}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
