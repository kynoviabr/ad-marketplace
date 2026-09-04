import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'
import { JsonLd } from '@/components/seo/json-ld'
import { getSeoConfig } from '@/modules/seo/config'
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
      ? 'Answers, guides, and support for professionals on velvet. Discover how to build, verify, and publish your profile with confidence.'
      : 'Respostas, orientações e suporte para profissionais na velvet. Descubra como montar, verificar e publicar seu perfil com segurança.',
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
  const siteUrl = getSeoConfig().siteUrl
  const signupHref = localizePathname('/signup', locale)
  const comoComecarHref = localizePathname('/como-comecar', locale)

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
            <p className="velvet-help-eyebrow">
              {en ? 'PROFESSIONAL SUPPORT & GUIDANCE' : 'SUPORTE E ORIENTAÇÃO PARA PROFISSIONAIS'}
            </p>
            <h1 id="help-hero-title" className="velvet-help-title">
              {en ? 'Help Center' : 'Central de Ajuda'}
            </h1>
            <p className="velvet-help-lead">
              {en
                ? 'Clear answers and detailed guidance for professionals building and managing their independent presence on velvet.'
                : 'Respostas claras e orientações diretas para profissionais que constroem e gerenciam sua presença autônoma na velvet.'}
            </p>

            {/* Quick Links Bar */}
            <div className="velvet-help-quick-links">
              <span className="velvet-help-quick-label">
                {en ? 'Essential links:' : 'Acesso rápido:'}
              </span>
              <Link href={comoComecarHref} className="velvet-help-quick-btn">
                {en ? 'How to start guide →' : 'Como começar na velvet. →'}
              </Link>
              <Link href="/anuncie" className="velvet-help-quick-btn">
                {en ? 'Advertise page →' : 'Anuncie na velvet. →'}
              </Link>
              <Link href={signupHref} className="velvet-help-quick-btn">
                {en ? 'Create account →' : 'Criar minha conta →'}
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

        {/* Secondary Contact / Escalation Banner */}
        <section className="velvet-help-footer-banner">
          <div className="velvet-help-container">
            <div className="velvet-help-banner-card">
              <div className="velvet-help-banner-info">
                <span className="velvet-help-banner-eyebrow">
                  {en ? 'PERSONALIZED ASSISTANCE' : 'ATENDIMENTO INDIVIDUAL'}
                </span>
                <h2>{en ? 'Still have questions?' : 'Ainda tem dúvidas?'}</h2>
                <p>
                  {en
                    ? 'Our team reviews all accounts with care. Check our step-by-step onboarding guide or create your account to begin.'
                    : 'Nossa equipe acompanha o onboarding com atenção aos detalhes. Consulte nosso guia passo a passo ou crie sua conta para começar.'}
                </p>
              </div>
              <div className="velvet-help-banner-actions">
                <Link href={comoComecarHref} className="velvet-help-btn-primary">
                  {en ? 'View guide' : 'Ver guia passo a passo'}
                </Link>
                <Link href={signupHref} className="velvet-help-btn-secondary">
                  {en ? 'Start my profile' : 'Começar meu perfil'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
