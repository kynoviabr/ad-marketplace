import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'

interface AuthEditorialProps {
  locale?: Locale
}

const COLUMN_ONE_PORTRAITS = [
  { id: 'col1-01', src: '/images/hero-mural/mural-01.jpg', objectPosition: '50% 20%' },
  { id: 'col1-03', src: '/images/hero-mural/mural-03.jpg', objectPosition: '50% 20%' },
  { id: 'col1-05', src: '/images/hero-mural/mural-05.jpg', objectPosition: '50% 25%' },
  { id: 'col1-07', src: '/images/hero-mural/mural-07.jpg', objectPosition: '50% 20%' },
  { id: 'col1-09', src: '/images/hero-mural/mural-09.jpg', objectPosition: '50% 20%' },
]

const COLUMN_TWO_PORTRAITS = [
  { id: 'col2-02', src: '/images/hero-mural/mural-02.jpg', objectPosition: '50% 20%' },
  { id: 'col2-04', src: '/images/hero-mural/mural-04.jpg', objectPosition: '50% 20%' },
  { id: 'col2-06', src: '/images/hero-mural/mural-06.jpg', objectPosition: '50% 25%' },
  { id: 'col2-08', src: '/images/hero-mural/mural-08.jpg', objectPosition: '50% 20%' },
  { id: 'col2-10', src: '/images/hero-mural/mural-10.jpg', objectPosition: '50% 20%' },
]

export async function AuthEditorial({ locale = 'pt-BR' }: AuthEditorialProps) {
  const { t } = await getTranslations()
  const localized = (path: string) => localizePathname(path, locale)

  return (
    <aside className="auth-editorial" aria-label={t('auth.professionals')}>
      <div className="auth-editorial-grid">
        {/* Subcoluna A: Copy Zone (Guaranteed solid surface contrast) */}
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

        {/* Subcoluna B: Dual Vertical Carousel Stream (Continuous vertical flow) */}
        <div className="auth-editorial-stream" aria-hidden="true" role="presentation">
          {/* Column 1: slow downward drift */}
          <div className="auth-stream-col auth-stream-col--down">
            <div className="auth-stream-track">
              {[false, true].map((isClone) => (
                <div
                  key={isClone ? 'col1-clone' : 'col1-main'}
                  className="auth-stream-group"
                  aria-hidden={isClone ? 'true' : undefined}
                >
                  {COLUMN_ONE_PORTRAITS.map((p, idx) => (
                    <div className="auth-stream-card" key={`${p.id}-${isClone ? 'c' : 'm'}`}>
                      <Image
                        src={p.src}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 120px, 140px"
                        priority={!isClone && idx === 0}
                        loading={isClone || idx > 0 ? 'lazy' : undefined}
                        className="auth-stream-img"
                        style={{ objectPosition: p.objectPosition }}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: slow upward drift */}
          <div className="auth-stream-col auth-stream-col--up">
            <div className="auth-stream-track">
              {[false, true].map((isClone) => (
                <div
                  key={isClone ? 'col2-clone' : 'col2-main'}
                  className="auth-stream-group"
                  aria-hidden={isClone ? 'true' : undefined}
                >
                  {COLUMN_TWO_PORTRAITS.map((p, idx) => (
                    <div className="auth-stream-card" key={`${p.id}-${isClone ? 'c' : 'm'}`}>
                      <Image
                        src={p.src}
                        alt=""
                        fill
                        sizes="(max-width: 900px) 120px, 140px"
                        loading="lazy"
                        className="auth-stream-img"
                        style={{ objectPosition: p.objectPosition }}
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
