import type { AccountUser } from '@/modules/auth/types'
import type { ProfileMedia } from '@/modules/media/types'
import { evaluateProfileCompleteness } from '@/modules/profiles/completeness'
import type { ProfessionalProfile } from '@/modules/profiles/types'
import type { VerificationSafeDTO } from '@/modules/verification/types'
import type { ProfileLocation } from '@/modules/locations/types'
import type { PublicationReadinessItem } from './types'

interface ReadinessInput { account: Pick<AccountUser, 'status'>; profile: ProfessionalProfile | null; verification: VerificationSafeDTO | null; locations: ProfileLocation[]; media: ProfileMedia[]; hasEntitlement: boolean; canonicalEligible: boolean; dataAvailable: boolean }
const fieldLabels: Record<string, string> = { profile_not_created: 'crie seu perfil', stage_name: 'informe seu nome profissional', headline: 'adicione uma apresentação', bio: 'complete sua biografia', contact_channel: 'ative um canal público de contato' }

export function buildPublicationReadiness(input: ReadinessInput): { items: PublicationReadinessItem[]; blockingReasons: string[] } {
  const completeness = evaluateProfileCompleteness(input.profile)
  const verificationReady = Boolean(input.verification?.status === 'VERIFIED' && input.verification.identityVerified && input.verification.ageVerified)
  const activeLocations = input.locations.filter((item) => item.location?.active).length
  const approvedPhotos = input.media.filter((item) => item.status === 'APPROVED' && !item.deleted_at).length
  const pendingPhotos = input.media.filter((item) => ['UPLOADING', 'PROCESSING', 'PENDING_MODERATION'].includes(item.status)).length
  const profileReady = Boolean(input.profile && completeness.isComplete && ['READY_FOR_REVIEW', 'ACTIVE'].includes(input.profile.status))
  const moderationReady = input.profile?.content_moderation_status === 'APPROVED'
  const publicationDetail = !input.dataAvailable ? 'Não foi possível confirmar os critérios agora.' : input.canonicalEligible ? 'Todos os critérios canônicos de publicação foram confirmados.' : !moderationReady ? input.profile?.content_moderation_status === 'PENDING' ? 'Seu texto ainda está em análise.' : 'Seu texto precisa de uma nova revisão.' : !input.hasEntitlement ? 'Sua conta ainda não possui direito de publicação ativo.' : input.account.status !== 'ACTIVE' ? 'Sua conta não está ativa.' : 'Ainda existem requisitos pendentes.'
  const items: PublicationReadinessItem[] = [
    { key: 'profile', label: 'Perfil', ready: profileReady, detail: profileReady ? 'Apresentação e contato público completos.' : completeness.missingFields.map((field) => fieldLabels[field] ?? field).join(', ') || 'Revise o estado do perfil.', editHref: '/onboarding/seu-perfil', editLabel: 'Editar perfil' },
    { key: 'verification', label: 'Verificação', ready: verificationReady, detail: verificationReady ? 'Identidade e maioridade confirmadas.' : 'Conclua a verificação de identidade e maioridade.', editHref: '/onboarding/verificacao', editLabel: 'Ver verificação' },
    { key: 'locations', label: 'Regiões', ready: activeLocations > 0, detail: activeLocations > 0 ? `${activeLocations} região(ões) de atendimento.` : 'Escolha ao menos uma região ativa de atendimento.', editHref: '/onboarding/onde-atende', editLabel: 'Editar regiões' },
    { key: 'photos', label: 'Fotos', ready: approvedPhotos > 0, detail: approvedPhotos > 0 ? `${approvedPhotos} foto(s) aprovada(s) para exibição pública.` : pendingPhotos > 0 ? 'Suas fotos foram enviadas, mas ainda aguardam aprovação.' : 'Adicione ao menos uma foto que possa ser aprovada.', editHref: '/onboarding/fotos', editLabel: 'Gerenciar fotos' },
    { key: 'publication', label: 'Publicação', ready: input.canonicalEligible, detail: publicationDetail },
  ]
  return { items, blockingReasons: items.filter((item) => !item.ready).map((item) => item.detail) }
}
