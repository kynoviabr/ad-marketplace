import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityBySlug, getLocationBySlug, getLocationsByCityId } from '@/modules/locations/dal'
import { MAX_SPONSORED_SLOTS_PER_PAGE } from '@/modules/promotions/constants'
import { resolveActiveSponsoredCandidates } from '@/modules/promotions/dal'
import { sortCandidatesByFairRotation } from '@/modules/promotions/rotation'
import type { SearchParams, SearchResponse, SearchResultDTO, FilterOptions } from './types'

/**
 * Builds the base Supabase query applying all visibility-aware and structured filters.
 */
function applySearchFilters(
  query: any,
  params: SearchParams,
  selectedLocation: SearchResponse['selectedLocation'] | null
) {
  // Visibility-Aware Filters
  if (params.minAge !== undefined) {
    query = query.eq('show_age', true).gte('public_age', params.minAge)
  }
  if (params.maxAge !== undefined) {
    query = query.eq('show_age', true).lte('public_age', params.maxAge)
  }
  if (params.minHeight !== undefined) {
    query = query.eq('show_height', true).gte('height_cm', params.minHeight)
  }
  if (params.maxHeight !== undefined) {
    query = query.eq('show_height', true).lte('height_cm', params.maxHeight)
  }
  if (params.minWeight !== undefined) {
    query = query.eq('show_weight', true).gte('weight_kg', params.minWeight)
  }
  if (params.maxWeight !== undefined) {
    query = query.eq('show_weight', true).lte('weight_kg', params.maxWeight)
  }

  // Categorical Filters
  if (params.eyeColor && params.eyeColor.length > 0) {
    query = query.in('eye_color', params.eyeColor)
  }
  if (params.hairColor && params.hairColor.length > 0) {
    query = query.in('hair_color', params.hairColor)
  }
  if (params.hairLength && params.hairLength.length > 0) {
    query = query.in('hair_length', params.hairLength)
  }
  if (params.bodyType && params.bodyType.length > 0) {
    query = query.in('body_type', params.bodyType)
  }
  if (params.hasTattoos !== undefined) {
    query = query.eq('has_tattoos', params.hasTattoos)
  }
  if (params.hasPiercings !== undefined) {
    query = query.eq('has_piercings', params.hasPiercings)
  }

  // Location filter if specified
  if (selectedLocation) {
    query = query.eq('locations.location.slug', selectedLocation.slug)
  }

  return query
}

/**
 * Maps a raw profile database row to a sanitized SearchResultDTO.
 */
function mapRowToSearchResultDTO(row: any, placementType: 'ORGANIC' | 'SPONSORED'): SearchResultDTO {
  const rawLocations = Array.isArray(row.locations) ? row.locations : [row.locations].filter(Boolean)
  const primaryLocEntry = rawLocations.find((l: any) => l.is_primary) || rawLocations[0]

  const mappedLocations = rawLocations.map((l: any) => ({
    name: l.location?.name || '',
    slug: l.location?.slug || '',
    isPrimary: Boolean(l.is_primary),
  }))

  const primaryLocation = primaryLocEntry && primaryLocEntry.location
    ? {
        name: primaryLocEntry.location.name,
        slug: primaryLocEntry.location.slug,
        zone: primaryLocEntry.location.zone,
      }
    : null

  return {
    id: row.id,
    slug: row.slug,
    stageName: row.stage_name,
    headline: row.headline,
    publicAge: row.show_age ? row.public_age : null,
    primaryLocation,
    locations: mappedLocations,
    attributes: {
      heightCm: row.show_height ? row.height_cm : null,
      weightKg: row.show_weight ? row.weight_kg : null,
      eyeColor: row.eye_color,
      hairColor: row.hair_color,
      hairLength: row.hair_length,
      bodyType: row.body_type,
      hasTattoos: row.has_tattoos,
      hasPiercings: row.has_piercings,
      languages: row.languages || ['Português'],
    },
    // The view v_publication_eligible_profiles already guarantees KYC verification for
    // all IDs in eligibleProfileIds. This constant remains correct.
    isVerified: true,
    contact: {
      whatsapp: row.show_whatsapp ? row.whatsapp_phone : null,
      phone: row.show_phone ? row.direct_phone : null,
      telegram: row.show_telegram ? row.telegram_username : null,
    },
    placementType,
    isSponsored: placementType === 'SPONSORED',
  }
}

