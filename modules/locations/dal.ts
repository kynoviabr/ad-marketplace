import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Country, City, MarketplaceLocation, ProfileLocation } from './types'

/**
 * Retrieves all active countries.
 */
export async function getCountries(): Promise<Country[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('countries')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error || !data) return []
  return data as Country[]
}

/**
 * Retrieves all active cities.
 */
export async function getActiveCities(): Promise<City[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('cities')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error || !data) return []
  return data as City[]
}

/**
 * Retrieves a city by its slug.
 */
export async function getCityBySlug(slug: string): Promise<City | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('cities')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as City
}

/**
 * Retrieves all active neighborhoods/service areas for a given city ID.
 */
export async function getLocationsByCityId(cityId: string): Promise<MarketplaceLocation[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('marketplace_locations')
    .select('*')
    .eq('city_id', cityId)
    .eq('active', true)
    .order('display_order', { ascending: true })

  if (error || !data) return []
  return data as MarketplaceLocation[]
}

/**
 * Retrieves all active neighborhoods/service areas for a given city slug.
 */
export async function getLocationsByCitySlug(citySlug: string): Promise<MarketplaceLocation[]> {
  const city = await getCityBySlug(citySlug)
  if (!city) return []
  return getLocationsByCityId(city.id)
}

/**
 * Retrieves a single marketplace location by city ID and location slug.
 */
export async function getLocationBySlug(cityId: string, slug: string): Promise<MarketplaceLocation | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('marketplace_locations')
    .select('*')
    .eq('city_id', cityId)
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as MarketplaceLocation
}

/**
 * Retrieves all service locations configured for a given profile ID.
 */
export async function getProfileLocations(profileId: string): Promise<ProfileLocation[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('professional_profile_locations')
    .select('*, location:marketplace_locations(*)')
    .eq('profile_id', profileId)
    .order('is_primary', { ascending: false })

  if (error || !data) return []
  return data as ProfileLocation[]
}

/**
 * Retrieves all service locations configured for an account user ID.
 */
export async function getProfileLocationsByAccountUserId(
  accountUserId: string
): Promise<ProfileLocation[]> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('professional_profiles')
    .select('id')
    .eq('account_user_id', accountUserId)
    .maybeSingle()

  if (!profile) return []
  return getProfileLocations(profile.id)
}
