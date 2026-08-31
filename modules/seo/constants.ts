import type { LocationType } from '@/modules/locations/types'

/**
 * Minimum number of publicly eligible profiles required for a city landing page to be indexable.
 * Below this threshold, the page returns HTTP 200 with `noindex, follow` and is excluded from sitemap.xml.
 */
export const MIN_CITY_PROFILES_FOR_INDEXING = 3

/**
 * Minimum number of publicly eligible profiles required for a neighborhood/location landing page to be indexable.
 * Below this threshold, the page returns HTTP 200 with `noindex, follow` and is excluded from sitemap.xml.
 */
export const MIN_LOCATION_PROFILES_FOR_INDEXING = 3

/**
 * Marketplace location types eligible for public SEO indexation in MVP.
 */
export const INDEXABLE_LOCATION_TYPES: LocationType[] = [
  'NEIGHBORHOOD',
  'COMMERCIAL_DISTRICT',
]

/**
 * Canonical centralized set of top-level reserved slugs.
 * Dynamic city/location routes must never collide with application routes or assets.
 */
export const RESERVED_TOP_LEVEL_SLUGS = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'complete-signup',
  'contato',
  'dashboard',
  'en',
  'favicon.ico',
  'forgot-password',
  'health',
  'login',
  'onboarding',
  'p',
  'perfil',
  'privacy',
  'privacidade',
  'profile',
  'reset-password',
  'robots.txt',
  'sitemap.xml',
  'signup',
  'sobre',
  'suspended',
  'termos',
  'terms',
  'verify-email',
  // FASE 12.2A: Public marketplace routes (must not collide with city slugs)
  'anuncie', // Professional acquisition page — FASE 12.2F
  'go',      // WhatsApp conversion Route Handler — FASE 12.2E
])

/**
 * Canonical allowlist of recognized search/filter query parameters.
 * When ANY of these are present on a public search URL, indexability switches to `noindex, follow`.
 */
export const SEARCH_FILTER_QUERY_PARAMS = new Set([
  'bairro',
  'idade_min',
  'idade_max',
  'altura_min',
  'altura_max',
  'peso_min',
  'peso_max',
  'olhos',
  'cabelo',
  'comprimento',
  'corpo',
  'tatuagens',
  'piercings',
])

/**
 * Known tracking query parameters that must be completely stripped from canonical URLs.
 */
export const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ref',
  'source',
])

export function isReservedSlug(slug: string): boolean {
  if (!slug) return false
  return RESERVED_TOP_LEVEL_SLUGS.has(slug.toLowerCase().trim())
}
