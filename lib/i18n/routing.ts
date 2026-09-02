import { DEFAULT_LOCALE, type Locale } from './config'

const ENGLISH_PREFIX = '/en'

const ENGLISH_PUBLIC_ROUTES: Record<string, string> = {
  '/sobre': '/about',
  '/como-funciona': '/how-it-works',
  '/seguranca': '/safety',
  '/termos': '/terms',
  '/privacidade': '/privacy',
  '/cookies': '/cookies',
  '/acesso-restrito': '/access-restricted',
}

const PORTUGUESE_PUBLIC_ROUTES = Object.fromEntries(
  Object.entries(ENGLISH_PUBLIC_ROUTES).map(([pt, en]) => [en, pt])
)

function mapPublicRoute(pathname: string, routes: Record<string, string>): string {
  const [path, ...suffix] = pathname.split('?')
  const mapped = routes[path] ?? path
  return suffix.length ? `${mapped}?${suffix.join('?')}` : mapped
}

export function pathnameHasEnglishPrefix(pathname: string): boolean {
  return pathname === ENGLISH_PREFIX || pathname.startsWith(`${ENGLISH_PREFIX}/`)
}

export function stripLocalePrefix(pathname: string): string {
  if (!pathnameHasEnglishPrefix(pathname)) return pathname || '/'
  const stripped = pathname.slice(ENGLISH_PREFIX.length)
  return mapPublicRoute(stripped || '/', PORTUGUESE_PUBLIC_ROUTES)
}

export function localizePathname(pathname: string, locale: Locale): string {
  const logicalPath = stripLocalePrefix(pathname)
  if (locale === DEFAULT_LOCALE) return logicalPath
  const englishPath = mapPublicRoute(logicalPath, ENGLISH_PUBLIC_ROUTES)
  return englishPath === '/' ? ENGLISH_PREFIX : `${ENGLISH_PREFIX}${englishPath}`
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
