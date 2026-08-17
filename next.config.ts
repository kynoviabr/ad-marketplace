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
}

export default nextConfig
