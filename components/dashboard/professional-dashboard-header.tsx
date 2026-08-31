import Link from 'next/link'
import { logoutAction } from '@/modules/auth/actions'
import { LanguageSelector } from '@/components/i18n'
import { getTranslations } from '@/lib/i18n/server'

export async function ProfessionalDashboardHeader({ activeHref }: { activeHref: string }) {
  const { t } = await getTranslations()
  const nav = [
    [t('dashboard.overview'), '/dashboard'], [t('dashboard.myProfile'), '/onboarding/seu-perfil'], [t('dashboard.photos'), '/dashboard/photos'],
    [t('dashboard.locations'), '/onboarding/onde-atende'], [t('dashboard.verification'), '/onboarding/verificacao'], ['Analytics', '/dashboard/analytics'],
  ] as const
  return <header className="velvet-dashboard-header">
    <Link href="/dashboard" className="velvet-wordmark" aria-label={`Velvet — ${t('dashboard.overview')}`}>velvet<span>.</span></Link>
    <nav aria-label={t('dashboard.navigation')}>{nav.map(([label, href]) => <Link key={href} href={href} aria-current={href === activeHref ? 'page' : undefined}>{label}</Link>)}</nav>
    <LanguageSelector compact />
    <form action={logoutAction}><button type="submit">{t('common.logout')}</button></form>
  </header>
}
