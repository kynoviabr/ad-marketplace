import { requireAccount } from '@/modules/auth/dal'
import { getBillingAction } from '@/modules/billing/actions'
import { getActivePlans, getActivePricesForPlan } from '@/modules/billing/dal'
import { SubscriptionStatus } from '@/components/billing/subscription-status'
import { CheckoutButton } from '@/components/billing/checkout-button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Assinatura e Cobrança — AD-Marketplace',
  robots: 'noindex, nofollow',
}

interface BillingPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  // Enforce account auth
  await requireAccount()
  const resolvedSearchParams = await searchParams

  const isSuccess = resolvedSearchParams.success === 'true'
  const isCanceled = resolvedSearchParams.canceled === 'true'

  const billingRes = await getBillingAction()
  const billing = billingRes.success ? billingRes.data : null

  // Fetch available active plans and prices
  const plans = await getActivePlans()
  const plansWithPrices = await Promise.all(
    plans.map(async (plan) => {
      const prices = await getActivePricesForPlan(plan.id)
      return { plan, prices }
    })
  )

  const hasActiveBilling =
    billing !== null &&
    ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'INCOMPLETE'].includes(billing.status)

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Link
            href="/dashboard"
            style={{ color: '#9ca3af', fontSize: '0.875rem', textDecoration: 'none' }}
          >
            ← Voltar ao Dashboard
          </Link>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
          Assinatura & Cobrança
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '0.25rem' }}>
          Gerencie seu plano de anúncio, status de pagamento e benefícios contratados.
        </p>
      </div>

      {isSuccess && (
        <div
          style={{
            backgroundColor: '#064e3b',
            color: '#a7f3d0',
            border: '1px solid #059669',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          ✓ Pagamento confirmado com sucesso! Sua assinatura foi atualizada.
        </div>
      )}

      {isCanceled && (
        <div
          style={{
            backgroundColor: '#78350f',
            color: '#fde68a',
            border: '1px solid #f59e0b',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}
        >
          O processo de checkout foi cancelado. Nenhuma cobrança foi efetuada.
        </div>
      )}

      {hasActiveBilling && billing ? (
        <div>
          <SubscriptionStatus
            status={billing.status}
            planName={billing.planName}
            priceDisplay={billing.priceDisplay}
            currentPeriodEnd={billing.currentPeriodEnd}
            cancelAtPeriodEnd={billing.cancelAtPeriodEnd}
            gracePeriodEnd={billing.gracePeriodEnd}
            isFreeLaunch={billing.isFreeLaunch}
          />
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.5rem' }}>
              Escolha seu Plano de Anúncio
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Selecione um dos planos disponíveis para publicar seu anúncio e liberar todas as funcionalidades.
            </p>
          </div>

          {plansWithPrices.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem',
                backgroundColor: '#1f2937',
                borderRadius: '0.5rem',
                color: '#9ca3af',
              }}
            >
              Nenhum plano disponível no momento.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {plansWithPrices.map(({ plan, prices }) => {
                const paidPrice = prices.find((p) => p.amount_minor > 0 && p.is_active) || prices[0]
                const isPromotional = paidPrice?.is_promotional ?? false
                const priceFormatted =
                  !paidPrice || paidPrice.amount_minor === 0
                    ? 'Gratuito'
                    : `R$ ${(paidPrice.amount_minor / 100).toFixed(2).replace('.', ',')} / ${
                        paidPrice.billing_interval === 'MONTH' ? 'mês' : 'ano'
                      }`

                return (
                  <div
                    key={plan.id}
                    style={{
                      backgroundColor: '#1f2937',
                      borderRadius: '0.75rem',
                      border: isPromotional ? '2px solid #f59e0b' : '1px solid #374151',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                    }}
                  >
                    {isPromotional && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-0.75rem',
                          right: '1rem',
                          backgroundColor: '#f59e0b',
                          color: '#111827',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                        }}
                      >
                        Promoção
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                          {plan.name}
                        </h3>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            backgroundColor: '#374151',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {plan.code}
                        </span>
                      </div>

                      {plan.description && (
                        <p
                          style={{
                            fontSize: '0.875rem',
                            color: '#9ca3af',
                            marginBottom: '1rem',
                            lineHeight: '1.4',
                          }}
                        >
                          {plan.description}
                        </p>
                      )}

                      <div
                        style={{
                          fontSize: '1.75rem',
                          fontWeight: 800,
                          color: '#ffffff',
                          margin: '1rem 0 1.5rem 0',
                        }}
                      >
                        {priceFormatted}
                      </div>
                    </div>

                    {paidPrice && paidPrice.amount_minor > 0 && (
                      <CheckoutButton
                        planId={plan.id}
                        priceId={paidPrice.id}
                        label="Assinar Plano"
                        disabled={false}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
