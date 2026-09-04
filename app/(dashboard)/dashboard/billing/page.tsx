import Link from 'next/link'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { requireAccount } from '@/modules/auth/dal'
import { getTranslations } from '@/lib/i18n/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveOverride, getActivePlans, getActivePricesForPlan } from '@/modules/billing/dal'
import { hasPublicationEntitlement, resolveEntitlements } from '@/modules/billing/entitlements'
import type { SubscriptionStatus } from '@/modules/billing/types'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Plano | velvet.', robots: 'noindex, nofollow' }

const statusCopy: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Acesso ativo', PAST_DUE: 'Pagamento pendente', GRACE_PERIOD: 'Período de tolerância',
  INCOMPLETE: 'Ativação incompleta', EXPIRED: 'Acesso encerrado',
}

export default async function BillingPage() {
  const [account, { locale }] = await Promise.all([requireAccount(), getTranslations()])
  const en = locale === 'en'
  const [entitlements, publicationEntitlement, override] = await Promise.all([
    resolveEntitlements(account.id), hasPublicationEntitlement(account.id), getActiveOverride(account.id),
  ])
  const admin = createAdminClient()
  const { data: profile } = await admin.from('professional_profiles').select('id').eq('account_user_id', account.id).maybeSingle()
  const [{ count: photos }, { count: videos }] = profile ? await Promise.all([
    admin.from('profile_media').select('*', { count: 'exact', head: true }).eq('profile_id', profile.id).is('deleted_at', null),
    admin.from('profile_videos').select('*', { count: 'exact', head: true }).eq('profile_id', profile.id).is('deleted_at', null),
  ]) : [{ count: 0 }, { count: 0 }]
  const catalog = await Promise.all((await getActivePlans()).map(async (plan) => ({ plan, prices: await getActivePricesForPlan(plan.id) })))

  return <div className="velvet-dashboard velvet-billing"><ProfessionalDashboardHeader activeHref="/dashboard/billing" /><main>
    <section className="billing-intro"><div><p className="dashboard-eyebrow">{en ? 'ACCOUNT & PLAN' : 'CONTA E PLANO'}</p><h1>{en ? 'Your velvet. plan.' : 'Seu plano velvet.'}</h1></div><p>{en ? 'See your effective plan, current status, limits and included capabilities.' : 'Veja seu plano efetivo, status atual, limites e recursos incluídos.'}</p></section>
    <section className={`billing-access billing-access--${publicationEntitlement ? 'active' : 'inactive'}`} aria-labelledby="current-plan-title"><div className="billing-access-lead"><p className="dashboard-eyebrow">{en ? 'CURRENT PLAN' : 'PLANO ATUAL'}</p><h2 id="current-plan-title">{entitlements.planName}</h2><p>{entitlements.founder ? (en ? 'Your Founder entitlement is active with no charge for this access.' : 'Acesso de lançamento: seu benefício Founder está ativo e não há cobrança para este acesso.') : override ? (en ? 'Administrative access is active.' : 'Acesso administrativo ativo.') : (en ? 'No payment provider or checkout is currently available.' : 'A velvet. ainda não integrou um provedor real de pagamentos.')}</p></div><dl>
      <div><dt>Status</dt><dd>{statusCopy[entitlements.subscriptionState as SubscriptionStatus] ?? entitlements.subscriptionState}</dd></div><div><dt>Founder</dt><dd>{entitlements.founder ? (en ? 'Yes' : 'Sim') : (en ? 'No' : 'Não')}</dd></div>
      <div><dt>{en ? 'Photos' : 'Fotos'}</dt><dd>{photos ?? 0} / {entitlements.maxPhotos}</dd></div><div><dt>{en ? 'Videos' : 'Vídeos'}</dt><dd>{videos ?? 0} / {entitlements.maxVideos}</dd></div>
      <div><dt>{en ? 'Reviews' : 'Avaliações'}</dt><dd>{entitlements.reviewsAccess ? (en ? 'Included' : 'Incluídas') : (en ? 'Not included' : 'Não incluídas')}</dd></div><div><dt>{en ? 'Premium features' : 'Recursos premium'}</dt><dd>{entitlements.premiumFeatures ? (en ? 'Included' : 'Incluídos') : (en ? 'Not included' : 'Não incluídos')}</dd></div>
      <div><dt>WhatsApp AI</dt><dd>{entitlements.whatsappAi ? (en ? 'Included' : 'Incluído') : (en ? 'Future feature' : 'Recurso futuro')}</dd></div>
    </dl></section>
    <p className="billing-notice billing-notice--muted" role="alert">{en ? 'Checkout is unavailable until a payment provider is selected.' : 'Contratação ainda não disponível até a escolha de um provedor.'}</p>
    <section className="billing-options" aria-labelledby="plans-title"><div className="billing-section-heading"><p className="dashboard-eyebrow">{en ? 'PLAN CATALOG' : 'CATÁLOGO DE PLANOS'}</p><h2 id="plans-title">{en ? 'Commercial options.' : 'Opções comerciais.'}</h2><p>{en ? 'Plans are shown for transparency. Upgrades are not yet available because no payment provider has been selected.' : 'Os planos são exibidos com transparência. Upgrades ainda não estão disponíveis porque nenhum provedor de pagamento foi escolhido.'}</p></div><div className="billing-plan-list">{catalog.map(({ plan: { id, code: planCode, name, description }, prices }) => { const price = prices.find((item) => item.is_active); const label = !price || price.amount_minor === 0 ? (en ? 'Free' : 'Gratuito') : new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency }).format(price.amount_minor / 100); return <article key={id}><div><p className="dashboard-eyebrow">{planCode}</p><h3>{name}</h3>{description ? <p>{description}</p> : null}</div><div><strong>{label}</strong><span>{en ? 'Upgrade unavailable — coming later.' : 'Contratação ainda não disponível.'}</span></div></article> })}</div></section>
    <section className="billing-publication"><div><p className="dashboard-eyebrow">{en ? 'PUBLICATION' : 'PUBLICAÇÃO'}</p><h2>{en ? 'Every gate still applies.' : 'Todas as etapas continuam válidas.'}</h2></div><div><p>{en ? 'Canonical eligibility still checks profile, verification, regions, photos and moderation.' : 'A elegibilidade canônica continua considerando perfil, verificação, regiões, fotos e moderação.'}</p><Link href="/onboarding/revisar">{en ? 'Review publication' : 'Revisar publicação'} <span aria-hidden="true">→</span></Link></div></section>
  </main></div>
}
