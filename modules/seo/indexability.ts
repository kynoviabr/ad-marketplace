import type { Metadata } from 'next'
import {
  MIN_CITY_PROFILES_FOR_INDEXING,
  MIN_LOCATION_PROFILES_FOR_INDEXING,
  INDEXABLE_LOCATION_TYPES,
  SEARCH_FILTER_QUERY_PARAMS,
} from './constants'
import { getSeoConfig } from './config'
import type { LocationType } from '@/modules/locations/types'

/**
 * Checks whether a city hub meets the minimum inventory threshold for search engine indexation.
 */
export function isCityIndexable(eligibleCount: number): boolean {
  return eligibleCount >= MIN_CITY_PROFILES_FOR_INDEXING
}

/**
 * Checks whether a neighborhood/location meets the indexation threshold and approved location type.
 */
export function isLocationIndexable(eligibleCount: number, locationType?: LocationType | string): boolean {
  if (locationType && !INDEXABLE_LOCATION_TYPES.includes(locationType as LocationType)) {
    return false
  }
  return eligibleCount >= MIN_LOCATION_PROFILES_FOR_INDEXING
}

/**
 * Checks whether incoming search parameters contain recognized marketplace filter parameters.
 */
export function hasSearchFilters(
  searchParams?: Record<string, string | string[] | undefined> | null
): boolean {
  if (!searchParams) return false

  for (const key of Object.keys(searchParams)) {
    if (SEARCH_FILTER_QUERY_PARAMS.has(key)) {
      const val = searchParams[key]
      if (val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        return true
      }
    }
  }

  return false
}

/**
 * Parses the page number from raw searchParams.
 */
export function parsePageNumber(pageVal: string | string[] | undefined): number {
  if (!pageVal) return 1
  const str = Array.isArray(pageVal) ? pageVal[0] : pageVal
  const num = parseInt(str, 10)
  return isNaN(num) || num < 1 ? 1 : num
}

/**
 * Derives the exact Next.js Metadata robots configuration.
 *
 * Rules:
 * 1. Non-production environments (DEV / STAGING / PREVIEW): always `noindex, nofollow`.
 * 2. Production:
 *    - Has recognized search filters -> `noindex, follow`
 *    - Paginated page (page >= 2) -> `noindex, follow`
 *    - Geographic page below inventory threshold -> `noindex, follow`
 *    - Eligible pure geographic page (page 1) -> `index: true, follow: true`
 */
export function getRobotsDirective(options: {
  isIndexable: boolean
  hasFilters?: boolean
  page?: number
  isProduction?: boolean
}): NonNullable<Metadata['robots']> {
  const config = getSeoConfig()
  const isProd = options.isProduction !== undefined ? options.isProduction : config.isProduction

  if (!isProd) {
    return {
      index: false,
      follow: false,
    }
  }

  const page = options.page ?? 1
  const hasFilters = options.hasFilters ?? false

  if (hasFilters || page >= 2 || !options.isIndexable) {
    return {
      index: false,
      follow: true,
    }
  }

  return {
    index: true,
    follow: true,
  }
}
