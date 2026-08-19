import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityBySlug, getLocationBySlug, getLocationsByCityId } from '@/modules/locations/dal'
import { INDEXABLE_LOCATION_TYPES, MIN_CITY_PROFILES_FOR_INDEXING, MIN_LOCATION_PROFILES_FOR_INDEXING } from './constants'
import { getSeoConfig } from './config'
import type { CitySeoData, LocationSeoData, SitemapEntryDTO } from './types'

/**
 * Retrieves SEO data and publicly eligible inventory count for a city landing page.
 *
 * FASE 11-SEC-011: Uses v_publication_eligible_profiles to count eligible profiles and
 * obtain the latest updated_at timestamp. The view encodes all 8 publication gates.
 */
export async function getCitySeoData(citySlug: string): Promise<CitySeoData | null> {
  const city = await getCityBySlug(citySlug)
  if (!city || !city.active) {
    return null
  }

  const admin = createAdminClient()

  // Count eligible profiles and get latest update timestamp via the view.
  const { data: eligible, count: eligibleCount, error } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id, updated_at', { count: 'exact' })
    .eq('city_id', city.id)
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

  const profileCount = eligibleCount || 0
  const latestRow = eligible && eligible.length > 0 ? (eligible[0] as any) : null
  const lastModified = latestRow?.updated_at || null

  return {
    city,
    eligibleProfileCount: profileCount,
    lastModified,
  }
}

/**
 * Retrieves SEO data and publicly eligible inventory count for a neighborhood/location landing page.
 *
 * FASE 11-SEC-011: Uses v_publication_eligible_profiles to get eligible profile IDs for
 * the city, then counts how many of those are associated with the specific location.
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

  // 1. Get all eligible profile IDs for this city from the view.
  const { data: eligible, error: eligibleError } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id, updated_at')
    .eq('city_id', city.id)

  if (eligibleError) {
    console.error('[seo:dal] Error querying eligible profiles for location SEO data:', eligibleError.message)
    return {
      city,
      location,
      eligibleProfileCount: 0,
      lastModified: null,
    }
  }

  const eligibleIds = (eligible || []).map((r: any) => r.profile_id)

  if (eligibleIds.length === 0) {
    return {
      city,
      location,
      eligibleProfileCount: 0,
      lastModified: null,
    }
  }

  // 2. Count eligible profiles that are also associated with this specific location.
  const { count: eligibleLocCount, error: locCountError } = await admin
    .from('professional_profile_locations')
    .select('profile_id', { count: 'exact', head: true })
    .in('profile_id', eligibleIds)
    .eq('location_id', location.id)

  if (locCountError) {
    console.error('[seo:dal] Error counting location-scoped eligible profiles:', locCountError.message)
  }

  // 3. Use the latest updated_at among all city-eligible profiles as an approximation
  //    for lastModified. Acceptable for SEO metadata purposes.
  const sortedEligible = [...(eligible || [])].sort(
    (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
  const lastModified = sortedEligible.length > 0 ? (sortedEligible[0] as any).updated_at : null

  return {
    city,
    location,
    eligibleProfileCount: eligibleLocCount || 0,
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
 *
 * FASE 11-SEC-011: Uses v_publication_eligible_profiles for all eligibility counts.
 */
export async function getSitemapData(): Promise<SitemapEntryDTO[]> {
  const config = getSeoConfig()
  const admin = createAdminClient()

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
    // Get eligible profiles for this city from the view (count + latest updated_at)
    const { data: cityEligible, count: cityCount, error: cityEligibleError } = await admin
      .from('v_publication_eligible_profiles')
      .select('profile_id, updated_at', { count: 'exact' })
      .eq('city_id', city.id)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (cityEligibleError) {
      console.error('[seo:dal:sitemap] Error querying city eligible profiles:', cityEligibleError.message)
    }

    const eligibleCityCount = cityCount || 0
    const cityLatestRow = cityEligible && cityEligible.length > 0 ? (cityEligible[0] as any) : null
    const cityLastMod = cityLatestRow?.updated_at || undefined

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

    // 3. For location counts, get all eligible IDs for this city first.
    //    Re-use cityEligible data if count fits in one page; otherwise fetch full ID list.
    const { data: allCityEligible } = await admin
      .from('v_publication_eligible_profiles')
      .select('profile_id')
      .eq('city_id', city.id)

    const eligibleCityIds = (allCityEligible || []).map((r: any) => r.profile_id)

    // 4. Process active locations within this city
    const locations = await getLocationsByCityId(city.id)
    for (const loc of locations) {
      if (!loc.active || !INDEXABLE_LOCATION_TYPES.includes(loc.location_type)) {
        continue
      }

      if (eligibleCityIds.length === 0) {
        continue
      }

      // Count eligible profiles that have this specific location
      const { count: locCount, error: locCountError } = await admin
        .from('professional_profile_locations')
        .select('profile_id', { count: 'exact', head: true })
        .in('profile_id', eligibleCityIds)
        .eq('location_id', loc.id)

      if (locCountError) {
        console.error('[seo:dal:sitemap] Error counting location eligible profiles:', locCountError.message)
      }

      const eligibleLocCount = locCount || 0

      // Include Location if threshold met (>= 3)
      if (eligibleLocCount >= MIN_LOCATION_PROFILES_FOR_INDEXING) {
        sitemapEntries.push({
          url: `${config.siteUrl}/${city.slug}/${loc.slug}`,
          lastModified: cityLastMod,
          changeFrequency: 'daily',
          priority: 0.8,
        })
      }
    }
  }

  // 5. Prepend Home page at top of sitemap
  sitemapEntries.unshift({
    url: `${config.siteUrl}/`,
    lastModified: globalLatestModified || undefined,
    changeFrequency: 'daily',
    priority: 1.0,
  })

  return sitemapEntries
}
