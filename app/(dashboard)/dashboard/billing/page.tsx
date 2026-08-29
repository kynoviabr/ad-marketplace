import Link from 'next/link'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { requireAccount } from '@/modules/auth/dal'
import { getBillingAction } from '@/modules/billing/actions'
import { getActiveOverride, getActivePlans, getActivePricesForPlan } from '@/modules/billing/dal'
import { hasPublicationEntitlement } from '@/modules/billing/entitlements'
import type { BillingDTO, SubscriptionStatus } from '@/modules/billing/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plano | Velvet', robots: 'noindex, nofollow' }

const statusCopy: Record<SubscriptionStatus, { label: string; detail: string }> = {
  ACTIVE: { label: 'Acesso ativo', detail: 'Seu plano está vigente.' },
  PAST_DUE: { label: 'Pagamento pendente', detail: 'O provedor ainda está tentando processar o pagamento.' },
  GRACE_PERIOD: { label: 'Período de tolerância', detail: 'Seu acesso permanece temporariamente ativo durante o prazo indicado.' },
  INCOMPLETE: { label: 'Ativação incompleta', detail: 'A configuração do plano ainda não foi concluída.' },
  EXPIRED: { label: 'Acesso encerrado', detail: 'Este plano não concede mais direito de publicação.' },
}

const monthNames = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']
function formatDate(value: string | null) {
  if (!value) return null
  const [date] = value.split('T')
  const [year, month, day] = date.split('-').map(Number)
  return `${String(day).padStart(2, '0')} de ${monthNames[month - 1] ?? ''} de ${year}`
}

function AccessDetails({ billing, hasEntitlement, hasOverride, overrideExpiry }: { billing: BillingDTO | null; hasEntitlement: boolean; hasOverride: boolean; overrideExpiry: string | null }) {
  const status = billing ? statusCopy[billing.status] : null
  const accessName = billing?.isFreeLaunch ? 'Acesso de lançamento' : billing?.planName ?? (hasOverride ? 'Acesso administrativo' : 'Sem plano ativo')
  const periodEnd = billing ? formatDate(billing.currentPeriodEnd) : null
  const graceEnd = billing ? formatDate(billing.gracePeriodEnd) : null

  return <section className={`billing-access billing-access--${hasEntitlement ? 'active' : 'inactive'}`} aria-labelledby="billing-access-title">
    <div className="billing-access-lead"><p className="dashboard-eyebrow">ACESSO ATUAL</p><h2 id="billing-access-title">{hasEntitlement ? 'Seu acesso à Velvet está ativo.' : 'Seu acesso de publicação não está ativo.'}</h2><p>{billing?.isFreeLaunch ? 'Você faz parte do período de lançamento e não há cobrança para este acesso.' : status?.detail ?? (hasEntitlement ? 'Uma liberação administrativa mantém seu direito de publicação ativo.' : 'Não há uma assinatura ou liberação administrativa vigente para esta conta.')}</p></div>
    <dl>
      <div><dt>Modalidade</dt><dd>{accessName}</dd></div>
      <div><dt>Status</dt><dd>{status?.label ?? (hasEntitlement ? 'Acesso ativo' : 'Sem acesso')}</dd></div>
      {billing ? <div><dt>Valor</dt><dd>{billing.priceDisplay}</dd></div> : null}
      {periodEnd ? <div><dt>{billing?.cancelAtPeriodEnd ? 'Acesso até' : 'Período atual'}</dt><dd>{periodEnd}</dd></div> : null}
      {graceEnd ? <div><dt>Tolerância até</dt><dd>{graceEnd}</dd></div> : null}
      {!billing && hasOverride && overrideExpiry ? <div><dt>Liberação até</dt><dd>{formatDate(overrideExpiry) ?? 'Sem data definida'}</dd></div> : null}
    </dl>
    {billing?.cancelAtPeriodEnd ? <p className="billing-access-note">Este acesso não será renovado e termina na data indicada.</p> : null}
  </section>
}

export default async function BillingPage() {
  const account = await requireAccount()
  const [billingResult, override, publicationEntitlement] = await Promise.all([
    getBillingAction(),
    getActiveOverride(account.id),
    hasPublicationEntitlement(account.id),
  ])
  const billing = billingResult.success ? billingResult.data : null
  const shouldOfferPlans = !publicationEntitlement && !billing
  const plans = shouldOfferPlans ? await getActivePlans() : []
  const plansWithPrices = shouldOfferPlans ? await Promise.all(plans.map(async (plan) => ({ plan, prices: await getActivePricesForPlan(plan.id) }))) : []

  return <div className="velvet-dashboard velvet-billing">
    <ProfessionalDashboardHeader activeHref="/dashboard/billing" />
    <main>
      <section className="billing-intro"><div><p className="dashboard-eyebrow">PLANO</p><h1>Sua presença na Velvet.</h1></div><p>Acompanhe as condições que mantêm seu acesso profissional e o direito de publicação.</p></section>

      {!billingResult.success ? <p className="billing-notice billing-notice--alert" role="alert">Não foi possível carregar todos os detalhes de billing agora. O direito de publicação continua sendo validado pelo servidor.</p> : null}

      <AccessDetails billing={billing} hasEntitlement={publicationEntitlement} hasOverride={Boolean(override)} overrideExpiry={override?.expires_at ?? null} />

      {shouldOfferPlans ? <section className="billing-options" aria-labelledby="billing-options-title"><div className="billing-section-heading"><p className="dashboard-eyebrow">ACESSO DISPONÍVEL</p><h2 id="billing-options-title">Condições em preparação.</h2><p>A Velvet ainda não integrou um provedor real de pagamentos. Planos e preços abaixo são registros de produto e não podem ser contratados neste momento.</p></div>
        {plansWithPrices.length ? <div className="billing-plan-list">{plansWithPrices.map(({ plan, prices }) => {
          const price = prices.find((item) => item.amount_minor > 0 && item.is_active)
          const priceDisplay = price ? `R$ ${(price.amount_minor / 100).toFixed(2).replace('.', ',')} / ${price.billing_interval === 'MONTH' ? 'mês' : 'ano'}` : 'Sem oferta paga disponível'
          return <article key={plan.id}><div><p className="dashboard-eyebrow">PLANO</p><h3>{plan.name}</h3>{plan.description ? <p>{plan.description}</p> : null}</div><div><strong>{priceDisplay}</strong><span>{price ? 'Contratação ainda não disponível.' : 'Ativação indisponível no momento.'}</span></div></article>
        })}</div> : <p className="billing-no-plans">Nenhum plano está disponível no momento. Seu perfil não será apresentado como publicado sem entitlement válido.</p>}
      </section> : null}

      <section className="billing-publication" aria-labelledby="billing-publication-title"><div><p className="dashboard-eyebrow">PUBLICAÇÃO</p><h2 id="billing-publication-title">Acesso é uma parte da jornada.</h2></div><div><p>{publicationEntitlement ? 'Seu acesso permite que o perfil permaneça publicado enquanto os demais critérios da Velvet estiverem atendidos.' : 'Sem acesso vigente, a publicação permanece bloqueada mesmo que as outras etapas estejam completas.'}</p><p>A decisão final continua sendo feita pela elegibilidade canônica, que também considera perfil, verificação, regiões, fotos e moderação.</p><Link href="/onboarding/revisar">Revisar publicação <span aria-hidden="true">→</span></Link></div></section>
    </main>
  </div>
}
