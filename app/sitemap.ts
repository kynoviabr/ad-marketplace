import type { MetadataRoute } from 'next'
import { getSitemapData } from '@/modules/seo/dal'

export const revalidate = 3600

/**
 * Dynamic sitemap.xml generation.
 *
 * Guaranteed Invariants (FASE 10):
 * - Includes: `/`, active cities (>= 3 profiles), active locations (>= 3 profiles).
 * - Excludes: `/perfil/[slug]` (profile routes are built in FASE 12).
 * - Excludes: Private/admin routes, paginated query params, search filter query params.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapData()

  return entries.map((e) => ({
    url: e.url,
    lastModified: e.lastModified ? new Date(e.lastModified) : undefined,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }))
}
