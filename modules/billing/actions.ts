'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAccount } from '@/modules/auth/dal'
import { requireAdmin } from '@/modules/moderation/guards'
import {
  InitiateCheckoutSchema,
  CancelSubscriptionSchema,
  GrantOverrideSchema,
  RevokeOverrideSchema,
  CreateFreeLaunchSchema,
} from './schemas'
import type { InitiateCheckoutInput, CancelSubscriptionInput, GrantOverrideInput, RevokeOverrideInput, CreateFreeLaunchInput } from './schemas'
import type { BillingActionResult, Subscription, BillingDTO } from './types'
import { getActiveSubscription, getPriceById, getSubscriptionWithPlan } from './dal'
import { getPaymentProvider } from './providers/registry'
import { DEFAULT_CURRENCY } from './constants'

/**
 * Server Action: Create a free-launch subscription.
 * Used for FOUNDER plan with LAUNCH_FREE price (amount=0).
 * Creates subscription directly as ACTIVE with provider=NULL.
 */
export async function createFreeLaunchAction(
  input: CreateFreeLaunchInput
): Promise<BillingActionResult<Subscription>> {
  try {
    const adminAccount = await requireAdmin()

    const validated = CreateFreeLaunchSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: 'Dados inválidos.', fieldErrors: validated.error.flatten().fieldErrors }
    }

    const admin = createAdminClient()

    // 1. Verify no active subscription
    const existing = await getActiveSubscription(validated.data.accountUserId)
    if (existing) {
      return { success: false, error: 'Já existe uma assinatura ativa para esta conta.' }
    }

    // 2. Get FOUNDER plan and LAUNCH_FREE price
    const { data: plan } = await admin
      .from('subscription_plans')
      .select('id')
      .eq('code', 'FOUNDER')
      .eq('is_active', true)
      .single()

    if (!plan) {
      return { success: false, error: 'Plano FOUNDER não encontrado ou inativo.' }
    }

    const { data: price } = await admin
      .from('plan_prices')
      .select('id, amount_minor')
      .eq('plan_id', plan.id)
      .eq('price_code', 'LAUNCH_FREE')
      .eq('is_active', true)
      .single()

    if (!price || price.amount_minor !== 0) {
      return { success: false, error: 'Preço LAUNCH_FREE não encontrado ou inválido.' }
    }

    // 3. Create subscription ACTIVE directly (no provider, no checkout)
    const now = new Date().toISOString()
    const { data: subscription, error: insertError } = await admin
      .from('subscriptions')
      .insert({
        account_user_id: validated.data.accountUserId,
        plan_id: plan.id,
        price_id: price.id,
        provider: null,
        provider_customer_id: null,
        provider_subscription_id: null,
        status: 'ACTIVE',
        current_period_start: now,
        current_period_end: validated.data.periodEnd || null,
        cancel_at_period_end: false,
      })
      .select('*')
      .single()

    if (insertError || !subscription) {
      if (insertError?.code === '23505') {
        return { success: false, error: 'Já existe uma assinatura ativa para esta conta.' }
      }
      console.error('[billing:freeLaunch] Insert error:', insertError?.message)
      return { success: false, error: 'Não foi possível criar a assinatura.' }
    }

    return { success: true, data: subscription as Subscription }
  } catch (err) {
    console.error('[billing:freeLaunch] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao criar a assinatura gratuita.' }
  }
}

/**
 * Server Action: Initiate a paid checkout.
 * Client sends plan_id + price_id only. Amount resolved server-side.
 */
export async function initiateCheckoutAction(
  input: InitiateCheckoutInput
): Promise<BillingActionResult<{ checkoutUrl: string }>> {
  try {
    const account = await requireAccount()

    const validated = InitiateCheckoutSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: 'Dados inválidos.', fieldErrors: validated.error.flatten().fieldErrors }
    }

    const admin = createAdminClient()

    // 1. Verify no active subscription
    const existing = await getActiveSubscription(account.id)
    if (existing && existing.status !== 'EXPIRED') {
      return { success: false, error: 'Já existe uma assinatura ativa.' }
    }

    // 2. Server-side price resolution — NEVER trust client amount
    const { data: plan } = await admin
      .from('subscription_plans')
      .select('*')
      .eq('id', validated.data.planId)
      .eq('is_active', true)
      .single()

    if (!plan) {
      return { success: false, error: 'Plano não encontrado ou inativo.' }
    }

    const price = await getPriceById(validated.data.priceId)
    if (!price) {
      return { success: false, error: 'Preço não encontrado.' }
    }

    // 3. Price integrity validation
    if (price.plan_id !== plan.id) {
      return { success: false, error: 'Preço não pertence ao plano selecionado.' }
    }
    if (!price.is_active) {
      return { success: false, error: 'Preço não está ativo.' }
    }
    const now = new Date()
    if (price.valid_from && new Date(price.valid_from) > now) {
      return { success: false, error: 'Preço ainda não está disponível.' }
    }
    if (price.valid_until && new Date(price.valid_until) <= now) {
      return { success: false, error: 'Preço expirado.' }
    }
    if (price.amount_minor <= 0) {
      return { success: false, error: 'Use a criação gratuita para preços sem custo.' }
    }

    // 4. Create provider customer and checkout session
    const provider = getPaymentProvider()
    const customer = await provider.createCustomer(account.id, account.auth_user_id)
    const checkout = await provider.createCheckoutSession({
      providerCustomerId: customer.providerCustomerId,
      planCode: plan.code,
      priceAmountMinor: price.amount_minor,
      currency: price.currency,
      billingInterval: price.billing_interval,
      successUrl: validated.data.successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/dashboard/billing?success=true`,
      cancelUrl: validated.data.cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/dashboard/billing?canceled=true`,
    })

    // 5. Create INCOMPLETE subscription
    await admin
      .from('subscriptions')
      .insert({
        account_user_id: account.id,
        plan_id: plan.id,
        price_id: price.id,
        provider: provider.providerId,
        provider_customer_id: customer.providerCustomerId,
        provider_subscription_id: checkout.providerSubscriptionId,
        status: 'INCOMPLETE',
      })

    return { success: true, data: { checkoutUrl: checkout.checkoutUrl } }
  } catch (err) {
    console.error('[billing:checkout] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao iniciar o checkout.' }
  }
}

