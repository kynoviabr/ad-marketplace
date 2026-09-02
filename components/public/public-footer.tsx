import Link from 'next/link'
import { LanguageSelector } from '@/components/i18n/language-selector'
import { localizePathname } from '@/lib/i18n/routing'
import { getTranslations } from '@/lib/i18n/server'
import { getPublicIsAuthenticated } from './public-auth-state'
import { CookiePreferencesButton } from '@/components/compliance/cookie-preferences-button'

export async function PublicFooter() {
  const [{ locale, t }, isAuthenticated] = await Promise.all([
    getTranslations(),
    getPublicIsAuthenticated(),
  ])
  const currentYear = new Date().getFullYear()
  const localized = (path: string) => localizePathname(path, locale)
  const accountPath = isAuthenticated ? '/dashboard' : '/login'

  return (
    <footer className="velvet-public-footer">
      <div className="velvet-public-footer-grid">
        <section className="velvet-public-footer-brand" aria-label={t('footer.brand')}>
          <Link href={localized('/')} className="velvet-public-wordmark" aria-label={t('navigation.home')}>
            velvet.
          </Link>
          <p>{t('footer.description')}</p>
        </section>

        <nav className="velvet-public-footer-group" aria-label={t('footer.discover')}>
          <h2>{t('footer.discover')}</h2>
          <Link href={localized('/sobre')}>{t('footer.about')}</Link>
          <Link href={localized('/como-funciona')}>{t('footer.howItWorks')}</Link>
          <Link href={localized('/sao-paulo')}>{t('navigation.explore')}</Link>
          <span>São Paulo</span>
        </nav>

        <nav className="velvet-public-footer-group" aria-label={t('footer.professionals')}>
          <h2>{t('footer.professionals')}</h2>
          <Link href={localized('/anuncie')}>{t('navigation.advertise')}</Link>
          <Link href={localized(accountPath)}>
            {isAuthenticated ? t('navigation.account') : t('navigation.login')}
          </Link>
        </nav>

        <nav className="velvet-public-footer-group velvet-public-footer-trust" aria-label={t('footer.trustLegal')}>
          <h2>{t('footer.trustLegal')}</h2>
          <Link href={localized('/seguranca')}>{t('footer.security')}</Link>
          <Link href={localized('/termos')}>{t('footer.terms')}</Link>
          <Link href={localized('/privacidade')}>{t('footer.privacy')}</Link>
          <Link href={localized('/cookies')}>{t('footer.cookies')}</Link>
          <CookiePreferencesButton label={t('footer.cookiePreferences')} />
          <LanguageSelector />
        </nav>
      </div>

      <div className="velvet-public-footer-legal">
        <small>{t('footer.adultsOnly', { year: currentYear })}</small>
        <small>{t('footer.verificationScope')}</small>
      </div>
    </footer>
  )
}
