export const OFFERING_GROUPS = ['AUDIENCE', 'SERVICES', 'LOCATIONS', 'AVAILABILITY'] as const
export type OfferingGroup = (typeof OFFERING_GROUPS)[number]
export type OfferingStatus = 'OFFERED' | 'NOT_OFFERED' | 'UNSPECIFIED'

export const OFFERING_OPTIONS = [
  { code: 'audience_men', group: 'AUDIENCE', order: 1 },
  { code: 'audience_women', group: 'AUDIENCE', order: 2 },
  { code: 'audience_couples', group: 'AUDIENCE', order: 3 },
  { code: 'service_gfe', group: 'SERVICES', order: 1 },
  { code: 'service_kissing', group: 'SERVICES', order: 2 },
  { code: 'service_massage', group: 'SERVICES', order: 3 },
  { code: 'service_striptease', group: 'SERVICES', order: 4 },
  { code: 'service_toys', group: 'SERVICES', order: 5 },
  { code: 'service_fetishes', group: 'SERVICES', order: 6 },
  { code: 'service_bdsm', group: 'SERVICES', order: 7 },
  { code: 'service_oral', group: 'SERVICES', order: 8 },
  { code: 'service_anal', group: 'SERVICES', order: 9 },
  { code: 'location_own', group: 'LOCATIONS', order: 1 },
  { code: 'location_hotel_motel', group: 'LOCATIONS', order: 2 },
  { code: 'location_outcall', group: 'LOCATIONS', order: 3 },
  { code: 'availability_overnight', group: 'AVAILABILITY', order: 1 },
  { code: 'availability_day', group: 'AVAILABILITY', order: 2 },
  { code: 'availability_events', group: 'AVAILABILITY', order: 3 },
  { code: 'availability_travel', group: 'AVAILABILITY', order: 4 },
] as const satisfies ReadonlyArray<{ code: string; group: OfferingGroup; order: number }>

export type OfferingCode = (typeof OFFERING_OPTIONS)[number]['code']
export type OfferingStatusMap = Record<OfferingCode, OfferingStatus>
export type OfferedOfferingGroups = Partial<Record<OfferingGroup, OfferingCode[]>>

export interface ProfessionalOfferingRow {
  profile_id: string
  option_code: OfferingCode
  status: OfferingStatus
}

export type AiOfferingContext = {
  audience: Record<'men' | 'women' | 'couples', OfferingStatus>
  services: Record<'gfe' | 'kissing' | 'massage' | 'striptease' | 'toys' | 'fetishes' | 'bdsm' | 'oral' | 'anal', OfferingStatus>
  locations: Record<'own' | 'hotelMotel' | 'outcall', OfferingStatus>
  availability: Record<'overnight' | 'day' | 'events' | 'travel', OfferingStatus>
}

export function createUnspecifiedOfferingMap(): OfferingStatusMap {
  return Object.fromEntries(OFFERING_OPTIONS.map(({ code }) => [code, 'UNSPECIFIED'])) as OfferingStatusMap
}

export function mapOfferingStatusesToAiContext(s: OfferingStatusMap): AiOfferingContext {
  return {
    audience: { men: s.audience_men, women: s.audience_women, couples: s.audience_couples },
    services: { gfe: s.service_gfe, kissing: s.service_kissing, massage: s.service_massage, striptease: s.service_striptease, toys: s.service_toys, fetishes: s.service_fetishes, bdsm: s.service_bdsm, oral: s.service_oral, anal: s.service_anal },
    locations: { own: s.location_own, hotelMotel: s.location_hotel_motel, outcall: s.location_outcall },
    availability: { overnight: s.availability_overnight, day: s.availability_day, events: s.availability_events, travel: s.availability_travel },
  }
}
