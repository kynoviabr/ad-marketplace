import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'

interface AuthEditorialProps {
  locale?: Locale
}

const AUTH_EDITORIAL_PORTRAITS = [
  { id: 'auth-mural-01', src: '/images/hero-mural/mural-01.jpg', objectPosition: '50% 20%' },
  { id: 'auth-mural-09', src: '/images/hero-mural/mural-09.jpg', objectPosition: '50% 20%' },
  { id: 'auth-mural-17', src: '/images/hero-mural/mural-17.jpg', objectPosition: '50% 25%' },
  { id: 'auth-mural-25', src: '/images/hero-mural/mural-25.jpg', objectPosition: '50% 20%' },
]

export async function AuthEditorial({ locale = 'pt-BR' }: AuthEditorialProps) {
  const { t } = await getTranslations()
  const localized = (path: string) => localizePathname(path, locale)

  return (
    <aside className="auth-editorial" aria-label={t('auth.professionals')}>
      <div className="auth-editorial-grid">
        {/* Left column: Guaranteed contrast copy zone on solid Velvet surface */}
        <div className="auth-editorial-copy-zone">
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

          <p className="auth-editorial-microcopy">
            {t('auth.editorialMicrocopy')}
          </p>
        </div>

        {/* Right column: Vertically moving editorial portrait carousel */}
        <div className="auth-editorial-portrait-zone" aria-hidden="true" role="presentation">
          <div className="auth-single-portrait-frame">
            <div className="auth-portrait-carousel-track">
              {[false, true].map((isClone) => (
                <div
                  key={isClone ? 'clone' : 'primary'}
                  className={`auth-portrait-carousel-group${isClone ? ' auth-portrait-carousel-group--clone' : ''}`}
                >
                  {AUTH_EDITORIAL_PORTRAITS.map((portrait, index) => (
                    <div className="auth-portrait-carousel-slide" key={`${portrait.id}${isClone ? '-clone' : ''}`}>
                      <Image
                        src={portrait.src}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 100vw, (max-width: 1440px) 360px, 420px"
                        priority={!isClone && index === 0}
                        loading={isClone || index > 0 ? 'lazy' : undefined}
                        className="auth-single-portrait-img"
                        style={{ objectPosition: portrait.objectPosition }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
