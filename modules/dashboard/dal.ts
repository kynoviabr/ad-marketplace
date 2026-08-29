import 'server-only'
import type { AccountUser } from '@/modules/auth/types'
import { getAdvertiserMetrics } from '@/modules/analytics/dal'
import { getActiveOverride, getSubscriptionWithPlan } from '@/modules/billing/dal'
import { hasPublicationEntitlement } from '@/modules/billing/entitlements'
import { getPublicationReviewState } from '@/modules/publication/dal'
import { deriveDashboardPublicationStatus } from './status'
import type { ProfessionalDashboardOverview } from './types'

const billingLabels: Record<string, string> = { ACTIVE: 'Ativo', PAST_DUE: 'Pagamento pendente', GRACE_PERIOD: 'Período de tolerância', INCOMPLETE: 'Configuração incompleta' }

/** Builds the authenticated professional overview from existing canonical domains. */
export async function getProfessionalDashboardOverview(account: AccountUser): Promise<ProfessionalDashboardOverview> {
  const review = await getPublicationReviewState(account)
  const [subscription, override, hasEntitlement, metrics] = await Promise.all([
    getSubscriptionWithPlan(account.id), getActiveOverride(account.id), hasPublicationEntitlement(account.id),
    review.profileId ? getAdvertiserMetrics(review.profileId, 30) : Promise.resolve(null),
  ])
  const billing = subscription
    ? { planName: subscription.plan.name, statusLabel: billingLabels[subscription.subscription.status] ?? 'Indisponível', hasPublicationEntitlement: hasEntitlement, manageHref: '/dashboard/billing' }
    : override
      ? { planName: 'Acesso Velvet', statusLabel: 'Ativo por liberação', hasPublicationEntitlement: hasEntitlement, manageHref: null }
      : { planName: 'Sem plano ativo', statusLabel: 'Publicação indisponível', hasPublicationEntitlement: false, manageHref: '/dashboard/billing' }
  return { review, status: deriveDashboardPublicationStatus(review), billing, metrics }
}
