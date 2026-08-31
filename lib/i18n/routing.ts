import { DEFAULT_LOCALE, type Locale } from './config'

const ENGLISH_PREFIX = '/en'

export function pathnameHasEnglishPrefix(pathname: string): boolean {
  return pathname === ENGLISH_PREFIX || pathname.startsWith(`${ENGLISH_PREFIX}/`)
}

export function stripLocalePrefix(pathname: string): string {
  if (!pathnameHasEnglishPrefix(pathname)) return pathname || '/'
  const stripped = pathname.slice(ENGLISH_PREFIX.length)
  return stripped || '/'
}

export function localizePathname(pathname: string, locale: Locale): string {
  const logicalPath = stripLocalePrefix(pathname)
  if (locale === DEFAULT_LOCALE) return logicalPath
  return logicalPath === '/' ? ENGLISH_PREFIX : `${ENGLISH_PREFIX}${logicalPath}`
}

export function localeFromPathname(pathname: string): Locale | null {
  return pathnameHasEnglishPrefix(pathname) ? 'en' : null
}

export function isLocaleRoutingExcluded(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname === '/api' ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  )
}
