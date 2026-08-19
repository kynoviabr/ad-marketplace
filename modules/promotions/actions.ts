'use server'

import { requireAccount } from '@/modules/auth/dal'
import { requireAdmin } from '@/modules/moderation/guards'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getProfileLocations } from '@/modules/locations/dal'
import { getPaymentProvider } from '@/modules/billing/providers/registry'
import {
  InitiateBoostCheckoutSchema,
  CancelBoostCampaignSchema,
  type InitiateBoostCheckoutInput,
  type CancelBoostCampaignInput,
} from './schemas'
import {
  getBoostProductById,
  getBoostPriceById,
  createBoostCampaign,
  updateBoostCampaignStatus,
  cancelBoostCampaign,
  getProfileBoostsByProfileId,
  getActiveBoostProducts,
} from './dal'
import { recordBoostActivatedEvent } from '@/modules/analytics/write'
import type { PromotionActionResult, BoostProductDTO, ProfileBoostDTO } from './types'

/**
 * Initiates a boost purchase/campaign for an advertiser's profile.
 *
 * Security & Hardening Invariants:
 * 1. Auth & Ownership: Caller must be the account owner of the target profile.
 * 2. Location Rule: Can only boost cities/locations already linked as service areas.
 * 3. Server-Authoritative Pricing: Resolves amount, currency, duration, and scope from DB.
 * 4. Temporal Integrity: Validates price active status and valid_from/valid_until bounds.
 * 5. Concurrency-Safe Lifecycle: Creates PENDING_PAYMENT -> Mock confirmation -> ACTIVE/SCHEDULED.
 */
