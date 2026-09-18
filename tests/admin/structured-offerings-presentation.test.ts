import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  structuredOfferGroups,
  structuredOfferLabels,
  structuredOfferValueLabels,
} from '@/modules/offerings/admin-presentation'
import { OFFERING_OPTIONS, type OfferingCode, type OfferingStatus } from '@/modules/offerings/types'

describe('Admin Profiles — Structured Offerings Presentation', () => {
  const adminComponentSource = readFileSync(
    resolve(process.cwd(), 'components/admin/profile-moderation-card.tsx'),
    'utf8'
  )

  it('provides human-readable Portuguese labels for all 19 offering codes without technical terms', () => {
    const expectedLabels: Record<OfferingCode, string> = {
      location_own: 'Local próprio',
      location_hotel_motel: 'Hotel/Motel',
      location_outcall: 'Atendimento externo',
      service_gfe: 'GFE',
      service_oral: 'Oral',
      service_anal: 'Anal',
      service_bdsm: 'BDSM',
      service_toys: 'Brinquedos',
      service_kissing: 'Beijo',
      service_massage: 'Massagem',
      service_fetishes: 'Fetiches',
      service_striptease: 'Striptease',
      audience_men: 'Homens',
      audience_women: 'Mulheres',
      audience_couples: 'Casais',
      availability_day: 'Durante o dia',
      availability_events: 'Eventos',
      availability_travel: 'Viagens',
      availability_overnight: 'Pernoite',
    }

    expect(Object.keys(structuredOfferLabels)).toHaveLength(19)
    for (const option of OFFERING_OPTIONS) {
      expect(structuredOfferLabels[option.code]).toBe(expectedLabels[option.code])
    }
  })

  it('maps all tri-state offering values to business Portuguese labels', () => {
    const expectedValueLabels: Record<OfferingStatus, string> = {
      OFFERED: 'Sim',
      NOT_OFFERED: 'Não',
      UNSPECIFIED: 'Não informado',
    }

    expect(structuredOfferValueLabels).toEqual(expectedValueLabels)
  })

  it('organizes all 19 offering codes into the 4 business groups without duplicates or omissions', () => {
    expect(structuredOfferGroups).toHaveLength(4)

    const groupTitles = structuredOfferGroups.map((g) => g.title)
    expect(groupTitles).toEqual(['Atendimento', 'Serviços', 'Público atendido', 'Disponibilidade'])

    const allGroupItems = structuredOfferGroups.flatMap((g) => g.items)
    expect(allGroupItems).toHaveLength(19)
    expect(new Set(allGroupItems).size).toBe(19)

    for (const option of OFFERING_OPTIONS) {
      expect(allGroupItems).toContain(option.code)
    }
  })

  it('does not display raw database keys or raw enums in the profile moderation card template', () => {
    expect(adminComponentSource).not.toContain('${item.option_code}: ${item.status}')
    expect(adminComponentSource).toContain('structuredOfferGroups')
    expect(adminComponentSource).toContain('structuredOfferLabels')
    expect(adminComponentSource).toContain('structuredOfferValueLabels')
  })
})
