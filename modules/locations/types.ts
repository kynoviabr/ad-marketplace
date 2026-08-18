/**
 * Locations domain types — FASE 04 (Revised)
 */

export type LocationZone = 'Zona Sul' | 'Zona Oeste' | 'Centro' | 'Zona Leste' | 'Zona Norte'

export type LocationType = 'NEIGHBORHOOD' | 'COMMERCIAL_DISTRICT' | 'METRO_REGION'

export interface Country {
  id: string
  name: string
  code: string
  slug: string
  active: boolean
  created_at: string
}

export interface State {
  id: string
  country_id: string
  name: string
  code: string
  slug: string
  active: boolean
  created_at: string
}

export interface City {
  id: string
  state_id: string
  name: string
  slug: string
  active: boolean
  created_at: string
}

export interface MarketplaceLocation {
  id: string
  city_id: string
  name: string
  slug: string
  zone: LocationZone
  location_type: LocationType
  display_order: number
  active: boolean
  created_at: string
}

// Alias for backwards compatibility
export type Location = MarketplaceLocation

export interface ProfileLocation {
  id: string
  profile_id: string
  location_id: string
  is_primary: boolean
  created_at: string
  location?: MarketplaceLocation
}

export type LocationActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
