import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { MobileNavigation } from './mobile-navigation'
import { LanguageSelector } from '@/components/i18n'
import { getTranslations } from '@/lib/i18n/server'

export async function PublicHeader() {
  const { t } = await getTranslations()
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <header className="velvet-public-header">
      <Link href="/" className="velvet-public-wordmark" aria-label={t('navigation.home')}>velvet<span>.</span></Link>
      <nav aria-label={t('navigation.main')}>
        <span>São Paulo <i aria-hidden="true">⌄</i></span>
        <Link href="/sao-paulo">{t('navigation.explore')}</Link>
        <Link href="/anuncie">{t('navigation.advertise')}</Link>
        <Link href={isAuthenticated ? '/dashboard' : '/login'}>{isAuthenticated ? t('navigation.account') : t('navigation.login')}</Link>
        <LanguageSelector compact />
      </nav>
      <div className="velvet-public-mobile-nav">
        <MobileNavigation brandName="velvet." isAuthenticated={isAuthenticated} />
      </div>
    </header>
  )
}
