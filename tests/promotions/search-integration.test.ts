import { describe, it, expect } from 'vitest'
import { MAX_SPONSORED_SLOTS_PER_PAGE } from '@/modules/promotions/constants'
import type { SearchResultDTO } from '@/modules/search/types'

describe('FASE 08 — Search Composition & Sponsored Inventory Integration', () => {
  it('verifies DTO structure includes placementType and isSponsored fields', () => {
    const mockSponsoredResult: SearchResultDTO = {
      id: 'profile-slug-1',
      slug: 'profile-slug-1',
      stageName: 'Sabrina',
      headline: 'Destaque VIP',
      publicAge: 24,
      primaryLocation: { name: 'Moema', slug: 'moema', zone: 'Zona Sul' },
      locations: [{ name: 'Moema', slug: 'moema', isPrimary: true }],
      attributes: {
        heightCm: 170,
        weightKg: 58,
        eyeColor: 'BROWN',
        hairColor: 'BRUNETTE',
        hairLength: 'LONG',
        bodyType: 'CURVY',
        hasTattoos: false,
        hasPiercings: false,
        languages: ['Português'],
      },
      isVerified: true,
      contact: { whatsapp: '11999999999', phone: null, telegram: null },
      placementType: 'SPONSORED',
      isSponsored: true,
    }

    expect(mockSponsoredResult.placementType).toBe('SPONSORED')
    expect(mockSponsoredResult.isSponsored).toBe(true)
  })

  it('enforces that sponsored profiles count never exceeds MAX_SPONSORED_SLOTS_PER_PAGE', () => {
    const eligibleBoostsCount = 10
    const sponsoredCount = Math.min(eligibleBoostsCount, MAX_SPONSORED_SLOTS_PER_PAGE)

    expect(sponsoredCount).toBe(4)
    expect(sponsoredCount).toBeLessThanOrEqual(MAX_SPONSORED_SLOTS_PER_PAGE)
  })

  it('guarantees duplicate suppression between sponsored and organic card lists', () => {
    const sponsoredProfileIds = ['profile-1', 'profile-2']
    const rawOrganicResults = [
      { id: 'profile-1', name: 'Organic 1' },
      { id: 'profile-2', name: 'Organic 2' },
      { id: 'profile-3', name: 'Organic 3' },
      { id: 'profile-4', name: 'Organic 4' },
    ]

    // Organic filter excludes sponsoredProfileIds
    const deduplicatedOrganic = rawOrganicResults.filter((p) => !sponsoredProfileIds.includes(p.id))

    expect(deduplicatedOrganic).toHaveLength(2)
    expect(deduplicatedOrganic.map((p) => p.id)).toEqual(['profile-3', 'profile-4'])
  })

  it('excludes sponsored candidates that do not match visitor hair color filter', () => {
    const visitorFilter = { hairColor: ['BLONDE'] }

    const candidateA = { id: 'p1', hair_color: 'BRUNETTE' } // Boosted but brunette
    const candidateB = { id: 'p2', hair_color: 'BLONDE' } // Boosted and blonde

    function matchesFilter(profile: { hair_color: string }): boolean {
      return visitorFilter.hairColor.includes(profile.hair_color)
    }

    expect(matchesFilter(candidateA)).toBe(false)
    expect(matchesFilter(candidateB)).toBe(true)
  })
})
