'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSelector } from '@/components/i18n/language-selector'
import { useI18n } from '@/components/i18n/i18n-provider'
import { localizePathname } from '@/lib/i18n/routing'
import { isPublicNavigationItemActive } from './public-navigation-state'

export function PublicDesktopNavigation({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname()
  const { locale, t } = useI18n()
  const accountPath = isAuthenticated ? '/dashboard' : '/login'
  const localized = (path: string) => localizePathname(path, locale)

  return (
    <nav className="velvet-public-desktop-navigation" aria-label={t('navigation.main')}>
      <div className="velvet-public-primary-nav">
        <Link
          href={localized('/sao-paulo')}
          className="velvet-link velvet-link--navigation velvet-public-nav-link"
          aria-current={isPublicNavigationItemActive(pathname, 'explore', isAuthenticated) ? 'page' : undefined}
        >
          {t('navigation.explore')}
        </Link>
        <Link
          href={localized('/anuncie')}
          className="velvet-link velvet-link--navigation velvet-public-nav-link"
          aria-current={isPublicNavigationItemActive(pathname, 'advertise', isAuthenticated) ? 'page' : undefined}
        >
          {t('navigation.advertise')}
        </Link>
      </div>

      <div className="velvet-public-utility-nav">
        <span className="velvet-public-location-context">São Paulo</span>
        <LanguageSelector compact />
        <Link
          href={localized(accountPath)}
          className="velvet-link velvet-link--navigation velvet-public-nav-link velvet-public-account-link"
          aria-current={isPublicNavigationItemActive(pathname, 'account', isAuthenticated) ? 'page' : undefined}
        >
          {isAuthenticated ? t('navigation.account') : t('navigation.login')}
        </Link>
      </div>
    </nav>
  )
}
