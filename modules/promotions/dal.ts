import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  BoostProduct,
  BoostPrice,
  ProfileBoost,
  BoostProductDTO,
  ProfileBoostDTO,
  SponsoredPlacementCandidate,
  BoostCampaignStatus,
} from './types'

/**
 * Retrieves all active boost products along with their currently active prices.
 */
export async function getActiveBoostProducts(): Promise<BoostProductDTO[]> {
  const admin = createAdminClient()

  const { data: products, error: prodErr } = await admin
    .from('boost_products')
    .select(`
      id,
      code,
      name,
      description,
      scope_type,
      duration_hours,
      sort_order,
      prices:boost_prices (
        id,
        price_code,
        amount_minor,
        currency,
        is_active,
        is_promotional,
        valid_from,
        valid_until
      )
    `)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (prodErr || !products) {
    console.error('[promotions:dal:getActiveBoostProducts] Error:', prodErr?.message)
    return []
  }

  const now = new Date()

  return products.map((p: any) => {
    const rawPrices = Array.isArray(p.prices) ? p.prices : []
    const validPrices = rawPrices
      .filter((pr: any) => {
        if (!pr.is_active) return false
        if (pr.valid_from && new Date(pr.valid_from) > now) return false
        if (pr.valid_until && new Date(pr.valid_until) <= now) return false
        return true
      })
      .map((pr: any) => ({
        id: pr.id,
        priceCode: pr.price_code,
        amountMinor: pr.amount_minor,
        currency: pr.currency,
        isPromotional: pr.is_promotional,
      }))

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      scopeType: p.scope_type,
      durationHours: p.duration_hours,
      prices: validPrices,
    }
  })
}

/**
 * Retrieves a single boost product by ID.
 */
export async function getBoostProductById(id: string): Promise<BoostProduct | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('boost_products')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as BoostProduct
}

/**
 * Retrieves a single boost price by ID.
 */
export async function getBoostPriceById(id: string): Promise<BoostPrice | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('boost_prices')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as BoostPrice
}

/**
 * Retrieves all boost campaigns for a specific professional profile.
 */
export async function getProfileBoostsByProfileId(profileId: string): Promise<ProfileBoostDTO[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profile_boosts')
    .select(`
      id,
      profile_id,
      scope_type,
      starts_at,
      ends_at,
      status,
      created_at,
      product:boost_products!inner (
        name,
        code
      ),
      price:boost_prices!inner (
        amount_minor,
        currency
      ),
      city:cities!inner (
        name
      ),
      location:marketplace_locations (
        name
      )
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('[promotions:dal:getProfileBoostsByProfileId] Error:', error?.message)
    return []
  }

  return data.map((b: any) => ({
    id: b.id,
    profileId: b.profile_id,
    productName: b.product?.name || 'Destaque',
    productCode: b.product?.code || '',
    scopeType: b.scope_type,
    cityName: b.city?.name || '',
    locationName: b.location?.name || null,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    status: b.status,
    amountMinor: b.price?.amount_minor || 0,
    currency: b.price?.currency || 'BRL',
    createdAt: b.created_at,
  }))
}

/**
 * Retrieves a single profile boost by ID.
 */
export async function getProfileBoostById(id: string): Promise<ProfileBoost | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profile_boosts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as ProfileBoost
}

/**
 * Retrieves all boost campaigns across the platform (for Admin dashboard).
 */
export async function getAllBoostCampaigns(filter?: {
  status?: BoostCampaignStatus
  cityId?: string
}): Promise<any[]> {
  const admin = createAdminClient()

  let query = admin
    .from('profile_boosts')
    .select(`
      id,
      profile_id,
      scope_type,
      starts_at,
      ends_at,
      status,
      provider,
      provider_payment_id,
      canceled_at,
      cancellation_reason,
      created_at,
      profile:professional_profiles!inner (
        id,
        stage_name,
        slug
      ),
      product:boost_products!inner (
        name,
        code
      ),
      price:boost_prices!inner (
        amount_minor,
        currency
      ),
      city:cities!inner (
        id,
        name
      ),
      location:marketplace_locations (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })

  if (filter?.status) {
    query = query.eq('status', filter.status)
  }
  if (filter?.cityId) {
    query = query.eq('city_id', filter.cityId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[promotions:dal:getAllBoostCampaigns] Error:', error.message)
    return []
  }

  return data || []
}

/**
 * Creates a new boost campaign.
 * Concurrency-safe: if temporal exclusion constraint is violated, returns error.
 */
export async function createBoostCampaign(params: {
  profileId: string
  boostProductId: string
  boostPriceId: string
  scopeType: 'CITY' | 'MARKETPLACE_LOCATION'
  cityId: string
  locationId?: string | null
  startsAt: string
  endsAt: string
  status?: BoostCampaignStatus
  provider?: string | null
  providerPaymentId?: string | null
}): Promise<{ campaign?: ProfileBoost; error?: string }> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profile_boosts')
    .insert({
      profile_id: params.profileId,
      boost_product_id: params.boostProductId,
      boost_price_id: params.boostPriceId,
      scope_type: params.scopeType,
      city_id: params.cityId,
      location_id: params.locationId || null,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      status: params.status || 'PENDING_PAYMENT',
      provider: params.provider || null,
      provider_payment_id: params.providerPaymentId || null,
    })
    .select()
    .single()

  if (error) {
    // Check for exclusion constraint violation (code 23P01)
    if (error.code === '23P01' || error.message?.includes('ex_profile_boosts_no_temporal_overlap')) {
      return { error: 'TEMPORAL_OVERLAP' }
    }
    return { error: error.message }
  }

  return { campaign: data as ProfileBoost }
}

