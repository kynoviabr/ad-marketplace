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
   * Image optimization — remote patterns.
   *
   * Narrowly scoped to Supabase storage for approved profile media delivery.
   * Only *.supabase.co is permitted — no arbitrary remote hosts.
   *
   * FASE 12.2A: Prepared for profile photo rendering in FASE 12.2C/D.
   */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },

  /**
   * Security Headers — F11-SEC-004
   *
   * Applied to every route via source: '/:path*'.
   *
   * FASE 12.2A changes:
   * - font-src updated: added https://fonts.gstatic.com for next/font/google
   * - style-src updated: added https://fonts.googleapis.com for font preconnect
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
          // unsafe-inline required for next/font injected <style> tags
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "img-src 'self' data: blob: https:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          // fonts.gstatic.com serves the actual font files loaded by next/font/google
          "font-src 'self' https://fonts.gstatic.com",
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

