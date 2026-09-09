/**
 * (auth) route group layout
 * Wraps all auth pages: /signup, /login, /forgot-password, /reset-password, /verify-email
 *
 * Route groups use parentheses — (auth) — so they do NOT appear in the URL.
 */

import Link from 'next/link'
import { LanguageSelector } from '@/components/i18n'
import { getTranslations } from '@/lib/i18n/server'
import { AuthEditorial } from '@/components/auth/auth-editorial'

export const metadata = { robots: { index: false, follow: false } }

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getTranslations()
  return (
    <main className="auth-layout">
      <Link href={locale === 'en' ? '/en' : '/'} className="velvet-wordmark velvet-public-wordmark auth-wordmark" aria-label={t('navigation.home')}>
        velvet<span>.</span>
      </Link>
      <div className="auth-lang-switch">
        <LanguageSelector variant="popover" theme="light" placement="bottom" showLabel />
      </div>
      <AuthEditorial locale={locale} />
      <div className="auth-container">{children}</div>
    </main>
  )
}
