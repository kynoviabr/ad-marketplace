'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAccount } from '@/modules/auth/dal'
import { requireAdmin } from '@/modules/moderation/guards'
import {
  InitiateCheckoutSchema,
  CancelSubscriptionSchema,
  GrantOverrideSchema,
  RevokeOverrideSchema,
  CreateFreeLaunchSchema,
  GrantFounderBenefitSchema,
  RevokeFounderBenefitSchema,
} from './schemas'
import type { InitiateCheckoutInput, CancelSubscriptionInput, GrantOverrideInput, RevokeOverrideInput, CreateFreeLaunchInput, GrantFounderBenefitInput, RevokeFounderBenefitInput } from './schemas'
import type { BillingActionResult, Subscription, BillingDTO } from './types'
import { getActiveSubscription, getPriceById, getSubscriptionWithPlan } from './dal'
import { getPaymentProvider } from './providers/registry'
import { DEFAULT_CURRENCY } from './constants'
import { isSubscriptionPublicationEligible } from './subscription-eligibility'

const FOUNDER_GRANT_SOURCE = 'FOUNDER_LAUNCH'

async function createFounderFreeLaunch(input: {
  accountUserId: string
  grantedBy: string
  periodEnd: string
}): Promise<BillingActionResult<Subscription>> {
  const admin = createAdminClient()
  const { data: existingSubscriptions, error: existingError } = await admin
    .from('subscriptions')
    .select('*, plan:subscription_plans(code), price:plan_prices(price_code)')
    .eq('account_user_id', input.accountUserId)
    .in('status', ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE'])

  if (existingError) return { success: false, error: 'Não foi possível verificar o acesso atual.' }

  const existingFounder = (existingSubscriptions ?? []).find((subscription: any) => {
    const plan = Array.isArray(subscription.plan) ? subscription.plan[0] : subscription.plan
    const price = Array.isArray(subscription.price) ? subscription.price[0] : subscription.price
    return plan?.code === 'FOUNDER' && price?.price_code === 'LAUNCH_FREE'
  })
  if (existingFounder && isSubscriptionPublicationEligible(existingFounder)) {
    return { success: true, data: existingFounder as Subscription }
  }
  if ((existingSubscriptions ?? []).length > 0) {
    return { success: false, error: 'Já existe uma assinatura não encerrada para esta conta.' }
  }

  const { data: plan } = await admin.from('subscription_plans').select('id').eq('code', 'FOUNDER').eq('is_active', true).single()
  if (!plan) return { success: false, error: 'Plano FOUNDER não encontrado ou inativo.' }

  const [{ data: price }, { data: publicationEntitlement }] = await Promise.all([
    admin.from('plan_prices').select('id, amount_minor').eq('plan_id', plan.id).eq('price_code', 'LAUNCH_FREE').eq('is_active', true).single(),
    admin.from('plan_entitlements').select('id').eq('plan_id', plan.id).eq('code', 'PROFILE_PUBLICATION').eq('value_bool', true).maybeSingle(),
  ])
  if (!price || price.amount_minor !== 0) return { success: false, error: 'Preço LAUNCH_FREE não encontrado ou inválido.' }
  if (!publicationEntitlement) return { success: false, error: 'O plano FOUNDER não concede publicação.' }

  const now = new Date().toISOString()
  const { data: subscription, error } = await admin.from('subscriptions').insert({
    account_user_id: input.accountUserId,
    plan_id: plan.id,
    price_id: price.id,
    provider: null,
    provider_customer_id: null,
    provider_subscription_id: null,
    status: 'ACTIVE',
    current_period_start: now,
    current_period_end: input.periodEnd,
    cancel_at_period_end: false,
    granted_by: input.grantedBy,
    grant_source: FOUNDER_GRANT_SOURCE,
  }).select('*').single()

  if (error || !subscription) {
    if (error?.code === '23505') return { success: false, error: 'Já existe uma assinatura ativa para esta conta.' }
    console.error('[billing:founderGrant] Insert error:', error?.message)
    return { success: false, error: 'Não foi possível conceder o benefício Founder.' }
  }
  return { success: true, data: subscription as Subscription }
}

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

    const periodEnd = validated.data.periodEnd
    if (!periodEnd) return { success: false, error: 'A data final explícita é obrigatória.' }
    return createFounderFreeLaunch({ accountUserId: validated.data.accountUserId, grantedBy: adminAccount.id, periodEnd })
  } catch (err) {
    console.error('[billing:freeLaunch] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao criar a assinatura gratuita.' }
  }
}