// NOTE (FASE 11-SEC-011): account:account_users and account.verifications joins have been
// removed. Publication eligibility is now enforced exclusively at the query level via the
// v_publication_eligible_profiles VIEW (migration 20260819000010). The !inner location join
// is retained for location-based filtering and DTO mapping.
const SELECT_PROFILE_SEARCH_FIELDS = `
  id,
  stage_name,
  slug,
  headline,
  bio,
  public_age,
  height_cm,
  weight_kg,
  bust_cm,
  waist_cm,
  hips_cm,
  eye_color,
  hair_color,
  hair_length,
  body_type,
  has_tattoos,
  has_piercings,
  languages,
  whatsapp_phone,
  direct_phone,
  telegram_username,
  show_age,
  show_height,
  show_weight,
  show_measurements,
  show_whatsapp,
  show_phone,
  show_telegram,
  status,
  completed_at,
  created_at,
  updated_at,
  locations:professional_profile_locations!inner (
    is_primary,
    location:marketplace_locations!inner (
      id,
      name,
      slug,
      zone,
      city:cities!inner (
        id,
        slug
      )
    )
  )
`

/**
 * Executes a structured, visibility-aware search query with sponsored inventory integration.
 *
 * FASE 08 v1.1 — Corrected Pagination Model:
 *
 * Organic Offset Formula:
 *   Page 1:  organicOffset = 0
 *            organicLimit  = PAGE_SIZE - sponsoredCount
 *   Page N≥2: organicOffset = (PAGE_SIZE - sponsoredCountPage1) + ((N - 2) * PAGE_SIZE)
 *            organicLimit  = PAGE_SIZE
 *
 * Total Count:
 *   totalProfiles = COUNT(*) of unique eligible profiles (organic population)
 *                 — sponsored profiles are already members of this population.
 *   Never: organic_count + sponsored_count.
 *
 * sponsoredCountPage1 Recomputation:
 *   The sponsored candidate query runs on ALL pages to authoritatively recompute
 *   sponsoredCountPage1 for the offset formula. On pages 2+, sponsored DTOs are
 *   not emitted in results. Client-supplied sponsoredCount is never trusted.
 *
 * Duplicate Suppression:
 *   Page 1: sponsored profile IDs are excluded from the organic WHERE clause.
 *   Page 2+: no exclusion — boosted profiles re-enter organic ranking normally.
 *   The organic COUNT(*) for totalProfiles is taken WITHOUT the NOT IN exclusion.
 *
 * FASE 11-SEC-011 — View-based Publication Gating:
 *   All publication eligibility checks (account status, KYC, billing entitlement, content
 *   moderation) are enforced by pre-fetching eligible profile IDs from the service_role-only
 *   VIEW v_publication_eligible_profiles. The subsequent queries on professional_profiles
 *   use .in('id', eligibleProfileIds) to restrict results to that pre-vetted set.
 */
