'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useI18n } from '@/components/i18n/i18n-provider'
import { logoutAction } from '@/modules/auth/actions'

interface VelvetAppMoreSheetProps {
  isOpen: boolean
  onClose: () => void
  role: 'ADVERTISER' | 'CLIENT' | 'ADMIN' | null
}

export function VelvetAppMoreSheet({ isOpen, onClose, role }: VelvetAppMoreSheetProps) {
  const { t, locale } = useI18n()
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

  const advertiserItems = [
    { href: '/onboarding/seu-perfil', label: t('app.more.myProfile'), icon: 'profile' },
    { href: '/dashboard/photos', label: t('app.more.photos'), icon: 'photos' },
    { href: '/onboarding/onde-atende', label: t('app.more.locations'), icon: 'locations' },
    { href: '/onboarding/verificacao', label: t('app.more.verification'), icon: 'verification' },
    { href: '/dashboard/reviews', label: t('app.more.reviews'), icon: 'reviews' },
    { href: '/dashboard/billing', label: t('app.more.billing'), icon: 'billing' },
    { href: '/dashboard/boosts', label: t('app.more.boosts'), icon: 'boosts' },
    { href: isEn ? '/en/ajuda' : '/ajuda', label: t('app.more.help'), icon: 'help' },
  ]

  const clientItems = [
    { href: isEn ? '/en/ajuda' : '/ajuda', label: t('app.more.help'), icon: 'help' },
    { href: isEn ? '/en/seguranca' : '/seguranca', label: t('app.more.safety'), icon: 'safety' },
    { href: isEn ? '/en/termos' : '/termos', label: t('app.more.terms'), icon: 'terms' },
    { href: isEn ? '/en/privacidade' : '/privacidade', label: t('app.more.privacy'), icon: 'privacy' },
  ]

  const items = role === 'CLIENT' ? clientItems : advertiserItems
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

        <nav className="velvet-app-sheet-grid" aria-label={t('app.more.title')}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="velvet-app-sheet-item"
              onClick={onClose}
            >
              <span className="velvet-app-sheet-item-label">{item.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </nav>

        {role ? (
          <div className="velvet-app-sheet-footer">
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
        ) : null}
      </div>
    </div>
  )
}
