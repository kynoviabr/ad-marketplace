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
          '/en/admin/',
          '/dashboard/',
          '/en/dashboard/',
          '/onboarding/',
          '/en/onboarding/',
          '/api/',
          '/auth/',
          '/complete-signup',
          '/en/complete-signup',
          '/suspended',
          '/en/suspended',
        ],
      },
    ],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  }
}
