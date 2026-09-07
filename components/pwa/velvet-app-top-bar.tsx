'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/components/i18n/i18n-provider'
import { VelvetAppMoreSheet } from './velvet-app-more-sheet'

interface VelvetAppTopBarProps {
  role?: 'ADVERTISER' | 'CLIENT' | 'ADMIN' | null
}

export function VelvetAppTopBar({ role = 'ADVERTISER' }: VelvetAppTopBarProps) {
  const pathname = usePathname() || ''
  const { t } = useI18n()
  const [isMoreOpen, setIsMoreOpen] = useState(false)

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
  } else if (pathname.startsWith('/onboarding/voce')) {
    sectionTitle = t('onboarding.step.you')
  } else if (pathname.startsWith('/onboarding/seu-perfil') || pathname.startsWith('/onboarding/profile')) {
    sectionTitle = t('onboarding.step.profile')
  } else if (pathname.startsWith('/onboarding/onde-atende')) {
    sectionTitle = t('onboarding.step.locations')
  } else if (pathname.startsWith('/onboarding/verificacao') || pathname.startsWith('/onboarding/verification')) {
    sectionTitle = t('onboarding.step.verification')
  } else if (pathname.startsWith('/onboarding/fotos') || pathname.startsWith('/onboarding/media')) {
    sectionTitle = t('onboarding.step.photos')
  } else if (pathname.startsWith('/onboarding/revisar')) {
    sectionTitle = t('onboarding.step.review')
  } else if (pathname.startsWith('/onboarding')) {
    sectionTitle = t('onboarding.step.profile')
  }

  // Desktop App Mode navigation items (visible at >= 1024px in standalone)
  interface DesktopNavItem {
    href: string
    label: string
    isActive: boolean
  }

  const desktopNavItems: DesktopNavItem[] = []
  if (role === 'ADVERTISER') {
    desktopNavItems.push(
      { href: '/dashboard', label: t('app.nav.home'), isActive: pathname === '/dashboard' },
      { href: '/dashboard/analytics', label: t('app.nav.analytics'), isActive: pathname.startsWith('/dashboard/analytics') },
      { href: '/dashboard/availability', label: t('app.nav.availability'), isActive: pathname.startsWith('/dashboard/availability') },
      { href: '/dashboard/concierge', label: t('app.nav.concierge'), isActive: pathname.startsWith('/dashboard/concierge') }
    )
  } else if (role === 'CLIENT') {
    desktopNavItems.push(
      { href: '/', label: t('app.nav.explore'), isActive: pathname === '/' },
      { href: '/?buscar=1', label: t('app.nav.search'), isActive: pathname === '/?buscar=1' },
      { href: '/cliente', label: t('app.nav.account'), isActive: pathname === '/cliente' }
    )
  } else if (role === 'ADMIN') {
    desktopNavItems.push(
      { href: '/admin', label: 'Painel', isActive: pathname === '/admin' },
      { href: '/admin/reports', label: 'Denúncias', isActive: pathname.startsWith('/admin/reports') },
      { href: '/admin/moderation', label: 'Moderação', isActive: pathname.startsWith('/admin/moderation') }
    )
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

      {desktopNavItems.length > 0 ? (
        <nav className="velvet-app-top-bar-nav" aria-label={t('dashboard.navigation')}>
          {desktopNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`velvet-app-top-nav-link ${item.isActive ? 'active' : ''}`}
              aria-current={item.isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`velvet-app-top-nav-link velvet-app-top-nav-more-btn ${isMoreOpen ? 'active' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={isMoreOpen}
            aria-label={t('app.nav.more')}
          >
            <span>{t('app.nav.more')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </nav>
      ) : null}

      <div className="velvet-app-top-bar-right">
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className="velvet-app-top-bar-menu-btn"
          aria-label={t('app.nav.more')}
          aria-haspopup="dialog"
          aria-expanded={isMoreOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
          </svg>
        </button>
      </div>

      <VelvetAppMoreSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} role={role} />
    </header>
  )
}
