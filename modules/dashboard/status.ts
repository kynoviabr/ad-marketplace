import type { PublicationReviewState } from '@/modules/publication/types'
import type { DashboardPublicationStatus } from './types'

export function deriveDashboardPublicationStatus(review: PublicationReviewState): DashboardPublicationStatus {
  if (review.hasDataError) return { label: 'REQUER ATENÇÃO', tone: 'attention', summary: 'Não foi possível confirmar todos os critérios agora. Tente novamente em instantes.' }
  if (review.isPublic) return { label: 'NO AR', tone: 'live', summary: 'Seu perfil está publicado e disponível na busca da Velvet.' }
  if (review.isCanonicallyEligible) return { label: 'PRONTO PARA PUBLICAR', tone: 'ready', summary: 'Todos os critérios foram confirmados. Revise e publique seu perfil.' }
  const moderation = review.readiness.find((item) => item.key === 'publication')?.detail ?? ''
  if (/análise|revisão/i.test(moderation) || review.photos.pending > 0) return { label: 'EM ANÁLISE', tone: 'review', summary: review.blockingReasons[0] ?? 'Seu conteúdo está sendo analisado.' }
  if (review.profileId) return { label: 'REQUER ATENÇÃO', tone: 'attention', summary: review.blockingReasons[0] ?? 'Existem requisitos pendentes para publicação.' }
  return { label: 'RASCUNHO', tone: 'draft', summary: review.blockingReasons[0] ?? 'Complete seu perfil para avançar.' }
}