export async function executeSearch(params: SearchParams): Promise<SearchResponse> {
  const admin = createAdminClient()

  // 1. Resolve City
  const city = await getCityBySlug(params.citySlug)
  if (!city) {
    throw new Error(`Cidade '${params.citySlug}' não encontrada.`)
  }

  // 2. Resolve optional Location (Neighborhood/Service Area)
  let selectedLocation: SearchResponse['selectedLocation'] = null
  if (params.locationSlug) {
    const loc = await getLocationBySlug(city.id, params.locationSlug)
    if (loc) {
      selectedLocation = {
        id: loc.id,
        name: loc.name,
        slug: loc.slug,
        zone: loc.zone,
      }
    }
  }

  const page = Math.max(1, params.page || 1)
  const limit = Math.min(50, Math.max(1, params.limit || 20))

  // allowedStatuses is kept as documentation — the view already filters by status.
  // The primary eligibility gate is .in('id', eligibleProfileIds) derived from the view.
  const allowedStatuses = ['ACTIVE', 'READY_FOR_REVIEW']
  void allowedStatuses // intentionally unused in queries; eligibility enforced by view

  // FASE 11-SEC-011: Pre-fetch eligible profile IDs for this city from the view.
  // v_publication_eligible_profiles encodes all 8 publication gates including
  // billing entitlement time-awareness. Access is service_role only (admin client).
  const { data: eligibleData, error: eligibleError } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id')
    .eq('city_id', city.id)

  if (eligibleError) {
    console.error('[search:executeSearch] Error fetching eligible profile IDs from view:', eligibleError.message)
  }

  const eligibleProfileIds: string[] = (eligibleData || []).map((r: any) => r.profile_id)

  if (eligibleProfileIds.length === 0) {
    return {
      results: [],
      totalProfiles: 0,
      page,
      pageSize: limit,
      totalPages: 0,
      city: { id: city.id, name: city.name, slug: city.slug },
      selectedLocation,
      sponsoredCount: 0,
    }
  }

  // 3. Sponsored Inventory Resolution — runs on ALL pages to authoritatively
  //    recompute sponsoredCountPage1 for the organic offset formula.
  //    On pages 2+, the DTOs are resolved but NOT emitted in results.
  let sponsoredResults: SearchResultDTO[] = []
  const sponsoredProfileDbIds: string[] = []

  try {
    const { locationCandidates, cityCandidates } = await resolveActiveSponsoredCandidates({
      cityId: city.id,
      locationId: selectedLocation?.id || null,
    })

    // Sort candidate pools by deterministic fair rotation
    let orderedBoostCandidates: Array<{ profileId: string }> = []

    if (selectedLocation) {
      // Neighborhood search: Location boosts have precedence, City boosts fill remainder
      const sortedLoc = sortCandidatesByFairRotation(
        locationCandidates,
        'MARKETPLACE_LOCATION',
        selectedLocation.id
      )
      const sortedCity = sortCandidatesByFairRotation(cityCandidates, 'CITY', city.id)
      orderedBoostCandidates = [...sortedLoc, ...sortedCity]
    } else {
      // City search: City boosts only. LOCATION boosts do not become city-wide placements.
      orderedBoostCandidates = sortCandidatesByFairRotation(cityCandidates, 'CITY', city.id)
    }

    if (orderedBoostCandidates.length > 0) {
      // Deduplicate profile IDs among candidates while preserving rotation order
      const uniqueCandidateProfileIds: string[] = []
      for (const c of orderedBoostCandidates) {
        if (!uniqueCandidateProfileIds.includes(c.profileId)) {
          uniqueCandidateProfileIds.push(c.profileId)
        }
      }

      // Query candidate profiles. Publication eligibility enforced via .in('id', eligibleProfileIds).
      // City scoping enforced via the locations join.
      let sponsoredQuery = admin
        .from('professional_profiles')
        .select(SELECT_PROFILE_SEARCH_FIELDS)
        .in('id', eligibleProfileIds)
        .in('id', uniqueCandidateProfileIds)
        .eq('locations.location.city.slug', params.citySlug)

      sponsoredQuery = applySearchFilters(sponsoredQuery, params, selectedLocation)

      const { data: sponsoredData } = await sponsoredQuery

      if (sponsoredData && sponsoredData.length > 0) {
        // Reorder filtered results back to fair-rotation order
        const dataMap = new Map(sponsoredData.map((row: any) => [row.id, row]))
        const sortedData: any[] = []

        for (const pid of uniqueCandidateProfileIds) {
          const row = dataMap.get(pid)
          if (row && sortedData.length < MAX_SPONSORED_SLOTS_PER_PAGE) {
            sortedData.push(row)
            sponsoredProfileDbIds.push(row.id)
          }
        }

        sponsoredResults = sortedData.map((row) => mapRowToSearchResultDTO(row, 'SPONSORED'))
      }
    }
  } catch (e: any) {
    console.error('[search:executeSearch] Error resolving sponsored candidates:', e?.message)
  }

  const sponsoredCount = sponsoredResults.length

  // 4. Organic Total Count Query
  //    Uses SELECT_PROFILE_SEARCH_FIELDS to declare the !inner location join so that
  //    nested filter conditions (.eq('locations.location.city.slug', ...) etc.) work
  //    correctly in Supabase PostgREST. The HEAD+count:exact combination returns only
  //    the count. Does NOT exclude sponsored IDs — sponsored profiles are part of the
  //    eligible population.
  let countQuery = admin
    .from('professional_profiles')
    .select(SELECT_PROFILE_SEARCH_FIELDS, { count: 'exact', head: true })
    .in('id', eligibleProfileIds)
    .eq('locations.location.city.slug', params.citySlug)

  countQuery = applySearchFilters(countQuery, params, selectedLocation)
  const { count: totalProfilesCount } = await countQuery
  const totalProfiles = totalProfilesCount || 0
  const totalPages = Math.ceil(totalProfiles / limit)

  // 5. Organic Records Query
  //    On Page 1: exclude sponsored IDs to prevent duplicate cards.
  //    On Page 2+: no exclusion — boosted profiles re-enter organic ranking normally.
  //
  //    Corrected Organic Offset Formula (v1.1):
  //      Page 1:  organicOffset = 0
  //               organicLimit  = limit - sponsoredCount
  //      Page N≥2: organicOffset = (limit - sponsoredCount) + ((N - 2) * limit)
  //               organicLimit  = limit
  const organicOffset =
    page === 1
      ? 0
      : (limit - sponsoredCount) + (page - 2) * limit

  const organicLimit = page === 1 ? Math.max(1, limit - sponsoredCount) : limit

  let organicQuery = admin
    .from('professional_profiles')
    .select(SELECT_PROFILE_SEARCH_FIELDS)
    .in('id', eligibleProfileIds)
    .eq('locations.location.city.slug', params.citySlug)

  // Duplicate suppression on Page 1 only
  if (page === 1 && sponsoredProfileDbIds.length > 0) {
    organicQuery = organicQuery.not('id', 'in', `(${sponsoredProfileDbIds.join(',')})`)
  }

  organicQuery = applySearchFilters(organicQuery, params, selectedLocation)

  // Sorting
  if (params.sort === 'newest') {
    organicQuery = organicQuery.order('created_at', { ascending: false }).order('id', { ascending: true })
  } else {
    organicQuery = organicQuery.order('updated_at', { ascending: false }).order('id', { ascending: true })
  }

  // Pagination
  organicQuery = organicQuery.range(organicOffset, organicOffset + organicLimit - 1)

  const { data: organicData, error } = await organicQuery

  if (error) {
    console.error('[search:execute] Error executing organic search query:', error.message)
    return {
      results: page === 1 ? sponsoredResults : [],
      totalProfiles: 0,
      page,
      pageSize: limit,
      totalPages: 1,
      city: { id: city.id, name: city.name, slug: city.slug },
      selectedLocation,
      sponsoredCount,
    }
  }

  const organicResults: SearchResultDTO[] = (organicData || []).map((row: any) =>
    mapRowToSearchResultDTO(row, 'ORGANIC')
  )

  // Compose results: sponsored first (Page 1 only), then organic
  const combinedResults = page === 1
    ? [...sponsoredResults, ...organicResults]
    : [...organicResults]

  return {
    results: combinedResults,
    totalProfiles,                               // unique eligible profiles — never inflated
    page,
    pageSize: limit,
    totalPages,                                  // ceil(totalProfiles / limit)
    city: { id: city.id, name: city.name, slug: city.slug },
    selectedLocation,
    sponsoredCount,                              // informational for UI only
  }
}


