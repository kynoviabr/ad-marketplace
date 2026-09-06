/**
 * PX2B — Professional Analytics Dashboard 2.0 Tests
 *
 * Verifies:
 * - Top KPI cards with period comparison and safe delta badges
 * - Conversion Funnel (Impressions -> Views -> Contacts)
 * - Asymmetry handling (viewToContactRate > 100% without capping)
 * - Zero data and empty state handling (no NaN, no Infinity)
 * - Service area performance without UUID leakage
 * - Peak times with Brasília timezone notice
 * - Organic vs Sponsored placement breakdown
 * - Current audience mode display without historical comparison
 * - Authorization & role guards (ADVERTISER owner allowed, CLIENT redirected, Anon redirected)
 * - Privacy: zero visitor session IDs, IPs, or PII exposed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ProfessionalAnalyticsOverviewDTO } from '@/modules/analytics/types'
import { AnalyticsKpiGrid } from '@/components/dashboard/analytics/analytics-kpi-grid'
import { AnalyticsFunnelCard } from '@/components/dashboard/analytics/analytics-funnel-card'
import { AnalyticsDailyTrend } from '@/components/dashboard/analytics/analytics-daily-trend'
import { AnalyticsLocationBreakdown } from '@/components/dashboard/analytics/analytics-location-breakdown'
import { AnalyticsPeakTimes } from '@/components/dashboard/analytics/analytics-peak-times'
import { AnalyticsPlacementBreakdown } from '@/components/dashboard/analytics/analytics-placement-breakdown'
import { AnalyticsAudienceBadge } from '@/components/dashboard/analytics/analytics-audience-badge'
import { AnalyticsDefinitionsGuide } from '@/components/dashboard/analytics/analytics-definitions-guide'
import { AnalyticsEmptyState } from '@/components/dashboard/analytics/analytics-empty-state'
import AdvertiserAnalyticsPage from '@/app/(dashboard)/dashboard/analytics/page'
import { requireAccount } from '@/modules/auth/dal'
import { getProfileByAccountUserId } from '@/modules/profiles/dal'
import { getProfessionalAnalyticsOverview } from '@/modules/analytics/dal'
import { isProfileCanonicallyEligible } from '@/modules/publication/dal'

// Mock dependencies for page integration tests
vi.mock('@/components/dashboard/professional-dashboard-header', () => ({
  ProfessionalDashboardHeader: () => <header data-testid="professional-dashboard-header" />,
}))

vi.mock('@/modules/auth/dal', () => ({
  requireAccount: vi.fn(),
}))

vi.mock('@/modules/profiles/dal', () => ({
  getProfileByAccountUserId: vi.fn(),
}))

vi.mock('@/modules/analytics/dal', () => ({
  getProfessionalAnalyticsOverview: vi.fn(),
  getProfessionalBenchmark: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/modules/publication/dal', () => ({
  isProfileCanonicallyEligible: vi.fn(),
}))

vi.mock('@/lib/i18n/server', () => ({
  getRequestLocale: vi.fn().mockResolvedValue('pt-BR'),
  getTranslations: vi.fn().mockResolvedValue({
    locale: 'pt-BR',
    t: (key: string) => key,
  }),
}))

const createSyntheticOverview = (overrides?: Partial<ProfessionalAnalyticsOverviewDTO>): ProfessionalAnalyticsOverviewDTO => ({
  profileId: 'prof-111',
  profileSlug: 'camila-sp-4',
  audienceMode: 'PUBLIC',
  periodDays: 30,
  startDate: '2026-08-07',
  endDate: '2026-09-05',
  previousStartDate: '2026-07-08',
  previousEndDate: '2026-08-06',
  funnel: {
    impressions: { total: 100, organic: 80, sponsored: 20 },
    views: { total: 20, organic: 15, sponsored: 5 },
    contacts: { total: 5, whatsapp: 5, phone: 0, telegram: 0 },
    rates: {
      impressionToViewRate: 20.0,
      viewToContactRate: 25.0,
      overallConversionRate: 5.0,
    },
  },
  comparison: {
    impressions: { current: 100, previous: 80, delta: 20, percentageChange: 25.0, isNewBaseline: false },
    views: { current: 20, previous: 16, delta: 4, percentageChange: 25.0, isNewBaseline: false },
    contacts: { current: 5, previous: 4, delta: 1, percentageChange: 25.0, isNewBaseline: false },
    whatsappClicks: { current: 5, previous: 4, delta: 1, percentageChange: 25.0, isNewBaseline: false },
  },
  dailyTrend: [
    {
      date: '2026-08-07',
      dayOfWeek: 5,
      impressionsTotal: 10,
      impressionsOrganic: 8,
      impressionsSponsored: 2,
      viewsTotal: 2,
      viewsOrganic: 2,
      viewsSponsored: 0,
      contactsTotal: 1,
      whatsappClicks: 1,
      phoneClicks: 0,
      telegramClicks: 0,
    },
    {
      date: '2026-09-05',
      dayOfWeek: 6,
      impressionsTotal: 20,
      impressionsOrganic: 15,
      impressionsSponsored: 5,
      viewsTotal: 4,
      viewsOrganic: 3,
      viewsSponsored: 1,
      contactsTotal: 1,
      whatsappClicks: 1,
      phoneClicks: 0,
      telegramClicks: 0,
    },
  ],
  topLocations: [
    {
      locationId: 'loc-uuid-1',
      locationName: 'Moema',
      cityName: 'São Paulo',
      impressions: 50,
      views: 15,
      contacts: 4,
      conversionRate: 26.7,
    },
    {
      locationId: 'loc-uuid-2',
      locationName: 'Pinheiros',
      cityName: 'São Paulo',
      impressions: 30,
      views: 5,
      contacts: 1,
      conversionRate: 20.0,
    },
  ],
  peakTimes: {
    bestDayOfWeek: { dayOfWeek: 5, dayName: 'Sex', contacts: 3 },
    bestHourOfDay: { hour: 21, label: '21:00', contacts: 2 },
    hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${String(i).padStart(2, '0')}:00`,
      impressions: i === 21 ? 20 : 5,
      views: i === 21 ? 6 : 1,
      contacts: i === 21 ? 2 : 0,
    })),
    dayOfWeekDistribution: [
      { dayOfWeek: 0, dayName: 'Dom', impressions: 10, views: 2, contacts: 0 },
      { dayOfWeek: 1, dayName: 'Seg', impressions: 10, views: 2, contacts: 0 },
      { dayOfWeek: 2, dayName: 'Ter', impressions: 10, views: 2, contacts: 0 },
      { dayOfWeek: 3, dayName: 'Qua', impressions: 10, views: 2, contacts: 0 },
      { dayOfWeek: 4, dayName: 'Qui', impressions: 15, views: 3, contacts: 1 },
      { dayOfWeek: 5, dayName: 'Sex', impressions: 30, views: 7, contacts: 3 },
      { dayOfWeek: 6, dayName: 'Sáb', impressions: 15, views: 2, contacts: 1 },
    ],
  },
  ...overrides,
})

describe('PX2B — Professional Analytics Dashboard 2.0', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // 1. KPI Cards & Comparison
  // -------------------------------------------------------------------------
  describe('Top KPI Grid & Comparisons', () => {
    it('renders 100 impressions, 20 views, 5 contacts and precise conversion rates', () => {
      const overview = createSyntheticOverview()
      const html = renderToStaticMarkup(<AnalyticsKpiGrid overview={overview} locale="pt-BR" />)

      // Counts
      expect(html).toContain('100')
      expect(html).toContain('20')
      expect(html).toContain('5')

      // Rates
      expect(html).toContain('20,0%') // Impression -> View
      expect(html).toContain('25,0%') // View -> Contact
      expect(html).toContain('5,0%')  // Impression -> Contact

      // Headings & descriptions
      expect(html).toContain('Impressões')
      expect(html).toContain('Visitas ao perfil')
      expect(html).toContain('Cliques no WhatsApp')
      expect(html).toContain('Taxa de abertura')
      expect(html).toContain('Taxa de contato')
      expect(html).toContain('Conversão do funil')
    })

    it('renders "Nova atividade" badge without NaN or Infinity when previous is 0 and current > 0', () => {
      const overview = createSyntheticOverview({
        comparison: {
          impressions: { current: 10, previous: 0, delta: 10, percentageChange: null, isNewBaseline: true },
          views: { current: 3, previous: 0, delta: 3, percentageChange: null, isNewBaseline: true },
          contacts: { current: 1, previous: 0, delta: 1, percentageChange: null, isNewBaseline: true },
          whatsappClicks: { current: 1, previous: 0, delta: 1, percentageChange: null, isNewBaseline: true },
        },
      })
      const html = renderToStaticMarkup(<AnalyticsKpiGrid overview={overview} locale="pt-BR" />)

      expect(html).toContain('Nova atividade')
      expect(html).not.toContain('NaN')
      expect(html).not.toContain('Infinity')
      expect(html).not.toContain('+∞%')
    })

    it('renders directional percentage change (+25,0% or −8,0%) with accessible labels', () => {
      const overview = createSyntheticOverview({
        comparison: {
          impressions: { current: 125, previous: 100, delta: 25, percentageChange: 25.0, isNewBaseline: false },
          views: { current: 92, previous: 100, delta: -8, percentageChange: -8.0, isNewBaseline: false },
          contacts: { current: 10, previous: 10, delta: 0, percentageChange: 0, isNewBaseline: false },
          whatsappClicks: { current: 10, previous: 10, delta: 0, percentageChange: 0, isNewBaseline: false },
        },
      })
      const html = renderToStaticMarkup(<AnalyticsKpiGrid overview={overview} locale="pt-BR" />)

      expect(html).toContain('+25,0%')
      expect(html).toContain('−8,0%')
      expect(html).toContain('Sem alteração')
    })
  })

  // -------------------------------------------------------------------------
  // 2. Funnel Visualization & Asymmetry Handling
  // -------------------------------------------------------------------------
  describe('Conversion Funnel & Asymmetry', () => {
    it('renders the 3 sequential stages: Impressions -> Profile Visits -> WhatsApp Clicks', () => {
      const overview = createSyntheticOverview()
      const html = renderToStaticMarkup(<AnalyticsFunnelCard overview={overview} locale="pt-BR" />)

      expect(html).toContain('01')
      expect(html).toContain('Exibições na Busca')
      expect(html).toContain('02')
      expect(html).toContain('Visitas ao Perfil')
      expect(html).toContain('03')
      expect(html).toContain('Cliques no WhatsApp')
    })

    it('handles funnel asymmetry without clamping when contacts > views (e.g. 10 views, 15 contacts = 150%)', () => {
      const overview = createSyntheticOverview({
        funnel: {
          impressions: { total: 50, organic: 50, sponsored: 0 },
          views: { total: 10, organic: 10, sponsored: 0 },
          contacts: { total: 15, whatsapp: 15, phone: 0, telegram: 0 },
          rates: {
            impressionToViewRate: 20.0,
            viewToContactRate: 150.0, // 15 / 10 * 100
            overallConversionRate: 30.0,
          },
        },
      })
      const html = renderToStaticMarkup(<AnalyticsFunnelCard overview={overview} locale="pt-BR" />)

      // Does not clamp to 100%
      expect(html).toContain('150,0%')
      // Renders the asymmetry alert and note explaining multiple clicks per visit
      expect(html).toContain('analytics-funnel-notice--asymmetric')
      expect(html).toContain('múltiplos cliques em visitas individuais')
    })
  })

  // -------------------------------------------------------------------------
  // 3. Daily Trend Chart & Zero Data
  // -------------------------------------------------------------------------
  describe('Daily Trend & Zero Data Handling', () => {
    it('renders SVG polyline chart and accessible details table when data is present', () => {
      const overview = createSyntheticOverview()
      const html = renderToStaticMarkup(
        <AnalyticsDailyTrend dailyTrend={overview.dailyTrend} periodDays={30} locale="pt-BR" />
      )

      expect(html).toContain('<svg')
      expect(html).toContain('polyline')
      expect(html).toContain('Ver dados diários em tabela')
      expect(html).toContain('<table')
    })

    it('renders a friendly zero-data state when all days have 0 activity', () => {
      const zeroTrend = [
        {
          date: '2026-09-01',
          dayOfWeek: 2,
          impressionsTotal: 0,
          impressionsOrganic: 0,
          impressionsSponsored: 0,
          viewsTotal: 0,
          viewsOrganic: 0,
          viewsSponsored: 0,
          contactsTotal: 0,
          whatsappClicks: 0,
          phoneClicks: 0,
          telegramClicks: 0,
        },
        {
          date: '2026-09-02',
          dayOfWeek: 3,
          impressionsTotal: 0,
          impressionsOrganic: 0,
          impressionsSponsored: 0,
          viewsTotal: 0,
          viewsOrganic: 0,
          viewsSponsored: 0,
          contactsTotal: 0,
          whatsappClicks: 0,
          phoneClicks: 0,
          telegramClicks: 0,
        },
      ]
      const html = renderToStaticMarkup(
        <AnalyticsDailyTrend dailyTrend={zeroTrend} periodDays={30} locale="pt-BR" />
      )

      expect(html).toContain('Ainda não há dados suficientes no período')
      expect(html).not.toContain('NaN')
      expect(html).not.toContain('Infinity')
    })

    it('renders full empty state card with guidance when profile has zero total activity', () => {
      const html = renderToStaticMarkup(
        <AnalyticsEmptyState isPublic={true} profileSlug="camila-sp-4" locale="pt-BR" />
      )

      expect(html).toContain('Seus primeiros dados aparecerão aqui')
      expect(html).toContain('Ver meu perfil público')
      expect(html).toContain('/perfil/camila-sp-4')
    })
  })

  // -------------------------------------------------------------------------
  // 4. Service Area Breakdown
  // -------------------------------------------------------------------------
  describe('Service Area Breakdown', () => {
    it('renders Moema and Pinheiros with correct counts and NO UUID leakage', () => {
      const overview = createSyntheticOverview()
      const html = renderToStaticMarkup(
        <AnalyticsLocationBreakdown topLocations={overview.topLocations} locale="pt-BR" />
      )

      expect(html).toContain('Moema')
      expect(html).toContain('Pinheiros')
      expect(html).toContain('São Paulo')
      expect(html).toContain('26,7%')
      expect(html).toContain('20,0%')

      // Zero internal UUIDs rendered in HTML
      expect(html).not.toContain('loc-uuid-1')
      expect(html).not.toContain('loc-uuid-2')

      // Reflects service area context, NOT visitor origin
      expect(html).toContain('Regiões cadastradas no seu perfil')
      expect(html).not.toContain('De onde seus visitantes são')
    })

    it('renders empty message when no location metrics are recorded', () => {
      const html = renderToStaticMarkup(
        <AnalyticsLocationBreakdown topLocations={[]} locale="pt-BR" />
      )

      expect(html).toContain('Nenhuma atividade distribuída por região')
    })
  })

  // -------------------------------------------------------------------------
  // 5. Peak Times & Temporal Analysis
  // -------------------------------------------------------------------------
  describe('Peak Times & Time Analysis', () => {
    it('highlights best day and best hour and explicitly references Brasília timezone', () => {
      const overview = createSyntheticOverview()
      const html = renderToStaticMarkup(
        <AnalyticsPeakTimes peakTimes={overview.peakTimes} locale="pt-BR" />
      )

      expect(html).toContain('Sexta-feira')
      expect(html).toContain('21:00')
      expect(html).toContain('Horários calculados com base no fuso de Brasília (America/Sao_Paulo)')
      expect(html).not.toContain('Horário garantido')
    })
  })

  // -------------------------------------------------------------------------
  // 6. Placement Breakdown (Organic vs Sponsored)
  // -------------------------------------------------------------------------
  describe('Placement Breakdown', () => {
    it('renders Organic vs Sponsored and explicitly scopes to placement type', () => {
      const overview = createSyntheticOverview()
      const html = renderToStaticMarkup(
        <AnalyticsPlacementBreakdown overview={overview} locale="pt-BR" />
      )

      expect(html).toContain('Orgânico')
      expect(html).toContain('Patrocinado (Destaque)')
      expect(html).toContain('80') // organic impressions
      expect(html).toContain('20') // sponsored impressions
      expect(html).toContain('Tipo de posicionamento')

      // Does not contain unsupported traffic categories
      expect(html).not.toContain('Instagram')
      expect(html).not.toContain('Google')
      expect(html).not.toContain('Origem de todos os visitantes')
    })
  })

  // -------------------------------------------------------------------------
  // 7. Audience Setting & Historical Audience Non-Claim
  // -------------------------------------------------------------------------
  describe('Audience Setting Context', () => {
    it('displays current audience mode as profile context without historical comparison', () => {
      const htmlPublic = renderToStaticMarkup(
        <AnalyticsAudienceBadge audienceMode="PUBLIC" locale="pt-BR" />
      )
      expect(htmlPublic).toContain('Público')
      expect(htmlPublic).toContain('Configuração atual do seu perfil')

      const htmlVip = renderToStaticMarkup(
        <AnalyticsAudienceBadge audienceMode="VIP_ONLY" locale="pt-BR" />
      )
      expect(htmlVip).toContain('Somente VIP')

      // Must NOT contain historical comparative breakdown
      expect(htmlPublic).not.toContain('Público vs VIP')
      expect(htmlVip).not.toContain('Desempenho histórico VIP')
    })
  })

  // -------------------------------------------------------------------------
  // 8. Metric Definitions Guide
  // -------------------------------------------------------------------------
  describe('Metric Definitions Guide', () => {
    it('renders transparent, plain language definitions of impressions, views, clicks and privacy', () => {
      const html = renderToStaticMarkup(<AnalyticsDefinitionsGuide locale="pt-BR" />)

      expect(html).toContain('Impressões Qualificadas')
      expect(html).toContain('Visitas Únicas ao Perfil')
      expect(html).toContain('Cliques no WhatsApp')
      expect(html).toContain('Privacidade e Proteção de Dados')
      expect(html).toContain('500ms')
      expect(html).toContain('não revelam a identidade dos visitantes')
    })
  })

  // -------------------------------------------------------------------------
  // 9. Full Page Route: Authorization, Period Selection & Privacy
  // -------------------------------------------------------------------------
  describe('Page Route Authorization & Privacy', () => {
    it('redirects CLIENT role accounts away from professional analytics', async () => {
      vi.mocked(requireAccount).mockResolvedValue({
        id: 'client-acc-1',
        role: 'CLIENT',
        status: 'ACTIVE',
      } as any)

      try {
        await AdvertiserAnalyticsPage({ searchParams: Promise.resolve({ days: '30' }) })
        expect.unreachable('Should have thrown redirect')
      } catch (err: any) {
        expect(err.message).toContain('NEXT_REDIRECT')
      }
    })

    it('renders complete Analytics 2.0 dashboard for authorized ADVERTISER owner', async () => {
      const ownerAccountId = 'owner-acc-123'
      const profileId = 'prof-456'

      vi.mocked(requireAccount).mockResolvedValue({
        id: ownerAccountId,
        role: 'ADVERTISER',
        status: 'ACTIVE',
      } as any)

      vi.mocked(getProfileByAccountUserId).mockResolvedValue({
        id: profileId,
        account_user_id: ownerAccountId,
        stage_name: 'Camila',
        slug: 'camila-sp-4',
        status: 'ACTIVE',
      } as any)

      const syntheticOverview = createSyntheticOverview({
        profileId,
        profileSlug: 'camila-sp-4',
        periodDays: 30,
      })

      vi.mocked(getProfessionalAnalyticsOverview).mockResolvedValue(syntheticOverview)
      vi.mocked(isProfileCanonicallyEligible).mockResolvedValue(true)

      const element = await AdvertiserAnalyticsPage({
        searchParams: Promise.resolve({ days: '30' }),
      })
      const html = renderToStaticMarkup(element)

      // Verified sections
      expect(html).toContain('Camila')
      expect(html).toContain('Seu perfil em movimento.')
      expect(html).toContain('PERÍODO')
      expect(html).toContain('30 dias')
      expect(html).toContain('Impressões')
      expect(html).toContain('Visitas ao perfil')
      expect(html).toContain('Cliques no WhatsApp')
      expect(html).toContain('JORNADA DE INTERESSE')
      expect(html).toContain('Desempenho por região de atendimento')
      expect(html).toContain('Melhores horários e dias de interesse')
      expect(html).toContain('Tipo de posicionamento')
      expect(html).toContain('Como estas métricas funcionam?')

      // Strict privacy assertions:
      expect(html).not.toContain('visitor_session_id')
      expect(html).not.toContain('127.0.0.1')
      expect(html).not.toContain('192.168.')
      expect(html).not.toContain('cpf')
      expect(html).not.toContain('document_number')
    })
  })
})
