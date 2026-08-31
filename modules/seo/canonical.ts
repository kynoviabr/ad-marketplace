import { getSeoConfig } from './config'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { localizePathname } from '@/lib/i18n/routing'

/**
 * Builds a deterministic canonical URL for a given route and search parameters.
 *
 * Pagination Semantics (HD-SEO-7):
 * - Page 1 (`page === 1` or omitted): Canonical is the clean geographic base path (e.g. `/sao-paulo`).
 * - Page N (`page >= 2`): Canonical is self-referencing preserving ONLY `?page=N` (e.g. `/sao-paulo?page=2`).
 * - Tracking parameters (`utm_*`, `gclid`, `ref`, etc.) and search filter parameters are stripped from canonical.
 */
export function buildCanonicalUrl(
  pathname: string,
  searchParams?: Record<string, string | string[] | undefined>,
  locale: Locale = DEFAULT_LOCALE
): string {
  const config = getSeoConfig()

  // 1. Normalize pathname: ensure leading slash, remove trailing slash (unless root "/")
  let normalizedPath = pathname.trim()
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`
  }
  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1)
  }

  const base = `${config.siteUrl}${localizePathname(normalizedPath, locale)}`

  if (!searchParams) {
    return base
  }

  // 2. Extract page parameter
  const rawPage = searchParams.page || searchParams['page']
  const pageStr = Array.isArray(rawPage) ? rawPage[0] : rawPage
  const pageNum = pageStr ? parseInt(pageStr, 10) : NaN

  // 3. Page >= 2 retains ?page=N
  if (!isNaN(pageNum) && pageNum >= 2) {
    return `${base}?page=${pageNum}`
  }

  // 4. Page 1 or non-paginated canonicalizes to the clean base path
  return base
}

export function buildLanguageAlternates(pathname: string): Record<string, string> {
  const config = getSeoConfig()
  const ptBR = `${config.siteUrl}${localizePathname(pathname, 'pt-BR')}`
  return {
    'pt-BR': ptBR,
    en: `${config.siteUrl}${localizePathname(pathname, 'en')}`,
    'x-default': ptBR,
  }
}