export async function initiateBoostCheckoutAction(
  input: InitiateBoostCheckoutInput
): Promise<PromotionActionResult<{ campaignId: string; status: string; checkoutUrl: string }>> {
  try {
    const account = await requireAccount()
    const parsed = InitiateBoostCheckoutSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: 'Dados de destaque inválidos.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const { profileId, boostProductId, boostPriceId, locationId, scheduledStartsAt } = parsed.data

    // 1. Verify profile ownership
    const profile = await getProfileByAccountUserId(account.id)
    if (!profile || profile.id !== profileId) {
      return {
        success: false,
        error: 'Perfil não encontrado ou não pertence a esta conta.',
      }
    }

    // 2. Resolve Product from DB
    const product = await getBoostProductById(boostProductId)
    if (!product || !product.is_active) {
      return {
        success: false,
        error: 'Produto de destaque indisponível ou inativo.',
      }
    }

    // 3. Resolve Price from DB & Validate Temporal Integrity
    const price = await getBoostPriceById(boostPriceId)
    if (!price || !price.is_active || price.boost_product_id !== product.id) {
      return {
        success: false,
        error: 'Preço de destaque inválido para o produto selecionado.',
      }
    }

    const now = new Date()
    if (price.valid_from && new Date(price.valid_from) > now) {
      return { success: false, error: 'Este preço promocional ainda não está vigente.' }
    }
    if (price.valid_until && new Date(price.valid_until) <= now) {
      return { success: false, error: 'Este preço promocional expirou.' }
    }

    // 4. Validate Location / Service Area Eligibility
    const profileLocations = await getProfileLocations(profile.id)
    if (!profileLocations || profileLocations.length === 0) {
      return {
        success: false,
        error: 'O perfil precisa ter pelo menos uma área de atendimento configurada para contratar destaques.',
      }
    }

    let targetCityId: string
    let targetLocationId: string | null = null

    if (product.scope_type === 'MARKETPLACE_LOCATION') {
      if (!locationId) {
        return {
          success: false,
          error: 'Localização específica é obrigatória para destaque de bairro.',
        }
      }

      // Check if location is linked to profile
      const matchingLoc = profileLocations.find((pl) => pl.location_id === locationId)
      if (!matchingLoc || !matchingLoc.location) {
        return {
          success: false,
          error: 'Você só pode impulsionar bairros configurados como suas áreas de atendimento.',
        }
      }

      targetCityId = matchingLoc.location.city_id
      targetLocationId = locationId
    } else {
      // CITY scope — derive city from profile's primary/first location
      const primaryLoc = profileLocations.find((pl) => pl.is_primary) || profileLocations[0]
      if (!primaryLoc || !primaryLoc.location) {
        return { success: false, error: 'Cidade de atendimento não encontrada.' }
      }
      targetCityId = primaryLoc.location.city_id
    }

    // 5. Calculate Timestamps
    const startsAtDate = scheduledStartsAt ? new Date(scheduledStartsAt) : now
    if (startsAtDate < now && Math.abs(now.getTime() - startsAtDate.getTime()) > 60000) {
      return { success: false, error: 'A data de início não pode ser no passado.' }
    }

    const durationMs = product.duration_hours * 60 * 60 * 1000
    const endsAtDate = new Date(startsAtDate.getTime() + durationMs)

    // 6. Step 1 of Lifecycle: Create campaign in PENDING_PAYMENT state
    const { campaign, error: createError } = await createBoostCampaign({
      profileId: profile.id,
      boostProductId: product.id,
      boostPriceId: price.id,
      scopeType: product.scope_type,
      cityId: targetCityId,
      locationId: targetLocationId,
      startsAt: startsAtDate.toISOString(),
      endsAt: endsAtDate.toISOString(),
      status: 'PENDING_PAYMENT',
      provider: 'MOCK',
    })

    if (createError || !campaign) {
      if (createError === 'TEMPORAL_OVERLAP') {
        return {
          success: false,
          error: 'Você já possui um destaque ativo ou programado para este mesmo período e localização.',
        }
      }
      return {
        success: false,
        error: createError || 'Falha ao registrar pedido de destaque.',
      }
    }

    // 7. Step 2 of Lifecycle: Provider Checkout (Simulated via Provider Abstraction)
    const provider = getPaymentProvider()
    const customer = await provider.createCustomer(account.id, `advertiser-${account.id}@admarketplace.test`)

    const checkout = await provider.createCheckoutSession({
      providerCustomerId: customer.providerCustomerId,
      planCode: product.code,
      priceAmountMinor: price.amount_minor,
      currency: price.currency,
      billingInterval: 'ONCE',
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/boosts?success=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/boosts?canceled=true`,
    })

    // 8. Step 3 of Lifecycle: Mock Confirmation & Status Transition
    // In Mock mode, payment is instantly confirmed
    const finalStatus = startsAtDate <= now ? 'ACTIVE' : 'SCHEDULED'
    await updateBoostCampaignStatus(
      campaign.id,
      finalStatus,
      checkout.providerSubscriptionId || `mock_pay_${Date.now()}`
    )

    if (finalStatus === 'ACTIVE') {
      try {
        await recordBoostActivatedEvent({
          id: campaign.id,
          profile_id: profile.id,
          city_id: targetCityId,
          location_id: targetLocationId,
          starts_at: startsAtDate.toISOString(),
        })
      } catch (err: any) {
        console.error('[promotions:actions] Failed to record BOOST_ACTIVATED analytics event:', err?.message)
      }
    }

    return {
      success: true,
      data: {
        campaignId: campaign.id,
        status: finalStatus,
        checkoutUrl: checkout.checkoutUrl,
      },
    }
  } catch (err: any) {
    console.error('[promotions:actions:initiateBoostCheckout] Unhandled error:', err?.message)
    return {
      success: false,
      error: err?.message || 'Erro inesperado ao contratar destaque.',
    }
  }
}

/**
 * Admin action to cancel an active/scheduled boost campaign.
 */
export async function cancelBoostCampaignAction(
  input: CancelBoostCampaignInput
): Promise<PromotionActionResult<{ campaignId: string }>> {
  try {
    const admin = await requireAdmin()
    const parsed = CancelBoostCampaignSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: 'Dados de cancelamento inválidos.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }
    }

    const ok = await cancelBoostCampaign({
      campaignId: parsed.data.campaignId,
      canceledBy: admin.id,
      reason: parsed.data.reason,
    })

    if (!ok) {
      return { success: false, error: 'Falha ao cancelar campanha de destaque.' }
    }

    return { success: true, data: { campaignId: parsed.data.campaignId } }
  } catch (err: any) {
    console.error('[promotions:actions:cancelBoostCampaign] Error:', err?.message)
    return { success: false, error: err?.message || 'Erro ao cancelar campanha.' }
  }
}

/**
 * Retrieves the current advertiser's boost campaigns and catalog.
 */
export async function getAdvertiserBoostsAction(): Promise<
  PromotionActionResult<{
    products: BoostProductDTO[]
    campaigns: ProfileBoostDTO[]
  }>
> {
  try {
    const account = await requireAccount()
    const profile = await getProfileByAccountUserId(account.id)

    if (!profile) {
      return {
        success: false,
        error: 'Perfil profissional não encontrado.',
      }
    }

    const [products, campaigns] = await Promise.all([
      getActiveBoostProducts(),
      getProfileBoostsByProfileId(profile.id),
    ])

    return {
      success: true,
      data: {
        products,
        campaigns,
      },
    }
  } catch (err: any) {
    console.error('[promotions:actions:getAdvertiserBoosts] Error:', err?.message)
    return {
      success: false,
      error: err?.message || 'Erro ao carregar destaques.',
    }
  }
}
