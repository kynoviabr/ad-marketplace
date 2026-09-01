import type { Locale } from '@/lib/i18n/config'
import { localizePathname } from '@/lib/i18n/routing'

export function buildSearchPageHref(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
  locale: Locale
): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page' || value === undefined) continue
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item))
    else query.set(key, value)
  }
  if (page > 1) query.set('page', String(page))
  const serialized = query.toString()
  return `${localizePathname(pathname, locale)}${serialized ? `?${serialized}` : ''}`
}
