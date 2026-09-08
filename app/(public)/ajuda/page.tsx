import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'
import { JsonLd } from '@/components/seo/json-ld'
import { HELP_CATEGORIES, STARTER_FAQS } from '@/modules/help/data'
import { HelpCenterSearch } from '@/components/help/help-center-search'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const en = locale === 'en'

  return {
    title: {
      absolute: en
        ? 'Help Center | velvet.'
        : 'Central de Ajuda | velvet.',
    },
    description: en
      ? 'Find answers, practical guidance, and support to create, publish, and care for your profile on Velvet with peace of mind.'
      : 'Encontre respostas, orientações práticas e apoio para criar, publicar e cuidar do seu perfil na Velvet com tranquilidade.',
    alternates: {
      canonical: buildCanonicalUrl('/ajuda', undefined, locale),
      languages: buildLanguageAlternates('/ajuda'),
    },
  }
}

export default async function HelpCenterPage() {
  const locale = await getRequestLocale()
  const en = locale === 'en'
  const canonicalUrl = buildCanonicalUrl('/ajuda', undefined, locale)
  const signupHref = localizePathname('/signup', locale)
  const comoComecarHref = localizePathname('/como-comecar', locale)
  const anuncieHref = localizePathname('/anuncie', locale)

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: en ? 'velvet. Professional Help Center' : 'Central de Ajuda para Profissionais velvet.',
    url: canonicalUrl,
    mainEntity: STARTER_FAQS.map((faq) => ({
      '@type': 'Question',
      name: en ? faq.titleEn : faq.titlePt,
      acceptedAnswer: {
        '@type': 'Answer',
        text: en ? faq.contentEn : faq.contentPt,
      },
    })),
  }

  return (
    <>
      <JsonLd data={jsonLdData} />
      <div className="velvet-help-page">
        {/* Editorial Hero */}
        <section className="velvet-help-hero" aria-labelledby="help-hero-title">
          <div className="velvet-help-container">
            <p className="velvet-overline velvet-help-eyebrow">
              {en ? 'HELP FOR PROFESSIONALS' : 'AJUDA PARA PROFISSIONAIS'}
            </p>
            <h1 id="help-hero-title" className="velvet-help-title">
              {en ? 'Help Center' : 'Central de Ajuda'}
            </h1>
            <p className="velvet-help-lead">
              {en
                ? 'Find answers to create, publish, and care for your profile on Velvet with peace of mind.'
                : 'Encontre respostas para criar, publicar e cuidar do seu perfil na Velvet com mais tranquilidade.'}
            </p>
            <p className="velvet-help-lead-sub">
              {en
                ? 'Whether you are just getting started or need to resolve a question about your account, photos, verification, or profile, start here.'
                : 'Se você está começando agora ou quer resolver alguma dúvida sobre sua conta, fotos, verificação ou perfil, comece por aqui.'}
            </p>

            {/* Quick Links Bar */}
            <div className="velvet-help-quick-links">
              <span className="velvet-help-quick-label">
                {en ? 'Quick access:' : 'Acesso rápido:'}
              </span>
              <Link href={comoComecarHref} className="velvet-help-quick-btn">
                {en ? 'How to start on Velvet →' : 'Como começar na Velvet →'}
              </Link>
              <Link href={anuncieHref} className="velvet-help-quick-btn">
                {en ? 'Velvet for professionals →' : 'Conhecer a Velvet para profissionais →'}
              </Link>
              <Link href={signupHref} className="velvet-help-quick-btn">
                {en ? 'Create my account →' : 'Criar minha conta →'}
              </Link>
            </div>
          </div>
        </section>

        {/* Search, Categories and Interactive Accordion */}
        <section className="velvet-help-content" aria-label={en ? 'Help Articles' : 'Artigos de Ajuda'}>
          <div className="velvet-help-container">
            <HelpCenterSearch
              categories={HELP_CATEGORIES}
              articles={STARTER_FAQS}
              locale={locale}
            />
          </div>
        </section>

        {/* Secondary Guidance / Closing Banner */}
        <section className="velvet-help-footer-banner">
          <div className="velvet-help-container">
            <div className="velvet-help-banner-card">
              <div className="velvet-help-banner-info">
                <span className="velvet-overline velvet-overline--inverse velvet-help-banner-eyebrow">
                  {en ? 'KEEP EXPLORING' : 'CONTINUE POR AQUI'}
                </span>
                <h2>{en ? 'Still have questions?' : 'Ainda ficou com alguma dúvida?'}</h2>
                <p>
                  {en
                    ? 'You can explore our step-by-step guide to learn each step at your own pace, or start your profile and follow the guidance along the way.'
                    : 'Você pode consultar nosso guia passo a passo para conhecer cada etapa com calma ou começar seu perfil e seguir as orientações ao longo do processo.'}
                </p>
              </div>
              <div className="velvet-help-banner-actions">
                <Link href={comoComecarHref} className="velvet-help-btn-primary">
                  {en ? 'View step-by-step guide →' : 'Ver guia passo a passo →'}
                </Link>
                <Link href={signupHref} className="velvet-help-btn-secondary">
                  {en ? 'Start my profile →' : 'Começar meu perfil →'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
