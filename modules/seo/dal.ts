import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityBySlug, getLocationBySlug, getLocationsByCityId } from '@/modules/locations/dal'
import { INDEXABLE_LOCATION_TYPES, MIN_CITY_PROFILES_FOR_INDEXING, MIN_LOCATION_PROFILES_FOR_INDEXING } from './constants'
import { getSeoConfig } from './config'
import type { CitySeoData, LocationSeoData, SitemapEntryDTO } from './types'

const SELECT_SEO_ELIGIBILITY_FIELDS = `
  id,
  updated_at,
  status,
  locations:professional_profile_locations!inner (
    is_primary,
    location:marketplace_locations!inner (
      id,
      name,
      slug,
      location_type,
      active,
      city:cities!inner (
        id,
        slug,
        active
      )
    )
  ),
  account:account_users!inner (
    status,
    verifications:identity_verifications!inner (
      status,
      identity_verified,
      age_verified
    )
  )
`

/**
 * Retrieves SEO data and publicly eligible inventory count for a city landing page.
 */
export async function getCitySeoData(citySlug: string): Promise<CitySeoData | null> {
  const city = await getCityBySlug(citySlug)
  if (!city || !city.active) {
    return null
  }

  const admin = createAdminClient()
  const allowedStatuses = ['ACTIVE', 'READY_FOR_REVIEW']

  // Query eligible profile count and most recent updated_at timestamp
  const { data, count, error } = await admin
    .from('professional_profiles')
    .select(SELECT_SEO_ELIGIBILITY_FIELDS, { count: 'exact' })
    .in('status', allowedStatuses)
    .eq('account.status', 'ACTIVE')
    .eq('account.verifications.status', 'VERIFIED')
    .eq('account.verifications.identity_verified', true)
    .eq('account.verifications.age_verified', true)
    .eq('locations.location.city.slug', city.slug)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[seo:dal] Error querying city SEO data:', error.message)
    return {
      city,
      eligibleProfileCount: 0,
      lastModified: null,
    }
  }

  const eligibleCount = count || 0
  const latestProfile = data && data.length > 0 ? (data[0] as any) : null
  const lastModified = latestProfile?.updated_at || null

  return {
    city,
    eligibleProfileCount: eligibleCount,
    lastModified,
  }
}

/**
 * Retrieves SEO data and publicly eligible inventory count for a neighborhood/location landing page.
 */
export async function getLocationSeoData(
  citySlug: string,
  locationSlug: string
): Promise<LocationSeoData | null> {
  const city = await getCityBySlug(citySlug)
  if (!city || !city.active) {
    return null
  }

  const location = await getLocationBySlug(city.id, locationSlug)
  if (!location || !location.active) {
    return null
  }

  const admin = createAdminClient()
  const allowedStatuses = ['ACTIVE', 'READY_FOR_REVIEW']

  const { data, count, error } = await admin
    .from('professional_profiles')
    .select(SELECT_SEO_ELIGIBILITY_FIELDS, { count: 'exact' })
    .in('status', allowedStatuses)
    .eq('account.status', 'ACTIVE')
    .eq('account.verifications.status', 'VERIFIED')
    .eq('account.verifications.identity_verified', true)
    .eq('account.verifications.age_verified', true)
    .eq('locations.location.slug', location.slug)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[seo:dal] Error querying location SEO data:', error.message)
    return {
      city,
      location,
      eligibleProfileCount: 0,
      lastModified: null,
    }
  }

  const eligibleCount = count || 0
  const latestProfile = data && data.length > 0 ? (data[0] as any) : null
  const lastModified = latestProfile?.updated_at || null

  return {
    city,
    location,
    eligibleProfileCount: eligibleCount,
    lastModified,
  }
}

