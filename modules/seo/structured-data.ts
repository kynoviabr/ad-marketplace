import { getSeoConfig } from './config'
import type { BreadcrumbItem, ProfileMetadataContractProps } from './types'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config'
import { createTranslator } from '@/lib/i18n/catalog'
import { localizePathname } from '@/lib/i18n/routing'

/**
 * Generates Schema.org WebSite structured data.
 */
export function generateWebsiteJsonLd(locale: Locale = DEFAULT_LOCALE): Record<string, unknown> {
  const config = getSeoConfig()
  const t = createTranslator(locale)
  const localizedUrl = locale === DEFAULT_LOCALE
    ? config.siteUrl
    : `${config.siteUrl}${localizePathname('/', locale)}`
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteName,
    url: localizedUrl,
    description: t('seo.defaultDescription'),
    inLanguage: locale,
  }
}

/**
 * Generates Schema.org BreadcrumbList structured data.
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Generates Schema.org ProfilePage / Person structured data contract.
 *
 * NOTE: Prepared as a domain contract for FASE 12.
 * Strictly adheres to white-hat invariants:
 * - NO fabricated reviews or star ratings
 * - NO fake price offers or fake business address
 * - NO private legal/KYC data
 */
export function generateProfileJsonLd(profile: ProfileMetadataContractProps): Record<string, unknown> {
  const config = getSeoConfig()
  const profileUrl = `${config.siteUrl}${localizePathname(`/perfil/${profile.slug}`, profile.locale ?? DEFAULT_LOCALE)}`

  const personEntity: Record<string, unknown> = {
    '@type': 'Person',
    name: profile.stageName,
    description: profile.headline || undefined,
    url: profileUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.cityName,
      addressCountry: config.country,
    },
  }

  if (profile.primaryMediaUrl) {
    personEntity.image = profile.primaryMediaUrl
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: personEntity,
  }
}
