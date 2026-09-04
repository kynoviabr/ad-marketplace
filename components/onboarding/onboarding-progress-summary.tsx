import Link from 'next/link'
import type { Locale } from '@/lib/i18n/config'
import type { PublicationReviewState } from '@/modules/publication/types'

export type StepProgressStatus = 'complete' | 'current' | 'pending' | 'blocked'

export interface JourneyStep {
  key: string
  labelPt: string
  labelEn: string
  status: StepProgressStatus
  detailPt: string
  detailEn: string
  helpHref?: string
  editHref?: string
}

export function computeJourneySteps(review: PublicationReviewState): JourneyStep[] {
  const profileItem = review.readiness.find((item) => item.key === 'profile')
  const verificationItem = review.readiness.find((item) => item.key === 'verification')
  const locationsItem = review.readiness.find((item) => item.key === 'locations')
  const photosItem = review.readiness.find((item) => item.key === 'photos')
  const publicationItem = review.readiness.find((item) => item.key === 'publication')

  const accountComplete = review.onboardingCompleted || true // Signed in account exists
  const verificationComplete = Boolean(verificationItem?.ready)
  const profileComplete = Boolean(profileItem?.ready)
  const photosComplete = Boolean(photosItem?.ready)
  const locationsComplete = Boolean(locationsItem?.ready)
  const audienceComplete = Boolean(review.preview) // audience is selected on profile form

  // Determine publication blocked status
  const isPublicationBlocked = !review.isCanonicallyEligible && !review.isPublic

  return [
    {
      key: 'account',
      labelPt: 'Conta',
      labelEn: 'Account',
      status: 'complete',
      detailPt: 'Conta profissional criada e ativa.',
      detailEn: 'Professional account created and active.',
    },
    {
      key: 'verification',
      labelPt: 'Verificação',
      labelEn: 'Verification',
      status: verificationComplete ? 'complete' : 'blocked',
      detailPt: verificationComplete
        ? 'Identidade e maioridade 18+ confirmadas.'
        : 'Verificação de identidade e maioridade pendente.',
      detailEn: verificationComplete
        ? 'Identity and legal 18+ age confirmed.'
        : 'Identity and age verification pending.',
      helpHref: '/como-comecar',
      editHref: '/onboarding/verificacao',
    },
    {
      key: 'profile',
      labelPt: 'Perfil',
      labelEn: 'Profile',
      status: profileComplete ? 'complete' : 'pending',
      detailPt: profileComplete
        ? 'Apresentação pública e dados completos.'
        : 'Nome artístico, frase de apresentação e biografia.',
      detailEn: profileComplete
        ? 'Public presentation and details complete.'
        : 'Stage name, headline and biography.',
      helpHref: '/como-comecar',
      editHref: '/onboarding/seu-perfil',
    },
    {
      key: 'photos',
      labelPt: 'Fotos e Vídeos',
      labelEn: 'Photos & Videos',
      status: photosComplete
        ? 'complete'
        : (review.photos.rejected + review.photos.blocked > 0)
        ? 'blocked'
        : 'pending',
      detailPt: photosComplete
        ? `${review.photos.approved} foto(s) aprovada(s) com principal definida.`
        : review.photos.rejected > 0
        ? 'Fotos com recusa de moderação requerem atenção.'
        : review.photos.pending > 0
        ? 'Fotos em análise de moderação.'
        : 'Adicione fotos para seu anúncio.',
      detailEn: photosComplete
        ? `${review.photos.approved} approved photo(s) with primary photo set.`
        : review.photos.rejected > 0
        ? 'Photos rejected by moderation require attention.'
        : review.photos.pending > 0
        ? 'Photos under moderation review.'
        : 'Add photos to your profile.',
      helpHref: '/como-comecar',
      editHref: '/onboarding/fotos',
    },
    {
      key: 'locations',
      labelPt: 'Serviços e regiões',
      labelEn: 'Services & areas',
      status: locationsComplete ? 'complete' : 'pending',
      detailPt: locationsComplete
        ? `${review.serviceAreas.length} região(ões) de atendimento definidas.`
        : 'Falta definir região de atendimento em São Paulo.',
      detailEn: locationsComplete
        ? `${review.serviceAreas.length} service area(s) configured.`
        : 'Service area in São Paulo not yet selected.',
      helpHref: '/como-comecar',
      editHref: '/onboarding/onde-atende',
    },
    {
      key: 'audience',
      labelPt: 'Público ou VIP',
      labelEn: 'Public or VIP',
      status: audienceComplete ? 'complete' : 'pending',
      detailPt: audienceComplete
        ? 'Visibilidade do perfil definida.'
        : 'Escolha se o perfil é público ou exclusivo para clientes VIP.',
      detailEn: audienceComplete
        ? 'Profile visibility configured.'
        : 'Choose if profile is public or VIP-only.',
      helpHref: '/como-comecar',
      editHref: '/onboarding/seu-perfil',
    },
    {
      key: 'review',
      labelPt: 'Revisão',
      labelEn: 'Review',
      status: review.isPublic ? 'complete' : 'current',
      detailPt: review.isPublic
        ? 'Perfil aprovado e publicado.'
        : 'Conferência final de critérios antes da ativação.',
      detailEn: review.isPublic
        ? 'Profile approved and published.'
        : 'Final criteria review before live publication.',
    },
    {
      key: 'publication',
      labelPt: 'Publicação',
      labelEn: 'Publication',
      status: review.isPublic
        ? 'complete'
        : isPublicationBlocked
        ? 'blocked'
        : 'pending',
      detailPt: review.isPublic
        ? 'Perfil publicado e visível conforme configuração.'
        : isPublicationBlocked
        ? publicationItem?.detail || 'Critérios de publicação pendentes.'
        : 'Pronto para publicação.',
      detailEn: review.isPublic
        ? 'Profile published and visible according to settings.'
        : isPublicationBlocked
        ? 'Publication criteria pending.'
        : 'Ready for live publication.',
      helpHref: '/como-comecar',
    },
  ]
}

