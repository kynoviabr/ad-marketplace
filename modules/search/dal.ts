import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityBySlug, getLocationBySlug, getLocationsByCityId } from '@/modules/locations/dal'
import type { SearchParams, SearchResponse, SearchResultDTO, FilterOptions } from './types'

/**
 * Executes a structured, visibility-aware search query in PostgreSQL.
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
  const offset = (page - 1) * limit

  // 3. Allowed statuses: in production, 'ACTIVE'; in preview/test mode, also 'READY_FOR_REVIEW'
  const allowedStatuses = params.includePreview ? ['ACTIVE', 'READY_FOR_REVIEW'] : ['ACTIVE', 'READY_FOR_REVIEW']

  let query = admin
    .from('professional_profiles')
    .select(
      `
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
      ),
      account:account_users!inner (
        status,
        verifications:identity_verifications!inner (
          status,
          identity_verified,
          age_verified
        )
      )
    `,
      { count: 'exact' }
    )
    .in('status', allowedStatuses)
    .eq('account.status', 'ACTIVE')
    .eq('account.verifications.status', 'VERIFIED')
    .eq('account.verifications.identity_verified', true)
    .eq('account.verifications.age_verified', true)
    .eq('locations.location.city.slug', params.citySlug)

  // Location filter if specified
  if (selectedLocation) {
    query = query.eq('locations.location.slug', selectedLocation.slug)
  }

  // Visibility-Aware Filters:
  // If user filters by age, profile MUST have show_age = true and public_age within range
  if (params.minAge !== undefined) {
    query = query.eq('show_age', true).gte('public_age', params.minAge)
  }
  if (params.maxAge !== undefined) {
    query = query.eq('show_age', true).lte('public_age', params.maxAge)
  }

  // If user filters by height, profile MUST have show_height = true
  if (params.minHeight !== undefined) {
    query = query.eq('show_height', true).gte('height_cm', params.minHeight)
  }
  if (params.maxHeight !== undefined) {
    query = query.eq('show_height', true).lte('height_cm', params.maxHeight)
  }

  // If user filters by weight, profile MUST have show_weight = true
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

  // Sorting
  if (params.sort === 'newest') {
    query = query.order('created_at', { ascending: false }).order('id', { ascending: true })
  } else {
    // Recommended: latest completed/updated first, then stable id
    query = query.order('updated_at', { ascending: false }).order('id', { ascending: true })
  }

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[search:execute] Error executing search query:', error.message)
    return {
      results: [],
      total: 0,
      page,
      pageSize: limit,
      totalPages: 0,
      city: { id: city.id, name: city.name, slug: city.slug },
      selectedLocation,
    }
  }

  // Map to sanitized SearchResultDTO
  const results: SearchResultDTO[] = (data || []).map((row: any) => {
    const rawLocations = Array.isArray(row.locations) ? row.locations : [row.locations]
    const primaryLocEntry = rawLocations.find((l: any) => l.is_primary) || rawLocations[0]

    const mappedLocations = rawLocations.map((l: any) => ({
      name: l.location.name,
      slug: l.location.slug,
      isPrimary: Boolean(l.is_primary),
    }))

    const primaryLocation = primaryLocEntry
      ? {
          name: primaryLocEntry.location.name,
          slug: primaryLocEntry.location.slug,
          zone: primaryLocEntry.location.zone,
        }
      : null

    return {
      id: row.slug,
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
      isVerified: true,
      contact: {
        whatsapp: row.show_whatsapp ? row.whatsapp_phone : null,
        phone: row.show_phone ? row.direct_phone : null,
        telegram: row.show_telegram ? row.telegram_username : null,
      },
    }
  })

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return {
    results,
    total,
    page,
    pageSize: limit,
    totalPages,
    city: { id: city.id, name: city.name, slug: city.slug },
    selectedLocation,
  }
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
