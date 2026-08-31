'use client'
import Link from 'next/link'
import { useI18n } from '@/components/i18n'

export function ProfileReturnLink({ fallbackHref }: { fallbackHref: string }) {
  const { t } = useI18n()
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null
      if (referrer?.origin === window.location.origin && referrer.pathname.startsWith('/sao-paulo')) {
        event.preventDefault(); window.history.back()
      }
    } catch { /* deterministic fallback link remains available */ }
  }
  return <Link href={fallbackHref} onClick={handleClick} className="profile-back">← {t('profile.backExplore')}</Link>
}
