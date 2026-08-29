import type { AdvertiserMetricsSummaryDTO } from '@/modules/analytics/types'
import type { PublicationReviewState } from '@/modules/publication/types'

export type DashboardPublicationTone = 'live' | 'review' | 'attention' | 'draft' | 'ready'
export interface DashboardPublicationStatus {
  label: 'NO AR' | 'EM ANÁLISE' | 'REQUER ATENÇÃO' | 'RASCUNHO' | 'PRONTO PARA PUBLICAR'
  tone: DashboardPublicationTone
  summary: string
}
export interface DashboardBillingSummary { planName: string; statusLabel: string; hasPublicationEntitlement: boolean; manageHref: string | null }
export interface ProfessionalDashboardOverview {
  review: PublicationReviewState
  status: DashboardPublicationStatus
  billing: DashboardBillingSummary
  metrics: AdvertiserMetricsSummaryDTO | null
}
