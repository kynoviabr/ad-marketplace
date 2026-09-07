import type { MetadataRoute } from 'next'

/**
 * Web App Manifest for Velvet PWA.
 *
 * Configures the standalone mobile and desktop installation experience.
 *
 * Privacy & Routing invariants:
 * - start_url is the canonical role-aware launcher ('/app')
 * - scope is '/'
 * - display is 'standalone'
 * - theme_color matches Velvet deep brand aubergine (#3B203F)
 * - background_color matches Velvet warm surface (#F5F1E8)
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Velvet',
    short_name: 'Velvet',
    description: 'Velvet — Guia e marketplace de acompanhantes e modelos em São Paulo.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F1E8',
    theme_color: '#3B203F',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