/**
 * Server Action: Cancel subscription at period end.
 */
export async function cancelSubscriptionAction(
  input: CancelSubscriptionInput
): Promise<BillingActionResult<void>> {
  try {
    const account = await requireAccount()

    const validated = CancelSubscriptionSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: 'Dados inválidos.' }
    }

    const admin = createAdminClient()

    // 1. Verify subscription belongs to advertiser
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('*')
      .eq('id', validated.data.subscriptionId)
      .eq('account_user_id', account.id)
      .single()

    if (!subscription) {
      return { success: false, error: 'Assinatura não encontrada.' }
    }

    if (subscription.status !== 'ACTIVE') {
      return { success: false, error: 'Apenas assinaturas ativas podem ser canceladas.' }
    }

    // 2. Cancel via provider if applicable
    if (subscription.provider && subscription.provider_subscription_id) {
      const provider = getPaymentProvider()
      await provider.cancelSubscription(subscription.provider_subscription_id, true)
    }

    // 3. Set cancel_at_period_end (status stays ACTIVE)
    await admin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        cancellation_reason: 'USER_REQUESTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    return { success: true, data: undefined }
  } catch (err) {
    console.error('[billing:cancel] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao cancelar a assinatura.' }
  }
}

/**
 * Server Action: Admin grant billing override.
 */
export async function grantOverrideAction(
  input: GrantOverrideInput
): Promise<BillingActionResult<void>> {
  try {
    const adminAccount = await requireAdmin()

    const validated = GrantOverrideSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: 'Dados inválidos.', fieldErrors: validated.error.flatten().fieldErrors }
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('billing_overrides')
      .insert({
        account_user_id: validated.data.accountUserId,
        reason: validated.data.reason,
        granted_by: adminAccount.id,
        expires_at: validated.data.expiresAt || null,
      })

    if (error) {
      console.error('[billing:override] Insert error:', error.message)
      return { success: false, error: 'Não foi possível criar o override.' }
    }

    return { success: true, data: undefined }
  } catch (err) {
    console.error('[billing:override] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao conceder override.' }
  }
}

/**
 * Server Action: Admin revoke billing override.
 */
export async function revokeOverrideAction(
  input: RevokeOverrideInput
): Promise<BillingActionResult<void>> {
  try {
    const adminAccount = await requireAdmin()

    const validated = RevokeOverrideSchema.safeParse(input)
    if (!validated.success) {
      return { success: false, error: 'Dados inválidos.' }
    }

    const admin = createAdminClient()
    await admin
      .from('billing_overrides')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: adminAccount.id,
      })
      .eq('id', validated.data.overrideId)
      .is('revoked_at', null)

    return { success: true, data: undefined }
  } catch (err) {
    console.error('[billing:revokeOverride] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao revogar override.' }
  }
}

/**
 * Server Action: Get billing DTO for the authenticated advertiser.
 */
export async function getBillingAction(): Promise<BillingActionResult<BillingDTO | null>> {
  try {
    const account = await requireAccount()
    const result = await getSubscriptionWithPlan(account.id)

    if (!result) {
      return { success: true, data: null }
    }

    const { subscription, plan, price } = result
    const amountFormatted = price.amount_minor === 0
      ? 'Gratuito'
      : `R$ ${(price.amount_minor / 100).toFixed(2).replace('.', ',')} / ${price.billing_interval === 'MONTH' ? 'mês' : 'ano'}`

    const dto: BillingDTO = {
      planName: plan.name,
      planCode: plan.code,
      status: subscription.status,
      priceDisplay: amountFormatted,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      gracePeriodEnd: subscription.grace_period_end,
      isFreeLaunch: price.amount_minor === 0,
    }

    return { success: true, data: dto }
  } catch (err) {
    console.error('[billing:getDTO] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao carregar informações de billing.' }
  }
}
