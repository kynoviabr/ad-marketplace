import { describe, it, expect } from 'vitest'
import { evaluateProfileCompleteness, isProfileDataComplete } from '@/modules/profiles/completeness'
import type { ProfessionalProfile } from '@/modules/profiles/types'

describe('Profile Completeness Evaluation', () => {
  const completeBaseProfile: Partial<ProfessionalProfile> = {
    stage_name: 'Juliana Castro',
    headline: 'Modelo Fotográfica e Atendimento Exclusivo',
    bio: 'Atendimento de alto nível com total discrição e pontualidade na capital paulista.',
    whatsapp_phone: '+5511999998888',
    show_whatsapp: true,
  }

  it('evaluates a complete profile as isComplete=true', () => {
    const result = evaluateProfileCompleteness(completeBaseProfile)
    expect(result.isComplete).toBe(true)
    expect(result.missingFields).toHaveLength(0)
    expect(isProfileDataComplete(completeBaseProfile)).toBe(true)
  })

  it('fails completeness when stage_name is missing or shorter than 2 chars', () => {
    const missingName = { ...completeBaseProfile, stage_name: ' ' }
    const result = evaluateProfileCompleteness(missingName)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields).toContain('stage_name')
  })

  it('fails completeness when headline is missing or shorter than 5 chars', () => {
    const missingHeadline = { ...completeBaseProfile, headline: 'Ola' }
    const result = evaluateProfileCompleteness(missingHeadline)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields).toContain('headline')
  })

  it('fails completeness when bio is missing or shorter than 20 chars', () => {
    const shortBio = { ...completeBaseProfile, bio: 'Muito curta.' }
    const result = evaluateProfileCompleteness(shortBio)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields).toContain('bio')
  })

  it('fails completeness when all contact methods are disabled or empty', () => {
    const noContact = {
      ...completeBaseProfile,
      show_whatsapp: false,
      show_phone: false,
      show_telegram: false,
    }
    const result = evaluateProfileCompleteness(noContact)
    expect(result.isComplete).toBe(false)
    expect(result.missingFields).toContain('contact_channel')
  })

  it('accepts alternative contact channels (direct phone or telegram)', () => {
    const phoneOnly = {
      ...completeBaseProfile,
      show_whatsapp: false,
      show_phone: true,
      direct_phone: '+5511988887777',
    }
    expect(isProfileDataComplete(phoneOnly)).toBe(true)

    const telegramOnly = {
      ...completeBaseProfile,
      show_whatsapp: false,
      show_telegram: true,
      telegram_username: 'julianavip',
    }
    expect(isProfileDataComplete(telegramOnly)).toBe(true)
  })

  it('returns isComplete=false when profile is null', () => {
    expect(isProfileDataComplete(null)).toBe(false)
  })
})
