import type { Metadata } from 'next'
import { getSeoConfig } from './config'
import { buildCanonicalUrl, buildLanguageAlternates } from './canonical'
import { isCityIndexable, isLocationIndexable, getRobotsDirective } from './indexability'
import type { CityMetadataProps, LocationMetadataProps, ProfileMetadataContractProps } from './types'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { createTranslator } from '@/lib/i18n/catalog'

/**
 * Builds Next.js Metadata for a City landing page (e.g. /sao-paulo).
 */
export function constructCityMetadata(props: CityMetadataProps): Metadata {
  const config = getSeoConfig()
  const { city, eligibleProfileCount, hasFilters, page, locale = DEFAULT_LOCALE } = props
  const t = createTranslator(locale)

  const isIndexable = isCityIndexable(eligibleProfileCount)
  const pathname = `/${city.slug}`
  const canonicalUrl = buildCanonicalUrl(pathname, { page: page > 1 ? String(page) : undefined }, locale)
  const robots = getRobotsDirective({ isIndexable, hasFilters, page })

  const title = t('seo.cityTitle', { city: city.name, brand: config.siteName })
  const description = t('seo.cityDescription', { city: city.name })

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(pathname),
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: config.siteName,
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

/**
 * Builds Next.js Metadata for a Neighborhood/Location landing page (e.g. /sao-paulo/moema).
 */
export function constructLocationMetadata(props: LocationMetadataProps): Metadata {
  const config = getSeoConfig()
  const { city, location, eligibleProfileCount, hasFilters, page, locale = DEFAULT_LOCALE } = props
  const t = createTranslator(locale)

  const isIndexable = isLocationIndexable(eligibleProfileCount, location.location_type)
  const pathname = `/${city.slug}/${location.slug}`
  const canonicalUrl = buildCanonicalUrl(pathname, {
    page: page > 1 ? String(page) : undefined,
  }, locale)
  const robots = getRobotsDirective({ isIndexable, hasFilters, page })

  const title = t('seo.locationTitle', { location: location.name, city: city.name, brand: config.siteName })
  const description = t('seo.locationDescription', { location: location.name, city: city.name })

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(pathname),
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: config.siteName,
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

/**
 * Builds Next.js Metadata contract for a future Professional Profile page (FASE 12).
 *
 * Invariant (HD-SEO-12):
 * - If a stable, crawler-accessible approved media URL is provided, it is set on openGraph.images.
 * - Otherwise, og:image is omitted to fail closed.
 */
export function constructProfileMetadata(props: ProfileMetadataContractProps): Metadata {
  const config = getSeoConfig()
  const { stageName, headline, cityName, slug, primaryMediaUrl, locale = DEFAULT_LOCALE } = props
  const t = createTranslator(locale)

  const pathname = `/perfil/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname, undefined, locale)
  const title = t('seo.profileTitle', { name: stageName, city: cityName, brand: config.siteName })
  const description = headline || t('seo.profileDescription', { name: stageName })

  const ogImages = primaryMediaUrl ? [{ url: primaryMediaUrl, alt: t('seo.profileImageAlt', { name: stageName }) }] : undefined

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(pathname),
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: config.siteName,
      locale: locale === 'en' ? 'en_US' : 'pt_BR',
      type: 'profile',
      images: ogImages,
    },
    twitter: {
      card: primaryMediaUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: primaryMediaUrl ? [primaryMediaUrl] : undefined,
    },
  }
}

/**
 * Builds Root Metadata for app/layout.tsx.
 */
export function constructRootMetadata(locale: Locale = DEFAULT_LOCALE): Metadata {
  const config = getSeoConfig()
  const t = createTranslator(locale)
  const title = t('seo.defaultTitle', { brand: config.siteName })
  const description = t('seo.defaultDescription')

  if (!config.isProduction) {
    return {
      metadataBase: new URL(config.siteUrl),
      title: {
        default: title,
        template: `%s | ${config.siteName}`,
      },
      description,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    metadataBase: new URL(config.siteUrl),
    title: {
      default: title,
      template: `%s | ${config.siteName}`,
    },
    description,
    alternates: {
      canonical: buildCanonicalUrl('/', undefined, locale),
      languages: buildLanguageAlternates('/'),
    },
  }
}
