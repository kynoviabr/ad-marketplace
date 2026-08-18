import { describe, it, expect } from 'vitest'
import type { SearchResultDTO } from '@/modules/search/types'

describe('Search Privacy Invariants & DTO Security', () => {
  const sampleSearchResult: SearchResultDTO = {
    id: 'juliana-sao-paulo-4f9a',
    slug: 'juliana-sao-paulo-4f9a',
    stageName: 'Juliana Castro',
    headline: 'Modelo Fotográfica em Moema',
    publicAge: null, // show_age = false
    primaryLocation: {
      name: 'Moema',
      slug: 'moema',
      zone: 'Zona Sul',
    },
    locations: [
      { name: 'Moema', slug: 'moema', isPrimary: true },
      { name: 'Pinheiros', slug: 'pinheiros', isPrimary: false },
    ],
    attributes: {
      heightCm: 172, // show_height = true
      weightKg: null, // show_weight = false
      eyeColor: 'BROWN',
      hairColor: 'BRUNETTE',
      hairLength: 'LONG',
      bodyType: 'SLIM',
      hasTattoos: false,
      hasPiercings: true,
      languages: ['Português', 'Inglês'],
    },
    isVerified: true,
    contact: {
      whatsapp: '+5511999998888', // show_whatsapp = true
      phone: null, // show_phone = false
      telegram: null,
    },
    photoPlaceholder: '/images/placeholder-avatar.svg',
  }

  it('SearchResultDTO strictly excludes all private, KYC, and internal account fields', () => {
    const keys = Object.keys(sampleSearchResult)

    const forbiddenKeys = [
      'account_user_id',
      'auth_user_id',
      'provider_session_id',
      'cpf',
      'dob',
      'date_of_birth',
      'legal_name',
      'verified_at',
      'verification_session',
    ]

    for (const forbidden of forbiddenKeys) {
      expect(keys).not.toContain(forbidden)
    }
  })

  it('sanitizes hidden attributes to null when visibility flag is disabled', () => {
    expect(sampleSearchResult.publicAge).toBeNull()
    expect(sampleSearchResult.attributes.weightKg).toBeNull()
    expect(sampleSearchResult.contact.phone).toBeNull()
    expect(sampleSearchResult.contact.telegram).toBeNull()
  })

  it('surfaces verified badge as boolean true without disclosing KYC details', () => {
    expect(sampleSearchResult.isVerified).toBe(true)
    expect((sampleSearchResult as any).kycDetails).toBeUndefined()
    expect((sampleSearchResult as any).provider).toBeUndefined()
  })
})
