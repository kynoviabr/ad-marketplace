import 'server-only'
import { getValidatedServerEnv } from '@/lib/env/server'

export interface CheckoutReturnUrls {
  successUrl: string
  cancelUrl: string
}

/** Validates the configured application origin; request/browser headers are never consulted. */
export function buildTrustedCheckoutReturnUrls(
  configuredAppUrl: string,
  nodeEnv: 'development' | 'production' | 'test'
): CheckoutReturnUrls {
  if (!configuredAppUrl || configuredAppUrl !== configuredAppUrl.trim()) {
    throw new Error('INVALID_APP_ORIGIN')
  }

  let parsed: URL
  try {
    parsed = new URL(configuredAppUrl)
  } catch {
    throw new Error('INVALID_APP_ORIGIN')
  }

  const localDevelopmentOrigin =
    nodeEnv !== 'production' &&
    parsed.protocol === 'http:' &&
    (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1')
  const trustedHttpsOrigin = parsed.protocol === 'https:'

  if (
    (!trustedHttpsOrigin && !localDevelopmentOrigin) ||
    parsed.username || parsed.password || parsed.search || parsed.hash ||
    (parsed.pathname !== '/' && parsed.pathname !== '')
  ) {
    throw new Error('INVALID_APP_ORIGIN')
  }

  const origin = parsed.origin
  return {
    successUrl: new URL('/dashboard/billing?success=true', origin).toString(),
    cancelUrl: new URL('/dashboard/billing?canceled=true', origin).toString(),
  }
}

export function getTrustedCheckoutReturnUrls(): CheckoutReturnUrls {
  const env = getValidatedServerEnv()
  return buildTrustedCheckoutReturnUrls(env.APP_URL, env.NODE_ENV)
}
