import { randomBytes } from 'node:crypto'

/**
 * Converts a display/stage name into a normalized URL-safe slug base.
 * Handles Portuguese accents (e.g. "Juliana São Paulo" -> "juliana-sao-paulo").
 */
export function slugifyStageName(stageName: string): string {
  return stageName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars
    .replace(/\s+/g, '-') // Convert spaces to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '') // Trim leading/trailing hyphens
    .slice(0, 40) // Limit length
}

/**
 * Generates a random alphanumeric suffix (e.g. "4f9b").
 */
export function generateRandomSlugSuffix(length: number = 4): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toLowerCase()
}

/**
 * Generates a unique, collision-resistant slug for a stage name.
 */
export async function generateUniqueSlug(
  stageName: string,
  checkSlugExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = slugifyStageName(stageName) || 'perfil'
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const suffix = generateRandomSlugSuffix(4)
    const candidateSlug = `${baseSlug}-${suffix}`

    const exists = await checkSlugExists(candidateSlug)
    if (!exists) {
      return candidateSlug
    }
    attempts++
  }

  // Fallback with timestamp to guarantee uniqueness
  const timestampSuffix = Date.now().toString(36).slice(-6)
  return `${baseSlug}-${timestampSuffix}`
}
