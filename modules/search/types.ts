/**
 * Search domain types — FASE 04 & FASE 08 (Sponsored Placement)
 */

import type { EyeColor, HairColor, HairLength, BodyType } from '@/modules/profiles/types'
import type { OfferingCode } from '@/modules/offerings/types'

export type PlacementType = 'ORGANIC' | 'SPONSORED'

export interface SearchParams {
  citySlug: string
  locationSlug?: string
  minAge?: number
  maxAge?: number
  minHeight?: number
  maxHeight?: number
  minWeight?: number
  maxWeight?: number
  eyeColor?: EyeColor[]
  hairColor?: HairColor[]
  hairLength?: HairLength[]
  bodyType?: BodyType[]
  hasTattoos?: boolean
  hasPiercings?: boolean
  languages?: string[]
  offeringCodes?: OfferingCode[]
  sort?: 'recommended' | 'newest'
  page?: number
  limit?: number
  includePreview?: boolean // Used in test/preview mode
}

export interface SearchResultDTO {
  id: string
  slug: string
  stageName: string
  headline: string | null
  publicAge: number | null // strictly null if show_age is false
  primaryLocation: {
    name: string
    slug: string
    zone: string
  } | null
  locations: Array<{
    name: string
    slug: string
    isPrimary: boolean
  }>
  attributes: {
    heightCm: number | null
    weightKg: number | null
    eyeColor: EyeColor | null
    hairColor: HairColor | null
    hairLength: HairLength | null
    bodyType: BodyType | null
    hasTattoos: boolean
    hasPiercings: boolean
    languages: string[]
  }
  isVerified: boolean // Boolean derived indicator
  contact: {
    whatsapp: string | null
    phone: string | null
    telegram: string | null
  }
  // FASE 08 Sponsored Placement Identifiers
  placementType: PlacementType
  isSponsored: boolean
}

export interface SearchResponse {
  results: SearchResultDTO[]
  /** Total unique eligible profiles matching the query. Sponsored profiles are part of this count. Never inflated by +sponsoredCount. */
  totalProfiles: number
  page: number
  pageSize: number
  totalPages: number
  city: {
    id: string
    name: string
    slug: string
  }
  selectedLocation: {
    id: string
    name: string
    slug: string
    zone: string
  } | null
  /** Number of sponsored cards included in results (0–MAX_SPONSORED_SLOTS_PER_PAGE). Informational for UI only. Never trusted by server. */
  sponsoredCount: number
}

export interface FilterOptions {
  city: {
    id: string
    name: string
    slug: string
  }
  locationsByZone: Record<string, Array<{ id: string; name: string; slug: string }>>
  eyeColors: EyeColor[]
  hairColors: HairColor[]
  hairLengths: HairLength[]
  bodyTypes: BodyType[]
  offeringCodes: OfferingCode[]
}
