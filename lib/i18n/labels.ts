import type { Locale } from './config'

const verification = {
  'pt-BR': {
    NOT_STARTED: 'NÃO INICIADA', PENDING: 'AGUARDANDO INÍCIO', IN_PROGRESS: 'EM ANDAMENTO',
    IN_REVIEW: 'EM ANÁLISE', VERIFIED: 'VERIFICADA', REJECTED: 'REJEITADA', EXPIRED: 'EXPIRADA',
  },
  en: {
    NOT_STARTED: 'NOT STARTED', PENDING: 'AWAITING START', IN_PROGRESS: 'IN PROGRESS',
    IN_REVIEW: 'UNDER REVIEW', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED', EXPIRED: 'EXPIRED',
  },
} as const

export function verificationStatusLabel(locale: Locale, status: keyof typeof verification['pt-BR']): string {
  return verification[locale][status]
}

const readinessDetailsEn: Record<string, string> = {
  'Apresentação e contato público completos.': 'Public presentation and contact are complete.',
  'Revise o estado do perfil.': 'Review the profile status.',
  'Identidade e maioridade confirmadas.': 'Identity and legal age confirmed.',
  'Conclua a verificação de identidade e maioridade.': 'Complete identity and age verification.',
  'Escolha ao menos uma região ativa de atendimento.': 'Choose at least one active service area.',
  'Há foto aprovada, mas nenhuma foto aprovada está definida como principal.': 'There is an approved photo, but no approved photo is set as primary.',
  'Suas fotos foram enviadas, mas ainda aguardam aprovação.': 'Your photos were submitted and are awaiting approval.',
  'Adicione ao menos uma foto que possa ser aprovada.': 'Add at least one photo that can be approved.',
  'Não foi possível confirmar os critérios agora.': 'The criteria could not be confirmed right now.',
  'Todos os critérios para ativar o perfil foram confirmados.': 'All criteria to activate the profile have been confirmed.',
  'Conclua e envie seu perfil para revisão.': 'Complete and submit your profile for review.',
  'A verificação de identidade e maioridade ainda está pendente.': 'Identity and age verification is still pending.',
  'Defina uma foto aprovada como principal.': 'Set an approved photo as primary.',
  'Aguarde a aprovação de pelo menos uma foto principal.': 'Wait for at least one primary photo to be approved.',
  'Seu texto ainda está em análise.': 'Your profile text is still under review.',
  'Seu texto precisa de uma nova revisão.': 'Your profile text needs another review.',
  'Sua conta ainda não possui direito de publicação ativo.': 'Your account does not yet have an active publication entitlement.',
  'Sua conta não está ativa.': 'Your account is not active.',
  'Ainda existem requisitos pendentes.': 'Some requirements are still pending.',
  'crie seu perfil': 'create your profile',
  'informe seu nome profissional': 'enter your professional name',
  'adicione uma apresentação': 'add a presentation headline',
  'complete sua biografia': 'complete your bio',
  'ative um canal público de contato': 'activate a public contact channel',
}

export function publicationReadinessDetail(locale: Locale, detail: string): string {
  if (locale === 'pt-BR') return detail
  const locationCount = detail.match(/^(\d+) região\(ões\) de atendimento\.$/)
  if (locationCount) return `${locationCount[1]} service area(s).`
  const photoCount = detail.match(/^(\d+) foto\(s\) aprovada\(s\), com principal pronta para exibição\.$/)
  if (photoCount) return `${photoCount[1]} approved photo(s), with a primary photo ready to display.`
  return readinessDetailsEn[detail] ?? detail
}
