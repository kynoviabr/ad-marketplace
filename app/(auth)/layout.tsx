/**
 * (auth) route group layout
 * Wraps all auth pages: /signup, /login, /forgot-password, /reset-password, /verify-email
 *
 * Route groups use parentheses — (auth) — so they do NOT appear in the URL.
 */

import Link from 'next/link'
import { LanguageSelector } from '@/components/i18n'
import { getTranslations } from '@/lib/i18n/server'

export const metadata = { robots: { index: false, follow: false } }

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getTranslations()
  return (
    <main className="auth-layout">
      <Link href="/" className="velvet-wordmark auth-wordmark" aria-label={t('navigation.home')}>
        velvet<span>.</span>
      </Link>
      <div className="auth-lang-switch">
        <LanguageSelector />
      </div>
      <aside className="auth-editorial" aria-hidden="true">
        <p>{t('auth.professionals')}</p>
        <strong>{t('auth.editorial').split('\n').map((line) => <span key={line}>{line}<br /></span>)}</strong>
        <span>{t('auth.location')}</span>
      </aside>
      <div className="auth-container">{children}</div>
    </main>
  )
}
