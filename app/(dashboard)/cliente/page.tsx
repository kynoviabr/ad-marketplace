import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAccount } from '@/modules/auth/dal'
import { logoutAction } from '@/modules/auth/actions'
import { getRequestLocale, getTranslations } from '@/lib/i18n/server'
import { resolveClientVipEntitlement } from '@/modules/clients/dal'
import { LanguageSelector } from '@/components/i18n'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Área do cliente — velvet.',
  robots: 'noindex, nofollow',
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M13.3332 4L5.99984 11.3333L2.6665 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 1.5L9.6 5.9L14 7.5L9.6 9.1L8 13.5L6.4 9.1L2 7.5L6.4 5.9L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default async function ClientAreaPage() {
  const [account, { t }, locale] = await Promise.all([
    getAccount(),
    getTranslations(),
    getRequestLocale(),
  ])

  if (!account) redirect('/login')
  if (account.role !== 'CLIENT') redirect('/dashboard')

  const isEn = locale === 'en'
  const helpHref = isEn ? '/en/ajuda' : '/ajuda'

  const { canAccessVipProfiles } = await resolveClientVipEntitlement(account.id)
  const isVip = canAccessVipProfiles

  return (
    <div className="velvet-dashboard velvet-client-dashboard">
      {/* 1. Compact Header */}
      <header className="velvet-client-header">
        <div className="velvet-client-header-brand">
          <Link href="/" className="velvet-wordmark" aria-label="velvet.">
            velvet<span>.</span>
          </Link>
          <span className="velvet-client-header-divider" aria-hidden="true" />
          <span className="velvet-client-header-tag">{t('client.areaTitle')}</span>
        </div>
        <div className="velvet-client-header-actions">
          <LanguageSelector compact />
          <form action={logoutAction}>
            <button type="submit" className="velvet-client-logout-btn">
              {t('common.logout')}
            </button>
          </form>
        </div>
      </header>

      {/* Page Body Container */}
      <div className="velvet-client-container">
        {/* 2. Welcome Section */}
        <section className="velvet-client-hero" aria-labelledby="client-welcome-title">
          <p className="velvet-client-overline">{t('client.areaTitle')}</p>
          <h1 id="client-welcome-title">{t('client.welcomeTitle')}</h1>
          <p className="velvet-client-hero-lead">{t('client.welcomeSubtitle')}</p>

          {/* 6 & 7. Primary Action & Secondary Action */}
          <div className="velvet-client-hero-actions">
            <Link href="/" className="velvet-client-primary-action">
              <span>{t('client.exploreProfiles')}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href={helpHref} className="velvet-client-secondary-action">
              {t('client.helpCenter')}
            </Link>
          </div>
        </section>

        {/* 3, 4 & 5. Membership Status, Access Summary, and VIP Section */}
        <div className="velvet-client-grid">
          {/* Card 1: Membership Status & Access Summary */}
          <section className="velvet-client-card" aria-labelledby="membership-plan-title">
            <div className="velvet-client-card-head">
              <div className="velvet-client-card-title-group">
                <p className="velvet-client-overline">{t('client.membershipStatus')}</p>
                <h2 id="membership-plan-title">
                  {isVip ? t('client.planVipName') : t('client.planFreeName')}
                </h2>
              </div>
              <span
                className={`velvet-client-status-badge ${
                  isVip ? 'velvet-client-status-badge--vip' : ''
                }`}
              >
                {t('client.activeStatus')}
              </span>
            </div>

            <p className="velvet-client-card-desc">
              {isVip ? t('client.vipAccessDescription') : t('client.freeAccessDescription')}
            </p>

            <div className="velvet-client-card-divider" />

            <div>
              <p className="velvet-client-list-title">{t('client.includedTitle')}</p>
              <ul className="velvet-client-feature-list">
                <li className="velvet-client-feature-item">
                  <CheckIcon />
                  <span>{t('client.featurePublicProfiles')}</span>
                </li>
                <li className="velvet-client-feature-item">
                  <CheckIcon />
                  <span>{t('client.featureApprovedPhotos')}</span>
                </li>
                <li className="velvet-client-feature-item">
                  <CheckIcon />
                  <span>{t('client.featureDirectContact')}</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Card 2: VIP Section */}
          <section className="velvet-client-card" aria-labelledby="vip-section-title">
            <div className="velvet-client-card-head">
              <div className="velvet-client-card-title-group">
                <p className="velvet-client-overline">VIP</p>
                <h2 id="vip-section-title">{t('client.vipCardTitle')}</h2>
              </div>
              <span className="velvet-client-badge-upcoming">
                {t('client.vipUpcomingTag')}
              </span>
            </div>

            <p className="velvet-client-card-desc">{t('client.vipUpcomingText')}</p>

            <div className="velvet-client-card-divider" />

            <div>
              <p className="velvet-client-list-title">{t('client.upgradeTitle')}</p>
              <ul className="velvet-client-feature-list">
                <li className="velvet-client-feature-item velvet-client-feature-item--upcoming">
                  <SparkleIcon />
                  <span>{t('client.vipFeature1')}</span>
                </li>
                <li className="velvet-client-feature-item velvet-client-feature-item--upcoming">
                  <SparkleIcon />
                  <span>{t('client.vipFeature2')}</span>
                </li>
                <li className="velvet-client-feature-item velvet-client-feature-item--upcoming">
                  <SparkleIcon />
                  <span>{t('client.vipFeature3')}</span>
                </li>
              </ul>
            </div>

            <div className="velvet-client-card-footer">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="velvet-client-card-btn-disabled"
              >
                {t('client.vipButtonDisabled')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
