'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/components/i18n/i18n-provider'
import { logoutAction } from '@/modules/auth/actions'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'
import { localizePathname } from '@/lib/i18n/routing'

interface VelvetAppMoreSheetProps {
  isOpen: boolean
  onClose: () => void
  role: 'ADVERTISER' | 'CLIENT' | 'ADMIN' | null
}

export function VelvetAppMoreSheet({ isOpen, onClose, role }: VelvetAppMoreSheetProps) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const isEn = locale === 'en'
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const changeLocale = (nextLocale: Locale) => {
    if (nextLocale === locale) return
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
    const localizedPath = localizePathname(pathname, nextLocale)
    const query = searchParams ? searchParams.toString() : ''
    router.push(`${localizedPath}${query ? `?${query}` : ''}`)
    router.refresh()
  }

  const advertiserProfileItems = [
    { href: '/onboarding/seu-perfil', label: t('app.more.myProfile') },
    { href: '/dashboard/photos', label: t('app.more.photos') },
    { href: '/onboarding/onde-atende', label: t('app.more.locations') },
    { href: '/onboarding/verificacao', label: t('app.more.verification') },
    { href: '/dashboard/reviews', label: t('app.more.reviews') },
    { href: '/dashboard/billing', label: t('app.more.billing') },
    { href: '/dashboard/boosts', label: t('app.more.boosts') },
  ]

  const supportItems = [
    { href: isEn ? '/en/ajuda' : '/ajuda', label: t('app.more.help') },
    { href: isEn ? '/en/seguranca' : '/seguranca', label: t('app.more.safety') },
  ]

  const legalItems = [
    { href: isEn ? '/en/termos' : '/termos', label: t('app.more.terms') },
    { href: isEn ? '/en/privacidade' : '/privacidade', label: t('app.more.privacy') },
  ]

  const subtitle = role === 'CLIENT' ? t('app.more.clientSubtitle') : t('app.more.subtitle')

  return (
    <div
      className="velvet-app-sheet-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={sheetRef}
        className="velvet-app-sheet-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="velvet-more-sheet-title"
      >
        <div className="velvet-app-sheet-handle" aria-hidden="true" />

        <div className="velvet-app-sheet-header">
          <div>
            <h2 id="velvet-more-sheet-title" className="velvet-app-sheet-title">
              {t('app.more.title')}
            </h2>
            <p className="velvet-app-sheet-subtitle">{subtitle}</p>
          </div>
          <button
            type="button"
            className="velvet-app-sheet-close"
            onClick={onClose}
            aria-label={t('app.more.close')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="velvet-app-sheet-content" aria-label={t('app.more.title')}>
          {/* Section: Profile & Account */}
          <section className="velvet-app-sheet-group">
            <h3 className="velvet-app-sheet-group-title">{t('app.more.groupProfile')}</h3>
            <div className="velvet-app-sheet-group-card">
              {role === 'ADVERTISER' && advertiserProfileItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="velvet-app-sheet-row"
                  onClick={onClose}
                >
                  <span className="velvet-app-sheet-row-label">{item.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
              <div className="velvet-app-sheet-row velvet-app-sheet-lang-row">
                <span className="velvet-app-sheet-row-label">{t('app.more.language')}</span>
                <div className="velvet-app-sheet-lang-pills" role="group" aria-label={t('app.more.language')}>
                  <button
                    type="button"
                    className={`velvet-app-sheet-lang-pill ${locale === 'pt-BR' ? 'active' : ''}`}
                    onClick={() => changeLocale('pt-BR')}
                    aria-current={locale === 'pt-BR' ? 'true' : undefined}
                  >
                    Português
                  </button>
                  <button
                    type="button"
                    className={`velvet-app-sheet-lang-pill ${locale === 'en' ? 'active' : ''}`}
                    onClick={() => changeLocale('en')}
                    aria-current={locale === 'en' ? 'true' : undefined}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Support */}
          <section className="velvet-app-sheet-group">
            <h3 className="velvet-app-sheet-group-title">{t('app.more.groupSupport')}</h3>
            <div className="velvet-app-sheet-group-card">
              {supportItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="velvet-app-sheet-row"
                  onClick={onClose}
                >
                  <span className="velvet-app-sheet-row-label">{item.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>

          {/* Section: Legal */}
          <section className="velvet-app-sheet-group">
            <h3 className="velvet-app-sheet-group-title">{t('app.more.groupLegal')}</h3>
            <div className="velvet-app-sheet-group-card">
              {legalItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="velvet-app-sheet-row"
                  onClick={onClose}
                >
                  <span className="velvet-app-sheet-row-label">{item.label}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>

          {/* Section: Account / Logout */}
          {role ? (
            <section className="velvet-app-sheet-group velvet-app-sheet-group--account">
              <h3 className="velvet-app-sheet-group-title">{t('app.more.groupAccount')}</h3>
              <div className="velvet-app-sheet-group-card">
                <form action={logoutAction} className="velvet-app-sheet-logout-form">
                  <button type="submit" className="velvet-app-sheet-logout-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {t('app.more.logout')}
                  </button>
                </form>
              </div>
            </section>
          ) : null}
        </nav>
      </div>
    </div>
  )
}
