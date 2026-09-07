/**
 * Velvet PWA Service Worker — PX4.5
 *
 * Security-First Caching Policy & Invariants:
 * 1. ZERO CACHING OF PRIVATE / AUTHENTICATED ROUTES:
 *    /dashboard*, /cliente*, /admin*, /onboarding*, /auth*, /api*, /login, /signup*
 *    are strictly network-only. Responses are NEVER persisted in Cache Storage.
 * 2. ZERO CACHING OF SIGNED MEDIA:
 *    Signed media delivery with short-lived tokens (e.g., token=...) is NEVER cached.
 * 3. NO THIRD-PARTY SCHEME INTERCEPTION:
 *    wa.me, whatsapp:, tel:, mailto: are never intercepted.
 * 4. PUBLIC NAVIGATION (Network-First):
 *    Public pages (home, city, neighborhood, profile) always fetch from network first
 *    to preserve live availability signals and avoid stale badges.
 *    If offline, fallback to pre-cached /offline.
 * 5. IMMUTABLE STATIC ASSETS (Cache-First):
 *    /_next/static/*, /icons/*, fonts, and manifest are cached for performance.
 */

const STATIC_CACHE = 'velvet-static-v1'
const OFFLINE_CACHE = 'velvet-offline-v1'

const PRECACHE_ASSETS = [
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.ico',
]

// ---------------------------------------------------------------------------
// LIFECYCLE
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('velvet-') && key !== STATIC_CACHE && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ---------------------------------------------------------------------------
// ROUTE CLASSIFIERS
// ---------------------------------------------------------------------------

function isPrivateOrAuthRoute(pathname) {
  return (
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/cliente') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/signup-client' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/verify-email' ||
    pathname === '/complete-signup'
  )
}

function isSignedMediaUrl(url) {
  return (
    url.searchParams.has('token') ||
    url.pathname.includes('/sign/profile-media') ||
    url.pathname.includes('/sign/profile-videos') ||
    url.pathname.includes('/storage/v1/object/sign/')
  )
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/static/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff')
  )
}

// ---------------------------------------------------------------------------
// FETCH HANDLER
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return
  }

  // 2. Only handle HTTP/HTTPS and same-origin requests
  if (!url.protocol.startsWith('http') || url.origin !== self.location.origin) {
    return
  }

  // 3. SECURITY RULE: Private, authenticated, and signed media routes are STRICTLY NETWORK-ONLY.
  // Responses from these routes are NEVER saved to Cache Storage.
  if (isPrivateOrAuthRoute(url.pathname) || isSignedMediaUrl(url)) {
    event.respondWith(
      fetch(request).catch(async () => {
        // For private navigation when offline, show safe offline notice without revealing any cached personal data
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match('/offline')
          if (offlinePage) return offlinePage
        }
        return Promise.reject(new Error('Network unavailable for private operation'))
      })
    )
    return
  }

  // 4. STATIC ASSETS: Cache-first with network fill
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone))
          }
          return networkResponse
        })
      })
    )
    return
  }

  // 5. PUBLIC HTML NAVIGATION: Network-first to always reflect real-time availability
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offlinePage = await caches.match('/offline')
        if (offlinePage) {
          return offlinePage
        }
        return new Response('Modo offline — Velvet requer conexão ativa.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      })
    )
    return
  }

  // 6. Default pass-through for other requests
  event.respondWith(fetch(request))
})