/**
 * Updates a boost campaign's status (e.g. from PENDING_PAYMENT -> ACTIVE or SCHEDULED).
 */
export async function updateBoostCampaignStatus(
  campaignId: string,
  status: BoostCampaignStatus,
  providerPaymentId?: string | null
): Promise<boolean> {
  const admin = createAdminClient()

  const updatePayload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (providerPaymentId !== undefined) {
    updatePayload.provider_payment_id = providerPaymentId
  }

  const { error } = await admin
    .from('profile_boosts')
    .update(updatePayload)
    .eq('id', campaignId)

  return !error
}

/**
 * Cancels a boost campaign administratively.
 */
export async function cancelBoostCampaign(params: {
  campaignId: string
  canceledBy: string
  reason: string
}): Promise<boolean> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('profile_boosts')
    .update({
      status: 'CANCELED',
      canceled_at: new Date().toISOString(),
      canceled_by: params.canceledBy,
      cancellation_reason: params.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.campaignId)

  return !error
}

/**
 * Resolves active sponsored candidates for a search query.
 * Time-aware: evaluates starts_at <= now AND ends_at > now.
 */
export async function resolveActiveSponsoredCandidates(params: {
  cityId: string
  locationId?: string | null
  now?: Date
}): Promise<{
  locationCandidates: SponsoredPlacementCandidate[]
  cityCandidates: SponsoredPlacementCandidate[]
}> {
  const admin = createAdminClient()
  const nowIso = (params.now || new Date()).toISOString()

  // 1. Query all ACTIVE campaigns in this city where time bounds are valid
  const { data, error } = await admin
    .from('profile_boosts')
    .select('id, profile_id, scope_type, city_id, location_id, starts_at, ends_at')
    .eq('city_id', params.cityId)
    .eq('status', 'ACTIVE')
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)

  if (error || !data) {
    console.error('[promotions:dal:resolveActiveSponsoredCandidates] Error:', error?.message)
    return { locationCandidates: [], cityCandidates: [] }
  }

  const locationCandidates: SponsoredPlacementCandidate[] = []
  const cityCandidates: SponsoredPlacementCandidate[] = []

  for (const row of data) {
    const candidate: SponsoredPlacementCandidate = {
      profileId: row.profile_id,
      campaignId: row.id,
      scopeType: row.scope_type as any,
      cityId: row.city_id,
      locationId: row.location_id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    }

    if (row.scope_type === 'MARKETPLACE_LOCATION' && params.locationId && row.location_id === params.locationId) {
      locationCandidates.push(candidate)
    } else if (row.scope_type === 'CITY') {
      cityCandidates.push(candidate)
    }
  }

  return { locationCandidates, cityCandidates }
}
