import type { MetadataRoute } from 'next'
import { getSeoConfig } from '@/modules/seo/config'

export const revalidate = 3600

/**
 * Dynamic robots.txt generation.
 *
 * Environment Policy:
 * - DEV / STAGING / PREVIEW: Disallow all crawlers (`Disallow: /`).
 * - PRODUCTION: Allow public surfaces, disallow private application routes, and link sitemap.xml.
 */
export default function robots(): MetadataRoute.Robots {
  const config = getSeoConfig()

  if (!config.isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/onboarding/',
          '/api/',
          '/auth/',
          '/complete-signup',
          '/suspended',
        ],
      },
    ],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  }
}
