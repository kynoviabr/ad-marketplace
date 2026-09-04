import { describe, expect, it } from 'vitest'
import { computeJourneySteps } from '@/components/onboarding/onboarding-progress-summary'
import type { PublicationReviewState } from '@/modules/publication/types'

describe('R11.2B Onboarding Progress & Blockers', () => {
  const mockReviewBase: PublicationReviewState = {
    profileId: 'mock-profile-id',
    slug: 'elena-silva',
    preview: {
      slug: 'elena-silva',
      stageName: 'Elena',
      headline: 'Modelo e Artista',
      bio: 'Biografia completa para o teste de onboarding.',
      publicAge: 25,
      heightCm: 175,
      weightKg: 60,
      bustCm: null,
      waistCm: null,
      hipsCm: null,
      hairColor: 'BRUNETTE',
      eyeColor: 'BROWN',
      hairLength: 'LONG',
      bodyType: 'SLIM',
      hasTattoos: false,
      hasPiercings: false,
      languages: ['Português'],
      whatsappPhone: '+5511999999999',
      directPhone: null,
      telegramUsername: null,
      audienceSetting: 'PUBLIC',
      offerings: {} as never,
      status: 'ACTIVE',
      contentModerationStatus: 'APPROVED',
    },
    previewPhotoUrl: 'https://example.com/photo.jpg',
    primaryLocation: 'Jardins',
    serviceAreas: ['Jardins', 'Pinheiros'],
    readiness: [
      { key: 'profile', label: 'Perfil', ready: true, detail: 'Apresentação e contato público completos.' },
      { key: 'verification', label: 'Verificação', ready: true, detail: 'Identidade e maioridade confirmadas.' },
      { key: 'locations', label: 'Regiões', ready: true, detail: '2 região(ões) de atendimento.' },
      { key: 'photos', label: 'Fotos', ready: true, detail: '1 foto(s) aprovada(s), com principal pronta para exibição.' },
      { key: 'publication', label: 'Publicação', ready: true, detail: 'Todos os critérios para ativar o perfil foram confirmados.' },
    ],
    photos: { approved: 1, pending: 0, rejected: 0, blocked: 0, statuses: ['APPROVED'] },
    isCanonicallyEligible: true,
    onboardingCompleted: true,
    isPublic: true,
    blockingReasons: [],
    hasDataError: false,
  }

  it('computes all 8 journey steps accurately for an eligible and public profile', () => {
    const steps = computeJourneySteps(mockReviewBase)
    expect(steps).toHaveLength(8)
    expect(steps.map((s) => s.key)).toEqual([
      'account',
      'verification',
      'profile',
      'photos',
      'locations',
      'audience',
      'review',
      'publication',
    ])
    expect(steps.every((s) => s.status === 'complete')).toBe(true)
  })

  it('identifies blocked verification when identity/age verification is missing', () => {
    const review: PublicationReviewState = {
      ...mockReviewBase,
      isPublic: false,
      isCanonicallyEligible: false,
      readiness: [
        { key: 'profile', label: 'Perfil', ready: true, detail: 'Apresentação e contato público completos.' },
        { key: 'verification', label: 'Verificação', ready: false, detail: 'Conclua a verificação de identidade e maioridade.' },
        { key: 'locations', label: 'Regiões', ready: true, detail: '2 região(ões) de atendimento.' },
        { key: 'photos', label: 'Fotos', ready: true, detail: '1 foto(s) aprovada(s), com principal pronta para exibição.' },
        { key: 'publication', label: 'Publicação', ready: false, detail: 'A verificação de identidade e maioridade ainda está pendente.' },
      ],
      blockingReasons: ['Conclua a verificação de identidade e maioridade.'],
    }

    const steps = computeJourneySteps(review)
    const verificationStep = steps.find((s) => s.key === 'verification')
    expect(verificationStep?.status).toBe('blocked')
    expect(verificationStep?.helpHref).toBe('/como-comecar')

    const pubStep = steps.find((s) => s.key === 'publication')
    expect(pubStep?.status).toBe('blocked')
  })

  it('identifies missing locations as pending blocker', () => {
    const review: PublicationReviewState = {
      ...mockReviewBase,
      isPublic: false,
      isCanonicallyEligible: false,
      serviceAreas: [],
      readiness: [
        { key: 'profile', label: 'Perfil', ready: true, detail: 'Apresentação e contato público completos.' },
        { key: 'verification', label: 'Verificação', ready: true, detail: 'Identidade e maioridade confirmadas.' },
        { key: 'locations', label: 'Regiões', ready: false, detail: 'Escolha ao menos uma região ativa de atendimento.' },
        { key: 'photos', label: 'Fotos', ready: true, detail: '1 foto(s) aprovada(s), com principal pronta para exibição.' },
        { key: 'publication', label: 'Publicação', ready: false, detail: 'Escolha ao menos uma região ativa de atendimento.' },
      ],
      blockingReasons: ['Escolha ao menos uma região ativa de atendimento.'],
    }

    const steps = computeJourneySteps(review)
    const locationStep = steps.find((s) => s.key === 'locations')
    expect(locationStep?.status).toBe('pending')
    expect(locationStep?.detailPt).toContain('Falta definir região de atendimento')
  })

  it('identifies rejected photos as blocked and provides help link to /como-comecar', () => {
    const review: PublicationReviewState = {
      ...mockReviewBase,
      isPublic: false,
      isCanonicallyEligible: false,
      photos: { approved: 0, pending: 0, rejected: 1, blocked: 0, statuses: ['REJECTED'] },
      readiness: [
        { key: 'profile', label: 'Perfil', ready: true, detail: 'Apresentação e contato público completos.' },
        { key: 'verification', label: 'Verificação', ready: true, detail: 'Identidade e maioridade confirmadas.' },
        { key: 'locations', label: 'Regiões', ready: true, detail: '2 região(ões) de atendimento.' },
        { key: 'photos', label: 'Fotos', ready: false, detail: 'Adicione ao menos uma foto que possa ser aprovada.' },
        { key: 'publication', label: 'Publicação', ready: false, detail: 'Aguarde a aprovação de pelo menos uma foto principal.' },
      ],
      blockingReasons: ['Adicione ao menos uma foto que possa ser aprovada.'],
    }

    const steps = computeJourneySteps(review)
    const photoStep = steps.find((s) => s.key === 'photos')
    expect(photoStep?.status).toBe('blocked')
    expect(photoStep?.helpHref).toBe('/como-comecar')
  })
})
