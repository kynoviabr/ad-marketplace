import Link from 'next/link'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'

function VelvetTrustVMark({ size = 'large' }: { size?: 'large' | 'small' }) {
  return (
    <div
      className={`velvet-trust-v-mark velvet-trust-v-mark--${size}`}
      aria-hidden="true"
    >
      <span className="velvet-brand-monogram">v</span>
    </div>
  )
}

function DirectContactIcon() {
  return (
    <div className="velvet-trust-contact-icon" aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.5 11.5L11.5 4.5M11.5 4.5H6.5M11.5 4.5V9.5" />
      </svg>
    </div>
  )
}

export async function HomeTrustSection() {
  const { locale, t } = await getTranslations()

  return (
    <section id="sobre" className="velvet-home-trust" aria-labelledby="home-trust-heading">
      <div className="velvet-trust-intro">
        <p className="velvet-overline">{t('home.trustOverline')}</p>
        <VelvetTrustVMark size="large" />
        <h2 id="home-trust-heading">
          {t('home.trustTitle').split('\n').map((line, index) => (
            <span key={line}>
              {index > 0 && <br />}
              {line}
            </span>
          ))}
        </h2>
        <p className="velvet-trust-lead">{t('home.trustDescription')}</p>
      </div>

      <div className="velvet-trust-grid">
        {/* Trust Point 1: Identidade verificada */}
        <article className="velvet-trust-item">
          <VelvetTrustVMark size="small" />
          <h3>{t('home.identityVerified')}</h3>
          <p>{t('home.identityVerifiedDesc')}</p>
        </article>

        {/* Trust Point 2: Maioridade confirmada */}
        <article className="velvet-trust-item">
          <VelvetTrustVMark size="small" />
          <h3>{t('home.ageConfirmed')}</h3>
          <p>{t('home.ageConfirmedDesc')}</p>
        </article>

        {/* Trust Point 3: Contato direto (Directional non-intermediary icon, NOT the 'v' mark) */}
        <article className="velvet-trust-item">
          <DirectContactIcon />
          <h3>{t('home.directContact')}</h3>
          <p>{t('home.directContactDesc')}</p>
        </article>
      </div>

      <div className="velvet-trust-cta-wrap">
        <Link
          href={localizePathname('/como-funciona', locale)}
          className="velvet-trust-cta"
        >
          <span>{t('home.howVerificationWorks')}</span>
          <span className="velvet-trust-cta-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}

