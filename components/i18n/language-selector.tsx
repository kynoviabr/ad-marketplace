'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'
import { localizePathname } from '@/lib/i18n/routing'
import { useI18n } from './i18n-provider'

export function LanguageSelector({ compact = false, expanded = false }: { compact?: boolean; expanded?: boolean }) {
  const { locale, t } = useI18n()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  const destinationFor = (nextLocale: Locale) => {
    const localizedPath = localizePathname(pathname, nextLocale)
    return `${localizedPath}${query ? `?${query}` : ''}`
  }

  const persistLocale = (nextLocale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
  }

  return (
    <div className={`velvet-language-selector${compact ? ' is-compact' : ''}${expanded ? ' is-expanded' : ''}`} role="group" aria-label={t('common.language')}>
      <a href={destinationFor('pt-BR')} onClick={() => persistLocale('pt-BR')} aria-current={locale === 'pt-BR' ? 'page' : undefined} lang="pt-BR">{expanded ? t('common.portuguese') : 'PT'}</a>
      {!expanded && <span aria-hidden="true">/</span>}
      <a href={destinationFor('en')} onClick={() => persistLocale('en')} aria-current={locale === 'en' ? 'page' : undefined} lang="en">{expanded ? t('common.english') : 'EN'}</a>
    </div>
  )
}
