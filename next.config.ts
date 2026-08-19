import type { NextConfig } from 'next'

/**
 * Next.js configuration for AD-Marketplace.
 *
 * Principles:
 * - No Vercel-specific features (output: 'standalone' works on any Node.js server)
 * - Portability: compatible with Hostinger/standard Node.js deployment
 * - No experimental features that create provider lock-in
 */
const nextConfig: NextConfig = {
  // 'standalone' bundles everything needed to run on a plain Node.js server.
  // This is required for Hostinger deployment and is NOT Vercel-specific.
  output: 'standalone',

  // Enforce strict TypeScript checking during builds
  typescript: {
    ignoreBuildErrors: false,
  },

  /**
   * Security Headers — F11-SEC-004
   *
   * Applied to every route via source: '/:path*'.
   *
   * Notes:
   * - `unsafe-inline` for script-src is currently required for Next.js App Router
   *   hydration. This is a known framework limitation and should be replaced with
   *   a nonce-based CSP once Next.js ships stable nonce support.
   * - HSTS is excluded from development to avoid locking localhost to HTTPS,
   *   which would break the local dev server and persist across browser sessions.
   */
  async headers() {
    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
      {
        key: 'Content-Security-Policy',
        // unsafe-inline for scripts is required for Next.js App Router hydration.
        // Known limitation until nonce-based CSP is implemented.
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          "font-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; '),
      },
      // HSTS is excluded from development to avoid locking localhost to HTTPS.
      // Only applied in production where HTTPS is guaranteed.
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains',
            },
          ]
        : []),
    ]

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