export async function grantFounderBenefitAction(
  input: GrantFounderBenefitInput
): Promise<BillingActionResult<Subscription>> {
  try {
    const adminAccount = await requireAdmin()
    const validated = GrantFounderBenefitSchema.safeParse(input)
    if (!validated.success) return { success: false, error: 'Perfil inválido.' }

    const admin = createAdminClient()
    const { data: targets, error } = await admin
      .from('professional_profiles')
      .select('id, account_user_id, account:account_users!inner(id, status)')
      .eq('id', validated.data.profileId)
      .limit(2)
    if (error || !targets || targets.length !== 1) return { success: false, error: 'Perfil profissional não encontrado.' }
    const target = targets[0] as any
    const account = Array.isArray(target.account) ? target.account[0] : target.account
    if (!account || account.id !== target.account_user_id || account.status !== 'ACTIVE') {
      return { success: false, error: 'A conta vinculada ao perfil não está apta para o benefício.' }
    }

    const periodEnd = new Date()
    periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 3)
    const result = await createFounderFreeLaunch({ accountUserId: target.account_user_id, grantedBy: adminAccount.id, periodEnd: periodEnd.toISOString() })
    if (result.success) {
      await admin.from('billing_admin_audit_logs').insert({ actor_account_user_id: adminAccount.id, target_account_user_id: target.account_user_id, action: 'FOUNDER_GRANTED', subject_id: result.data.id, metadata: { profile_id: target.id } })
      revalidatePath('/admin/billing')
    }
    return result
  } catch (err) {
    console.error('[billing:founderGrant] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao conceder o benefício Founder.' }
  }
}

export async function revokeFounderBenefitAction(input: RevokeFounderBenefitInput): Promise<BillingActionResult<void>> {
  try {
    const adminAccount = await requireAdmin()
    const validated = RevokeFounderBenefitSchema.safeParse(input)
    if (!validated.success) return { success: false, error: 'Perfil inválido.' }
    const admin = createAdminClient()
    const { data: profile } = await admin.from('professional_profiles').select('id, account_user_id').eq('id', validated.data.profileId).maybeSingle()
    if (!profile) return { success: false, error: 'Perfil profissional não encontrado.' }
    const { data: subscriptions } = await admin.from('subscriptions').select('id, plan:subscription_plans!inner(code)').eq('account_user_id', profile.account_user_id).in('status', ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE'])
    const founder = (subscriptions ?? []).find((item: any) => (Array.isArray(item.plan) ? item.plan[0] : item.plan)?.code === 'FOUNDER')
    if (!founder) return { success: false, error: 'Benefício Founder ativo não encontrado.' }
    const now = new Date().toISOString()
    const { error } = await admin.from('subscriptions').update({ status: 'EXPIRED', subscription_state: 'EXPIRED', canceled_at: now, cancellation_reason: 'ADMIN_FOUNDER_REVOKED', updated_at: now }).eq('id', founder.id)
    if (error) return { success: false, error: 'Não foi possível revogar o benefício Founder.' }
    await admin.from('billing_admin_audit_logs').insert({ actor_account_user_id: adminAccount.id, target_account_user_id: profile.account_user_id, action: 'FOUNDER_REVOKED', subject_id: founder.id, metadata: { profile_id: profile.id } })
    revalidatePath('/admin/billing')
    return { success: true, data: undefined }
  } catch (err) {
    console.error('[billing:founderRevoke] Error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Ocorreu um erro ao revogar o benefício Founder.' }
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
