import type { Metadata } from 'next'
import { getSeoConfig } from './config'
import { buildCanonicalUrl } from './canonical'
import { SEO_TEMPLATES } from './templates'
import { isCityIndexable, isLocationIndexable, getRobotsDirective } from './indexability'
import type { CityMetadataProps, LocationMetadataProps, ProfileMetadataContractProps } from './types'

/**
 * Builds Next.js Metadata for a City landing page (e.g. /sao-paulo).
 */
export function constructCityMetadata(props: CityMetadataProps): Metadata {
  const config = getSeoConfig()
  const { city, eligibleProfileCount, hasFilters, page } = props

  const isIndexable = isCityIndexable(eligibleProfileCount)
  const canonicalUrl = buildCanonicalUrl(`/${city.slug}`, { page: page > 1 ? String(page) : undefined })
  const robots = getRobotsDirective({ isIndexable, hasFilters, page })

  const title = SEO_TEMPLATES.city.title(city.name, config.siteName)
  const description = SEO_TEMPLATES.city.description(city.name)

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: config.siteName,
      locale: config.locale,
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
  const { city, location, eligibleProfileCount, hasFilters, page } = props

  const isIndexable = isLocationIndexable(eligibleProfileCount, location.location_type)
  const canonicalUrl = buildCanonicalUrl(`/${city.slug}/${location.slug}`, {
    page: page > 1 ? String(page) : undefined,
  })
  const robots = getRobotsDirective({ isIndexable, hasFilters, page })

  const title = SEO_TEMPLATES.location.title(location.name, city.name, config.siteName)
  const description = SEO_TEMPLATES.location.description(location.name, city.name)

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: config.siteName,
      locale: config.locale,
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
  const { stageName, headline, cityName, slug, primaryMediaUrl } = props

  const canonicalUrl = `${config.siteUrl}/perfil/${slug}`
  const title = SEO_TEMPLATES.profileContract.title(stageName, cityName, config.siteName)
  const description = SEO_TEMPLATES.profileContract.description(stageName, headline)

  const ogImages = primaryMediaUrl ? [{ url: primaryMediaUrl, alt: `Foto de ${stageName}` }] : undefined

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
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
      locale: config.locale,
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
export function constructRootMetadata(): Metadata {
  const config = getSeoConfig()

  if (!config.isProduction) {
    return {
      metadataBase: new URL(config.siteUrl),
      title: {
        default: config.defaultTitle,
        template: `%s | ${config.siteName}`,
      },
      description: config.defaultDescription,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    metadataBase: new URL(config.siteUrl),
    title: {
      default: config.defaultTitle,
      template: `%s | ${config.siteName}`,
    },
    description: config.defaultDescription,
  }
}
