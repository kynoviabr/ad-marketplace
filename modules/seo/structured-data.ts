import { getSeoConfig } from './config'
import type { BreadcrumbItem, ProfileMetadataContractProps } from './types'

/**
 * Generates Schema.org WebSite structured data.
 */
export function generateWebsiteJsonLd(): Record<string, unknown> {
  const config = getSeoConfig()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteName,
    url: config.siteUrl,
    description: config.defaultDescription,
    inLanguage: config.locale.replace('_', '-'),
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
  const profileUrl = `${config.siteUrl}/perfil/${profile.slug}`

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
