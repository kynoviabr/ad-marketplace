import type { Metadata } from 'next'
import type { City, MarketplaceLocation } from '@/modules/locations/types'
import type { Locale } from '@/lib/i18n/config'

export interface SeoConfig {
  siteName: string
  siteUrl: string
  defaultTitle: string
  defaultDescription: string
  locale: string
  country: string
  isProduction: boolean
}

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface CitySeoData {
  city: City
  eligibleProfileCount: number
  lastModified: string | null
}

export interface LocationSeoData {
  city: City
  location: MarketplaceLocation
  eligibleProfileCount: number
  lastModified: string | null
}

export interface SitemapEntryDTO {
  url: string
  lastModified?: string
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export interface CityMetadataProps {
  city: City
  eligibleProfileCount: number
  hasFilters: boolean
  page: number
  lastModified?: string | null
  locale?: Locale
}

export interface LocationMetadataProps {
  city: City
  location: MarketplaceLocation
  eligibleProfileCount: number
  hasFilters: boolean
  page: number
  lastModified?: string | null
  locale?: Locale
}

export interface ProfileMetadataContractProps {
  stageName: string
  headline?: string | null
  citySlug: string
  cityName: string
  slug: string
  primaryMediaUrl?: string | null
  locale?: Locale
}
