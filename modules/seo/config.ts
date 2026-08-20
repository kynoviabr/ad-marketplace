import type { SeoConfig } from './types'
import { getMarketplaceName } from '@/lib/brand'

/**
 * Returns the environment-aware SEO and site configuration.
 *
 * Guaranteed invariants:
 * - `siteUrl` is always a trimmed, valid URL without trailing slash.
 * - `isProduction` is strictly true ONLY when the environment is production AND the hostname is NOT localhost or staging/preview.
 */
export function getSeoConfig(): SeoConfig {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admarketplace.com.br'
  const siteUrl = rawUrl.replace(/\/$/, '').trim()

  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development').toLowerCase()
  const isLocalOrPreview =
    siteUrl.includes('localhost') ||
    siteUrl.includes('127.0.0.1') ||
    siteUrl.includes('.vercel.app') ||
    siteUrl.includes('staging.')

  const isProduction = appEnv === 'production' && !isLocalOrPreview
  const siteName = getMarketplaceName()

  return {
    siteName,
    siteUrl,
    defaultTitle: `${siteName} | Acompanhantes Verificadas 18+ em São Paulo`,
    defaultDescription:
      'Portal de classificados de acompanhantes verificadas 18+ em São Paulo. Fotos auditadas e contato direto via WhatsApp.',
    locale: 'pt_BR',
    country: 'BR',
    isProduction,
  }
}
