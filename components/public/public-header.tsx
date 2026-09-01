import Link from 'next/link'
import { MobileNavigation } from './mobile-navigation'
import { PublicDesktopNavigation } from './public-desktop-navigation'
import { getPublicIsAuthenticated } from './public-auth-state'
import { getTranslations } from '@/lib/i18n/server'

export async function PublicHeader() {
  const [{ locale, t }, isAuthenticated] = await Promise.all([
    getTranslations(),
    getPublicIsAuthenticated(),
  ])

  return (
    <header className="velvet-public-header">
      <Link href={locale === 'en' ? '/en' : '/'} className="velvet-public-wordmark" aria-label={t('navigation.home')}>
        velvet.
      </Link>
      <PublicDesktopNavigation isAuthenticated={isAuthenticated} />
      <div className="velvet-public-mobile-nav">
        <MobileNavigation isAuthenticated={isAuthenticated} />
      </div>
    </header>
  )
}
