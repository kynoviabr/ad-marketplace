'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSelector } from '@/components/i18n'
import { logoutAction } from '@/modules/auth/actions'
import { useI18n } from '@/components/i18n/i18n-provider'

interface VelvetAppTopBarProps {
  role?: 'ADVERTISER' | 'CLIENT' | 'ADMIN' | null
}

export function VelvetAppTopBar({ role = 'ADVERTISER' }: VelvetAppTopBarProps) {
  const pathname = usePathname() || ''
  const { t } = useI18n()

  const homeHref = role === 'CLIENT' ? '/cliente' : role === 'ADMIN' ? '/admin' : '/dashboard'

  // Contextual page title in app mode
  let sectionTitle = ''
  if (pathname === '/dashboard') {
    sectionTitle = t('dashboard.overview')
  } else if (pathname.startsWith('/dashboard/analytics')) {
    sectionTitle = 'Analytics'
  } else if (pathname.startsWith('/dashboard/availability')) {
    sectionTitle = t('dashboard.availability')
  } else if (pathname.startsWith('/dashboard/concierge')) {
    sectionTitle = t('dashboard.concierge')
  } else if (pathname.startsWith('/dashboard/photos')) {
    sectionTitle = t('dashboard.photos')
  } else if (pathname.startsWith('/dashboard/reviews')) {
    sectionTitle = t('profile.reviews')
  } else if (pathname.startsWith('/dashboard/billing')) {
    sectionTitle = 'Plano'
  } else if (pathname.startsWith('/dashboard/boosts')) {
    sectionTitle = 'Destaques'
  } else if (pathname === '/cliente') {
    sectionTitle = t('client.areaTitle')
  }

  return (
    <header className="velvet-app-top-bar velvet-app-only">
      <div className="velvet-app-top-bar-left">
        <Link href={homeHref} className="velvet-wordmark" aria-label="Velvet">
          velvet<span>.</span>
        </Link>
        {sectionTitle ? (
          <>
            <span className="velvet-app-top-bar-sep" aria-hidden="true">/</span>
            <span className="velvet-app-top-bar-context">{sectionTitle}</span>
          </>
        ) : null}
      </div>

      <div className="velvet-app-top-bar-right">
        <LanguageSelector compact />
        {role ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="velvet-app-top-bar-logout"
              title={t('common.logout')}
              aria-label={t('common.logout')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </form>
        ) : null}
      </div>
    </header>
  )
}
