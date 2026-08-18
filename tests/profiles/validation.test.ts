import { describe, it, expect } from 'vitest'
import {
  CreateProfileDraftSchema,
  UpdateProfileSchema,
  normalizePhoneToE164,
} from '@/modules/profiles/schemas'

describe('Profile Validation Schemas & Normalizers', () => {
  describe('Phone E.164 Normalization', () => {
    it('normalizes local Brazilian phone numbers to international E.164', () => {
      expect(normalizePhoneToE164('11999998888')).toBe('+5511999998888')
      expect(normalizePhoneToE164('(11) 99999-8888')).toBe('+5511999998888')
      expect(normalizePhoneToE164('+55 (11) 99999-8888')).toBe('+5511999998888')
      expect(normalizePhoneToE164('+1 415 555 2671')).toBe('+14155552671')
    })
  })

  describe('CreateProfileDraftSchema', () => {
    it('accepts valid stage name', () => {
      const valid = CreateProfileDraftSchema.safeParse({ stage_name: 'Juliana Castro' })
      expect(valid.success).toBe(true)
    })

    it('rejects stage name shorter than 2 chars or empty', () => {
      expect(CreateProfileDraftSchema.safeParse({ stage_name: 'A' }).success).toBe(false)
      expect(CreateProfileDraftSchema.safeParse({ stage_name: '   ' }).success).toBe(false)
    })

    it('rejects stage name longer than 60 chars', () => {
      const longName = 'A'.repeat(61)
      expect(CreateProfileDraftSchema.safeParse({ stage_name: longName }).success).toBe(false)
    })
  })

  describe('UpdateProfileSchema', () => {
    const validFullPayload = {
      stage_name: 'Juliana',
      headline: 'Modelo Fotográfica e Atendimento VIP',
      bio: 'Atendimento com discrição e pontualidade na região de Moema.',
      public_age: 23,
      height_cm: 170,
      weight_kg: 58,
      bust_cm: 90,
      waist_cm: 62,
      hips_cm: 96,
      eye_color: 'BROWN',
      hair_color: 'BRUNETTE',
      hair_length: 'LONG',
      body_type: 'ATHLETIC',
      has_tattoos: false,
      has_piercings: true,
      languages: ['Português', 'Inglês'],
      whatsapp_phone: '+5511999998888',
      direct_phone: '+5511988887777',
      telegram_username: 'julianavip',
      show_age: true,
      show_height: true,
      show_weight: false,
      show_measurements: true,
      show_whatsapp: true,
      show_phone: false,
      show_telegram: true,
    }

    it('accepts a fully populated valid profile payload', () => {
      const parsed = UpdateProfileSchema.safeParse(validFullPayload)
      expect(parsed.success).toBe(true)
    })

    it('enforces public_age >= 18', () => {
      const underage = { ...validFullPayload, public_age: 17 }
      expect(UpdateProfileSchema.safeParse(underage).success).toBe(false)

      const exact18 = { ...validFullPayload, public_age: 18 }
      expect(UpdateProfileSchema.safeParse(exact18).success).toBe(true)
    })

    it('enforces height, weight, and measurement ranges', () => {
      expect(UpdateProfileSchema.safeParse({ ...validFullPayload, height_cm: 90 }).success).toBe(false)
      expect(UpdateProfileSchema.safeParse({ ...validFullPayload, height_cm: 260 }).success).toBe(false)
      expect(UpdateProfileSchema.safeParse({ ...validFullPayload, weight_kg: 25 }).success).toBe(false)
      expect(UpdateProfileSchema.safeParse({ ...validFullPayload, bust_cm: 30 }).success).toBe(false)
    })

    it('validates and strips @ from telegram username', () => {
      const withAt = { ...validFullPayload, telegram_username: '@julianavip' }
      const parsed = UpdateProfileSchema.safeParse(withAt)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.telegram_username).toBe('julianavip')
      }
    })

    it('allows optional fields to be null or omitted during draft stage', () => {
      const minimalDraft = {
        stage_name: 'Juliana',
        headline: null,
        bio: null,
        public_age: null,
        height_cm: null,
      }
      expect(UpdateProfileSchema.safeParse(minimalDraft).success).toBe(true)
    })
  })
})
