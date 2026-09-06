import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { getProfessionalAnalyticsOverview } from '@/modules/analytics/dal'
import type { AnalyticsPeriodDays, ProfessionalAnalyticsOverviewDTO } from '@/modules/analytics/types'
import { requireAccount } from '@/modules/auth/dal'
import { isProfileCanonicallyEligible } from '@/modules/publication/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getRequestLocale } from '@/lib/i18n/server'
import { logger } from '@/modules/observability/logger'
import { AnalyticsPeriodSelector } from '@/components/dashboard/analytics/analytics-period-selector'
import { AnalyticsKpiGrid } from '@/components/dashboard/analytics/analytics-kpi-grid'
import { AnalyticsFunnelCard } from '@/components/dashboard/analytics/analytics-funnel-card'
import { AnalyticsDailyTrend } from '@/components/dashboard/analytics/analytics-daily-trend'
import { AnalyticsLocationBreakdown } from '@/components/dashboard/analytics/analytics-location-breakdown'
import { AnalyticsPeakTimes } from '@/components/dashboard/analytics/analytics-peak-times'
import { AnalyticsPlacementBreakdown } from '@/components/dashboard/analytics/analytics-placement-breakdown'
import { AnalyticsAudienceBadge } from '@/components/dashboard/analytics/analytics-audience-badge'
import { AnalyticsDefinitionsGuide } from '@/components/dashboard/analytics/analytics-definitions-guide'
import { AnalyticsEmptyState } from '@/components/dashboard/analytics/analytics-empty-state'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Analytics 2.0 | velvet.', robots: 'noindex, nofollow' }

interface AdvertiserAnalyticsPageProps {
  searchParams: Promise<{ days?: string; period?: string }>
}