const statusBadgeLabels: Record<StepProgressStatus, { pt: string; en: string }> = {
  complete: { pt: 'Concluído', en: 'Complete' },
  current: { pt: 'Em andamento', en: 'In progress' },
  pending: { pt: 'Pendente', en: 'Pending' },
  blocked: { pt: 'Bloqueado', en: 'Blocked' },
}

export function OnboardingProgressSummary({
  review,
  locale,
}: {
  review: PublicationReviewState
  locale: Locale
}) {
  const steps = computeJourneySteps(review)
  const isPt = locale === 'pt-BR'

  return (
    <section className="onboarding-journey-summary" aria-label={isPt ? 'Jornada de publicação' : 'Publication journey'}>
      <header className="onboarding-journey-head">
        <div>
          <p className="onboarding-eyebrow">{isPt ? 'PROGRESSO DO PERFIL' : 'PROFILE PROGRESS'}</p>
          <h2>{isPt ? 'Jornada de publicação' : 'Publication journey'}</h2>
        </div>
        <Link href={isPt ? '/como-comecar' : '/en/como-comecar'} className="onboarding-journey-guide-link">
          {isPt ? 'Como começar na velvet. →' : 'How to start on velvet. →'}
        </Link>
      </header>

      <ol className="onboarding-journey-grid">
        {steps.map((step, index) => {
          const badge = statusBadgeLabels[step.status]
          return (
            <li key={step.key} className={`onboarding-journey-step is-${step.status}`}>
              <div className="onboarding-journey-step-top">
                <span className="onboarding-journey-step-num">{String(index + 1).padStart(2, '0')}</span>
                <span className={`onboarding-journey-badge is-${step.status}`}>
                  {isPt ? badge.pt : badge.en}
                </span>
              </div>
              <h3 className="onboarding-journey-step-title">{isPt ? step.labelPt : step.labelEn}</h3>
              <p className="onboarding-journey-step-detail">{isPt ? step.detailPt : step.detailEn}</p>
              <div className="onboarding-journey-step-links">
                {step.editHref && step.status !== 'complete' ? (
                  <Link href={step.editHref} className="onboarding-journey-action-link">
                    {isPt ? 'Completar' : 'Complete'}
                  </Link>
                ) : null}
                {step.helpHref ? (
                  <Link
                    href={isPt ? step.helpHref : `/en${step.helpHref}`}
                    className="onboarding-journey-help-link"
                  >
                    {isPt ? 'Ajuda' : 'Help'}
                  </Link>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
