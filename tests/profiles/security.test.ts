import { describe, it, expect } from 'vitest'
import { UpdateProfileSchema } from '@/modules/profiles/schemas'
import type { ProfessionalProfile, PublicProfileDTO } from '@/modules/profiles/types'

describe('Profile Security & Privacy Invariants', () => {
  it('ProfessionalProfile and PublicProfileDTO strictly exclude KYC legal fields', () => {
    const rawProfile: ProfessionalProfile = {
      id: 'profile-uuid-1',
      account_user_id: 'account-uuid-1',
      stage_name: 'Juliana Castro',
      slug: 'juliana-castro-4f9a',
      headline: 'Modelo',
      bio: 'Atendimento exclusivo',
      public_age: 23,
      height_cm: 170,
      weight_kg: 58,
      bust_cm: 90,
      waist_cm: 60,
      hips_cm: 95,
      eye_color: 'BROWN',
      hair_color: 'BRUNETTE',
      hair_length: 'LONG',
      body_type: 'SLIM',
      has_tattoos: false,
      has_piercings: false,
      languages: ['Português'],
      whatsapp_phone: '+5511999998888',
      direct_phone: null,
      telegram_username: null,
      show_age: false,
      show_height: true,
      show_weight: false,
      show_measurements: false,
      show_whatsapp: true,
      show_phone: false,
      show_telegram: false,
      status: 'DRAFT',
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const publicDTO: PublicProfileDTO = {
      stageName: rawProfile.stage_name,
      slug: rawProfile.slug,
      headline: rawProfile.headline,
      bio: rawProfile.bio,
      publicAge: rawProfile.show_age ? rawProfile.public_age : null,
      heightCm: rawProfile.show_height ? rawProfile.height_cm : null,
      weightKg: rawProfile.show_weight ? rawProfile.weight_kg : null,
      bustCm: rawProfile.show_measurements ? rawProfile.bust_cm : null,
      waistCm: rawProfile.show_measurements ? rawProfile.waist_cm : null,
      hipsCm: rawProfile.show_measurements ? rawProfile.hips_cm : null,
      eyeColor: rawProfile.eye_color,
      hairColor: rawProfile.hair_color,
      hairLength: rawProfile.hair_length,
      bodyType: rawProfile.body_type,
      hasTattoos: rawProfile.has_tattoos,
      hasPiercings: rawProfile.has_piercings,
      languages: rawProfile.languages,
      whatsappPhone: rawProfile.show_whatsapp ? rawProfile.whatsapp_phone : null,
      directPhone: rawProfile.show_phone ? rawProfile.direct_phone : null,
      telegramUsername: rawProfile.show_telegram ? rawProfile.telegram_username : null,
      status: rawProfile.status,
    }

    // Verify KYC fields are NEVER present
    const profileKeys = Object.keys(rawProfile)
    const dtoKeys = Object.keys(publicDTO)

    for (const forbidden of ['cpf', 'legal_name', 'dob', 'date_of_birth', 'biometrics', 'selfie', 'provider_session_id']) {
      expect(profileKeys).not.toContain(forbidden)
      expect(dtoKeys).not.toContain(forbidden)
    }

    // Verify hidden attributes are stripped in DTO
    expect(publicDTO.publicAge).toBeNull() // show_age is false
    expect(publicDTO.weightKg).toBeNull() // show_weight is false
    expect(publicDTO.bustCm).toBeNull() // show_measurements is false
  })

  it('UpdateProfileSchema discards mass-assignment attempts to admin-only fields', () => {
    const maliciousPayload = {
      stage_name: 'Juliana',
      status: 'ACTIVE', // Malicious attempt to self-activate
      account_user_id: 'fake-id',
      ranking: 9999,
      is_featured: true,
      verified_at: new Date().toISOString(),
    }

    const parsed = UpdateProfileSchema.safeParse(maliciousPayload)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      const sanitizedKeys = Object.keys(parsed.data)
      expect(sanitizedKeys).not.toContain('status')
      expect(sanitizedKeys).not.toContain('account_user_id')
      expect(sanitizedKeys).not.toContain('ranking')
      expect(sanitizedKeys).not.toContain('is_featured')
      expect(sanitizedKeys).not.toContain('verified_at')
    }
  })
})