/**
 * Retrieves deterministic organic profiles for the Home page.
 * Uses the canonical publication eligibility view but intentionally BYPASSES
 * sponsored injection (FASE 12.2B-R1). This guarantees that Home displays
 * pure organic discovery inventory.
 */
export async function getHomeDiscoveryProfiles(citySlug: string, limit: number = 8): Promise<SearchResultDTO[]> {
  const admin = createAdminClient()
  const city = await getCityBySlug(citySlug)
  if (!city) return []

  const { data: eligibleData, error: eligibleError } = await admin
    .from('v_publication_eligible_profiles')
    .select('profile_id')
    .eq('city_id', city.id)

  if (eligibleError) {
    console.error('[search:getHomeDiscoveryProfiles] Error fetching eligible IDs:', eligibleError.message)
    return []
  }

  const eligibleProfileIds: string[] = (eligibleData || []).map((r: any) => r.profile_id)

  if (eligibleProfileIds.length === 0) {
    return []
  }

  // Fetch organic records in deterministic 'recommended' order (updated_at DESC)
  let organicQuery = admin
    .from('professional_profiles')
    .select(SELECT_PROFILE_SEARCH_FIELDS)
    .in('id', eligibleProfileIds)
    .eq('locations.location.city.slug', citySlug)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })
    .range(0, limit - 1)

  const { data, error } = await organicQuery

  if (error) {
    console.error('[search:getHomeDiscoveryProfiles] Error executing query:', error.message)
    return []
  }

  return (data || []).map((row: any) => mapRowToSearchResultDTO(row, 'ORGANIC'))
}

/**
 * Retrieves filter options for a given city.
 */
export async function getFilterOptions(citySlug: string): Promise<FilterOptions | null> {
  const city = await getCityBySlug(citySlug)
  if (!city) return null

  const locations = await getLocationsByCityId(city.id)

  const locationsByZone: Record<string, Array<{ id: string; name: string; slug: string }>> = {}

  for (const loc of locations) {
    if (!locationsByZone[loc.zone]) {
      locationsByZone[loc.zone] = []
    }
    locationsByZone[loc.zone].push({
      id: loc.id,
      name: loc.name,
      slug: loc.slug,
    })
  }

  return {
    city: { id: city.id, name: city.name, slug: city.slug },
    locationsByZone,
    eyeColors: ['BLACK', 'BROWN', 'GREEN', 'BLUE', 'HAZEL', 'OTHER'],
    hairColors: ['BLACK', 'BRUNETTE', 'BLONDE', 'REDHEAD', 'OTHER'],
    hairLengths: ['SHORT', 'MEDIUM', 'LONG', 'VERY_LONG', 'BALD'],
    bodyTypes: ['SLIM', 'ATHLETIC', 'CURVY', 'AVERAGE', 'PLUS_SIZE', 'OTHER'],
  }
}
