'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n/i18n-provider'
import { VelvetAppMoreSheet } from './velvet-app-more-sheet'

interface VelvetAppBottomNavProps {
  role?: 'ADVERTISER' | 'CLIENT' | 'ADMIN' | null
}

export function VelvetAppBottomNav({ role = 'ADVERTISER' }: VelvetAppBottomNavProps) {
  const pathname = usePathname() || ''
  const { t } = useI18n()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  // Secondary advertiser routes where "Mais" indicates context
  const isAdvertiserSecondaryRoute =
    pathname.startsWith('/dashboard/photos') ||
    pathname.startsWith('/dashboard/reviews') ||
    pathname.startsWith('/dashboard/billing') ||
    pathname.startsWith('/dashboard/boosts') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/ajuda')

  // Secondary client routes
  const isClientSecondaryRoute =
    pathname.startsWith('/ajuda') ||
    pathname.startsWith('/seguranca') ||
    pathname.startsWith('/termos') ||
    pathname.startsWith('/privacidade')

  if (role === 'ADMIN') {
    // Admin uses responsive standard admin navigation; bottom nav not rendered
    return null
  }

  if (role === 'CLIENT') {
    const isExploreActive = pathname === '/' || pathname === '/en'
    const isSearchActive = pathname.startsWith('/sao-paulo') || pathname.startsWith('/en/sao-paulo')
    const isAccountActive = pathname === '/cliente'
    const isMoreActive = isMoreOpen || isClientSecondaryRoute

    return (
      <>
        <nav
          className="velvet-app-bottom-nav velvet-app-only"
          aria-label={t('app.nav.title')}
        >
          <Link
            href="/"
            className={`velvet-app-nav-item ${isExploreActive ? 'is-active' : ''}`}
            aria-current={isExploreActive ? 'page' : undefined}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span>{t('app.nav.explore')}</span>
          </Link>

          <Link
            href="/sao-paulo"
            className={`velvet-app-nav-item ${isSearchActive ? 'is-active' : ''}`}
            aria-current={isSearchActive ? 'page' : undefined}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>{t('app.nav.search')}</span>
          </Link>

          <Link
            href="/cliente"
            className={`velvet-app-nav-item ${isAccountActive ? 'is-active' : ''}`}
            aria-current={isAccountActive ? 'page' : undefined}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{t('app.nav.account')}</span>
          </Link>

          <button
            type="button"
            className={`velvet-app-nav-item ${isMoreActive ? 'is-active' : ''}`}
            onClick={() => setIsMoreOpen(true)}
            aria-expanded={isMoreOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
            <span>{t('app.nav.more')}</span>
          </button>
        </nav>

        <VelvetAppMoreSheet
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          role="CLIENT"
        />
      </>
    )
  }

  // Default: ADVERTISER role
  const isHomeActive = pathname === '/dashboard'
  const isAnalyticsActive = pathname.startsWith('/dashboard/analytics')
  const isAgendaActive = pathname.startsWith('/dashboard/availability')
  const isConciergeActive = pathname.startsWith('/dashboard/concierge')
  const isMoreActive = isMoreOpen || isAdvertiserSecondaryRoute

  return (
    <>
      <nav
        className="velvet-app-bottom-nav velvet-app-only"
        aria-label={t('app.nav.title')}
      >
        <Link
          href="/dashboard"
          className={`velvet-app-nav-item ${isHomeActive ? 'is-active' : ''}`}
          aria-current={isHomeActive ? 'page' : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>{t('app.nav.home')}</span>
        </Link>

        <Link
          href="/dashboard/analytics"
          className={`velvet-app-nav-item ${isAnalyticsActive ? 'is-active' : ''}`}
          aria-current={isAnalyticsActive ? 'page' : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>{t('app.nav.analytics')}</span>
        </Link>

        <Link
          href="/dashboard/availability"
          className={`velvet-app-nav-item ${isAgendaActive ? 'is-active' : ''}`}
          aria-current={isAgendaActive ? 'page' : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{t('app.nav.agenda')}</span>
        </Link>

        <Link
          href="/dashboard/concierge"
          className={`velvet-app-nav-item ${isConciergeActive ? 'is-active' : ''}`}
          aria-current={isConciergeActive ? 'page' : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <path d="M12 7v4M10 9h4" />
          </svg>
          <span>{t('app.nav.concierge')}</span>
        </Link>

        <button
          type="button"
          className={`velvet-app-nav-item ${isMoreActive ? 'is-active' : ''}`}
          onClick={() => setIsMoreOpen(true)}
          aria-expanded={isMoreOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
          </svg>
          <span>{t('app.nav.more')}</span>
        </button>
      </nav>

      <VelvetAppMoreSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        role="ADVERTISER"
      />
    </>
  )
}