export default async function AdvertiserAnalyticsPage({ searchParams }: AdvertiserAnalyticsPageProps) {
  // 1. Authoritative Session & Role Verification
  const account = await requireAccount()
  if (account.role === 'CLIENT') {
    redirect('/cliente')
  }
  if (account.role !== 'ADVERTISER') {
    redirect('/login')
  }

  // 2. Resolve Profile & Localization
  const [profile, resolvedParams, locale] = await Promise.all([
    getProfileByAccountUserId(account.id),
    searchParams,
    getRequestLocale(),
  ])

  const isPt = locale === 'pt-BR'

  // If professional has no profile setup yet
  if (!profile) {
    return (
      <div className="velvet-dashboard velvet-analytics">
        <ProfessionalDashboardHeader activeHref="/dashboard/analytics" />
        <main>
          <section className="analytics-empty">
            <p className="dashboard-eyebrow">{isPt ? 'ANALYTICS' : 'ANALYTICS'}</p>
            <h1>{isPt ? 'Seu perfil vem primeiro.' : 'Your profile comes first.'}</h1>
            <p>
              {isPt
                ? 'Conclua sua apresentação para começar a acompanhar sua presença e métricas na velvet.'
                : 'Complete your profile presentation to start tracking your performance and engagement.'}
            </p>
            <Link href="/onboarding/voce" className="analytics-empty-link">
              {isPt ? 'Configurar perfil' : 'Set up profile'} <span aria-hidden="true">→</span>
            </Link>
          </section>
        </main>
      </div>
    )
  }

  // 3. Resolve Period (7 | 30 | 90 days, default 30)
  const ranges = [7, 30, 90] as const
  const rawParam = resolvedParams.days ?? resolvedParams.period
  const days: AnalyticsPeriodDays = rawParam === '7' ? 7 : rawParam === '90' ? 90 : 30

  // 4. Fetch Canonical Analytics Overview & Eligibility
  // Canonical query: getProfessionalAnalyticsOverview (supersedes legacy getAdvertiserMetrics(profile.id, days))
  let overview: ProfessionalAnalyticsOverviewDTO | null = null
  let isCanonicallyPublic = false
  let loadError: Error | null = null

  try {
    const [fetchedOverview, isEligible] = await Promise.all([
      getProfessionalAnalyticsOverview({
        profileId: profile.id,
        accountId: account.id,
        periodDays: days,
      }),
      isProfileCanonicallyEligible(account.id, profile.id).catch(() => false),
    ])
    overview = fetchedOverview
    const canonicallyEligible = isEligible
    isCanonicallyPublic = profile.status === 'ACTIVE' && canonicallyEligible
  } catch (err) {
    loadError = err instanceof Error ? err : new Error(String(err))
    logger.error('analytics.professional.overview_failed', {
      subsystem: 'SYSTEM',
      error: loadError,
      metadata: { profileId: profile.id, accountId: account.id, periodDays: days },
    })
  }

  // If query failed unexpectedly
  if (loadError || !overview) {
    return (
      <div className="velvet-dashboard velvet-analytics">
        <ProfessionalDashboardHeader activeHref="/dashboard/analytics" />
        <main>
          <section className="analytics-empty-section">
            <div className="analytics-empty-card">
              <p className="dashboard-eyebrow">{isPt ? 'INSTABILIDADE TEMPORÁRIA' : 'TEMPORARY ISSUE'}</p>
              <h2>{isPt ? 'Não foi possível carregar as métricas.' : 'Could not load metrics.'}</h2>
              <p className="analytics-empty-desc">
                {isPt
                  ? 'Ocorreu um erro ao consultar os dados analíticos agregados. Nenhuma informação foi perdida.'
                  : 'An error occurred while fetching aggregate analytics. No data was lost.'}
              </p>
              <div className="analytics-empty-actions">
                <Link href={`/dashboard/analytics?days=${days}`} className="analytics-empty-link">
                  {isPt ? 'Tentar novamente' : 'Try again'} <span aria-hidden="true">↺</span>
                </Link>
                <Link href="/dashboard" className="analytics-empty-sublink">
                  {isPt ? 'Voltar ao Dashboard' : 'Back to Dashboard'} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // 5. Evaluate Activity Baseline
  const totalActivity =
    overview.funnel.impressions.total +
    overview.funnel.views.total +
    overview.funnel.contacts.total

  const hasActivity = totalActivity > 0

  return (
    <div className="velvet-dashboard velvet-analytics">
      <ProfessionalDashboardHeader activeHref="/dashboard/analytics" />

      <main>
        {/* Intro Header */}
        <section className="analytics-intro">
          <div>
            <p className="dashboard-eyebrow">{isPt ? 'DIÁRIO DE PERFORMANCE' : 'PERFORMANCE JOURNAL'}</p>
            <h1>{isPt ? 'Seu perfil em movimento.' : 'Your profile in motion.'}</h1>
          </div>
          <div>
            <p>
              {isPt
                ? `Acompanhe a visibilidade e o interesse gerado pelo perfil de ${profile.stage_name}.`
                : `Track visibility and engagement generated by ${profile.stage_name}'s profile.`}
            </p>
            {isCanonicallyPublic ? (
              <Link href={`/perfil/${profile.slug}`}>
                {isPt ? 'Ver meu perfil público' : 'View my public profile'} <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <p className="analytics-publication-note">
                {isPt
                  ? 'As métricas continuam sendo registradas mesmo se o perfil não estiver público no momento.'
                  : 'Metrics are continuously tracked even if the profile is not currently public.'}
              </p>
            )}
            {/* Current Audience Context Pill */}
            <AnalyticsAudienceBadge audienceMode={overview.audienceMode} locale={locale} />
          </div>
        </section>

        {/* Period Selector (7 / 30 / 90 days) */}
        <AnalyticsPeriodSelector currentDays={days} locale={locale} />

        {/* If zero activity: render empty state guidance */}
        {!hasActivity ? (
          <>
            <AnalyticsKpiGrid overview={overview} locale={locale} />
            <AnalyticsEmptyState
              isPublic={isCanonicallyPublic}
              profileSlug={profile.slug}
              locale={locale}
            />
            <AnalyticsDefinitionsGuide locale={locale} />
          </>
        ) : (
          <>
            {/* 1. Top KPI Cards */}
            <AnalyticsKpiGrid overview={overview} locale={locale} />

            {/* 2. Visual Conversion Funnel */}
            <AnalyticsFunnelCard overview={overview} locale={locale} />

            {/* 3. Daily Trend SVG Chart */}
            <AnalyticsDailyTrend
              dailyTrend={overview.dailyTrend}
              periodDays={days}
              locale={locale}
            />

            {/* 4. Performance by Service Area */}
            <AnalyticsLocationBreakdown
              topLocations={overview.topLocations}
              locale={locale}
            />

            {/* 5. Peak Engagement Times & Distributions */}
            <AnalyticsPeakTimes
              peakTimes={overview.peakTimes}
              locale={locale}
            />

            {/* 6. Placement Type (Organic vs Sponsored) */}
            <AnalyticsPlacementBreakdown
              overview={overview}
              locale={locale}
            />

            {/* 7. Metric Definitions & Privacy Guide */}
            <AnalyticsDefinitionsGuide locale={locale} />
          </>
        )}
      </main>
    </div>
  )
}
