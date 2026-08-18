/**
 * Locations domain types — FASE 04
 */

export interface State {
  id: string
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

export interface Location {
  id: string
  city_id: string
  name: string
  slug: string
  zone: string
  display_order: number
  active: boolean
  created_at: string
}

export interface ProfileLocation {
  id: string
  profile_id: string
  location_id: string
  is_primary: boolean
  created_at: string
  location?: Location
}

export type LocationActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
