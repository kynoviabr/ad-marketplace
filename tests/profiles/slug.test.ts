import { describe, it, expect } from 'vitest'
import {
  slugifyStageName,
  generateRandomSlugSuffix,
  generateUniqueSlug,
} from '@/modules/profiles/slug'

describe('Profile Slug Utilities', () => {
  it('converts stage names to clean, URL-safe kebab-case stripping Portuguese accents', () => {
    expect(slugifyStageName('Juliana São Paulo')).toBe('juliana-sao-paulo')
    expect(slugifyStageName('Catarina D’Ávila')).toBe('catarina-davila')
    expect(slugifyStageName('  Vitória & Luísa  ')).toBe('vitoria-luisa')
    expect(slugifyStageName('Ana---Maria')).toBe('ana-maria')
    expect(slugifyStageName('Érica 123')).toBe('erica-123')
  })

  it('generates random hex slug suffixes with requested length', () => {
    const suffix4 = generateRandomSlugSuffix(4)
    expect(suffix4).toHaveLength(4)
    expect(suffix4).toMatch(/^[a-f0-9]{4}$/)

    const suffix6 = generateRandomSlugSuffix(6)
    expect(suffix6).toHaveLength(6)
    expect(suffix6).toMatch(/^[a-f0-9]{6}$/)
  })

  it('generates collision-resistant unique slug when first candidate exists', async () => {
    const takenSlugs = new Set(['juliana-4f9a', 'juliana-9b2c'])

    const checkExists = async (candidate: string) => takenSlugs.has(candidate)

    const generated = await generateUniqueSlug('Juliana', checkExists)
    expect(generated).toMatch(/^juliana-[a-f0-9]{4,}$/)
    expect(takenSlugs.has(generated)).toBe(false)
  })

  it('handles empty or special character only names gracefully with fallback', async () => {
    const checkExists = async () => false
    const fallbackSlug = await generateUniqueSlug('$$$ !!!', checkExists)
    expect(fallbackSlug).toMatch(/^perfil-[a-f0-9]{4,}$/)
  })
})
