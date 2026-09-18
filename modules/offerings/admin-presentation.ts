import type { OfferingCode, OfferingStatus } from './types'

export const structuredOfferValueLabels: Record<OfferingStatus, string> = {
  OFFERED: 'Sim',
  NOT_OFFERED: 'Não',
  UNSPECIFIED: 'Não informado',
}

export const structuredOfferLabels: Record<OfferingCode, string> = {
  // Atendimento
  location_own: 'Local próprio',
  location_hotel_motel: 'Hotel/Motel',
  location_outcall: 'Atendimento externo',

  // Serviços
  service_gfe: 'GFE',
  service_oral: 'Oral',
  service_anal: 'Anal',
  service_bdsm: 'BDSM',
  service_toys: 'Brinquedos',
  service_kissing: 'Beijo',
  service_massage: 'Massagem',
  service_fetishes: 'Fetiches',
  service_striptease: 'Striptease',

  // Público atendido
  audience_men: 'Homens',
  audience_women: 'Mulheres',
  audience_couples: 'Casais',

  // Disponibilidade
  availability_day: 'Durante o dia',
  availability_events: 'Eventos',
  availability_travel: 'Viagens',
  availability_overnight: 'Pernoite',
}

export interface StructuredOfferGroup {
  id: string
  title: string
  items: readonly OfferingCode[]
}

export const structuredOfferGroups: readonly StructuredOfferGroup[] = [
  {
    id: 'locations',
    title: 'Atendimento',
    items: ['location_own', 'location_hotel_motel', 'location_outcall'],
  },
  {
    id: 'services',
    title: 'Serviços',
    items: [
      'service_gfe',
      'service_oral',
      'service_kissing',
      'service_massage',
      'service_striptease',
      'service_fetishes',
      'service_toys',
      'service_anal',
      'service_bdsm',
    ],
  },
  {
    id: 'audience',
    title: 'Público atendido',
    items: ['audience_men', 'audience_women', 'audience_couples'],
  },
  {
    id: 'availability',
    title: 'Disponibilidade',
    items: [
      'availability_day',
      'availability_events',
      'availability_travel',
      'availability_overnight',
    ],
  },
] as const