/**
 * Generates dynamic Sitemap entries for all eligible public surfaces.
 *
 * Scope Invariants (FASE 10 MVP):
 * - Includes: `/` (Home)
 * - Includes: Active cities meeting threshold (`count >= 3`)
 * - Includes: Active locations (`NEIGHBORHOOD` or `COMMERCIAL_DISTRICT`) meeting threshold (`count >= 3`)
 * - STRICTLY EXCLUDES: `/perfil/[slug]` (profile routes are built in FASE 12)
 * - STRICTLY EXCLUDES: Filtered URLs, paginated URLs, private routes, zero-result/thin locations.
 */
export async function getSitemapData(): Promise<SitemapEntryDTO[]> {
  const config = getSeoConfig()
  const admin = createAdminClient()
  const allowedStatuses = ['ACTIVE', 'READY_FOR_REVIEW']

  const sitemapEntries: SitemapEntryDTO[] = []

  // 1. Fetch all active cities
  const { data: citiesData } = await admin
    .from('cities')
    .select('*')
    .eq('active', true)

  const activeCities = (citiesData || []) as any[]

  let globalLatestModified: string | null = null

  // 2. Process each active city
  for (const city of activeCities) {
    const { data: cityProfiles, count: cityCount } = await admin
      .from('professional_profiles')
      .select(SELECT_SEO_ELIGIBILITY_FIELDS, { count: 'exact' })
      .in('status', allowedStatuses)
      .eq('account.status', 'ACTIVE')
      .eq('account.verifications.status', 'VERIFIED')
      .eq('account.verifications.identity_verified', true)
      .eq('account.verifications.age_verified', true)
      .eq('locations.location.city.slug', city.slug)
      .order('updated_at', { ascending: false })
      .limit(1)

    const eligibleCityCount = cityCount || 0
    const cityLatestProfile = cityProfiles && cityProfiles.length > 0 ? (cityProfiles[0] as any) : null
    const cityLastMod = cityLatestProfile?.updated_at || undefined

    if (cityLastMod && (!globalLatestModified || new Date(cityLastMod) > new Date(globalLatestModified))) {
      globalLatestModified = cityLastMod
    }

    // Include City Hub if threshold met (>= 3)
    if (eligibleCityCount >= MIN_CITY_PROFILES_FOR_INDEXING) {
      sitemapEntries.push({
        url: `${config.siteUrl}/${city.slug}`,
        lastModified: cityLastMod,
        changeFrequency: 'daily',
        priority: 0.9,
      })
    }

    // 3. Process active locations within this city
    const locations = await getLocationsByCityId(city.id)
    for (const loc of locations) {
      if (!loc.active || !INDEXABLE_LOCATION_TYPES.includes(loc.location_type)) {
        continue
      }

      const { data: locProfiles, count: locCount } = await admin
        .from('professional_profiles')
        .select(SELECT_SEO_ELIGIBILITY_FIELDS, { count: 'exact' })
        .in('status', allowedStatuses)
        .eq('account.status', 'ACTIVE')
        .eq('account.verifications.status', 'VERIFIED')
        .eq('account.verifications.identity_verified', true)
        .eq('account.verifications.age_verified', true)
        .eq('locations.location.slug', loc.slug)
        .order('updated_at', { ascending: false })
        .limit(1)

      const eligibleLocCount = locCount || 0
      const locLatestProfile = locProfiles && locProfiles.length > 0 ? (locProfiles[0] as any) : null
      const locLastMod = locLatestProfile?.updated_at || undefined

      // Include Location if threshold met (>= 3)
      if (eligibleLocCount >= MIN_LOCATION_PROFILES_FOR_INDEXING) {
        sitemapEntries.push({
          url: `${config.siteUrl}/${city.slug}/${loc.slug}`,
          lastModified: locLastMod,
          changeFrequency: 'daily',
          priority: 0.8,
        })
      }
    }
  }

  // 4. Prepend Home page at top of sitemap
  sitemapEntries.unshift({
    url: `${config.siteUrl}/`,
    lastModified: globalLatestModified || undefined,
    changeFrequency: 'daily',
    priority: 1.0,
  })

  return sitemapEntries
}
