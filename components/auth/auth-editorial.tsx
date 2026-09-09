import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'

interface AuthEditorialProps {
  locale?: Locale
}

export async function AuthEditorial({ locale = 'pt-BR' }: AuthEditorialProps) {
  const { t } = await getTranslations()
  const localized = (path: string) => localizePathname(path, locale)

  return (
    <aside className="auth-editorial" aria-label={t('auth.professionals')}>
      {/* Editorial Portraits & Visual Atmosphere */}
      <div className="auth-editorial-visuals" aria-hidden="true" role="presentation">
        <div className="auth-editorial-backdrop" />

        {/* Primary dominant portrait */}
        <div className="auth-portrait-card auth-portrait-card--primary">
          <Image
            src="/images/hero-mural/mural-01.jpg"
            alt=""
            fill
            sizes="(max-width: 899px) 100vw, 360px"
            priority
            className="auth-portrait-img"
          />
          <div className="auth-portrait-overlay" />
        </div>

        {/* Secondary editorial portrait */}
        <div className="auth-portrait-card auth-portrait-card--secondary">
          <Image
            src="/images/hero-mural/mural-04.jpg"
            alt=""
            fill
            sizes="240px"
            className="auth-portrait-img"
          />
          <div className="auth-portrait-overlay" />
        </div>

        {/* Ambient atmospheric portrait fragments */}
        <div className="auth-portrait-card auth-portrait-card--tertiary">
          <Image
            src="/images/hero-mural/mural-12.jpg"
            alt=""
            fill
            sizes="210px"
            className="auth-portrait-img"
          />
          <div className="auth-portrait-overlay" />
        </div>

        <div className="auth-portrait-card auth-portrait-card--quaternary">
          <Image
            src="/images/hero-mural/mural-07.jpg"
            alt=""
            fill
            sizes="180px"
            className="auth-portrait-img"
          />
          <div className="auth-portrait-overlay" />
        </div>
      </div>

      {/* Foreground Campaign & Acquisition Content */}
      <div className="auth-editorial-content">
        <p className="auth-eyebrow">{t('auth.professionals')}</p>

        <h2 className="auth-editorial-headline">
          {t('auth.editorialHeadline').split('\n').map((line, idx) => (
            <span key={idx} className="auth-editorial-headline-line">
              {line}
            </span>
          ))}
        </h2>

        <div className="auth-editorial-support">
          <p>{t('auth.editorialSupport1')}</p>
          <p>{t('auth.editorialSupport2')}</p>
        </div>

        {/* 3 Value Proposition Benefits */}
        <ul className="auth-benefits-list" aria-label={t('auth.professionals')}>
          <li className="auth-benefit-item">
            <span className="auth-benefit-check" aria-hidden="true">✓</span>
            <span>{t('auth.benefit1')}</span>
          </li>
          <li className="auth-benefit-item">
            <span className="auth-benefit-check" aria-hidden="true">✓</span>
            <span>{t('auth.benefit2')}</span>
          </li>
          <li className="auth-benefit-item">
            <span className="auth-benefit-check" aria-hidden="true">✓</span>
            <span>{t('auth.benefit3')}</span>
          </li>
        </ul>

        {/* Primary and Secondary CTA */}
        <div className="auth-editorial-actions">
          <Link
            href={localized('/signup')}
            className="velvet-button velvet-button--primary auth-editorial-primary-cta"
          >
            {t('auth.createProfileCta')} <span aria-hidden="true">→</span>
          </Link>
          <Link
            href={localized('/anuncie')}
            className="auth-editorial-secondary-link"
          >
            {t('auth.howItWorksCta')}
          </Link>
        </div>

        {/* Low-pressure welcoming microcopy */}
        <p className="auth-editorial-microcopy">
          {t('auth.editorialMicrocopy')}
        </p>

        {/* Subtle institutional footer boundary */}
        <div className="auth-editorial-footer">
          <p className="auth-editorial-disclaimer">{t('auth.roleNotice')}</p>
          <span className="auth-editorial-location">{t('auth.location')}</span>
        </div>
      </div>
    </aside>
  )
}
