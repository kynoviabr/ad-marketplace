import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import manifest from '@/app/manifest'
import { constructRootMetadata, viewport } from '@/modules/seo/metadata'
import { isReservedSlug } from '@/modules/seo/constants'

describe('PX4.5 — Web App Manifest & App Metadata', () => {
  const root = process.cwd()

  it('generates a valid canonical Web App Manifest according to W3C specification', () => {
    const data = manifest()

    expect(data.name).toBe('Velvet')
    expect(data.short_name).toBe('Velvet')
    expect(data.description).toContain('Velvet')
    expect(data.start_url).toBe('/app')
    expect(data.scope).toBe('/')
    expect(data.display).toBe('standalone')
    expect(data.theme_color).toBe('#3B203F')
    expect(data.background_color).toBe('#F5F1E8')
    expect(Array.isArray(data.icons)).toBe(true)
    expect(data.icons!.length).toBeGreaterThanOrEqual(4)
  })

  it('guarantees all manifest icons exist as valid PNG files in public directory', () => {
    const data = manifest()
    expect(data.icons).toBeDefined()

    for (const icon of data.icons!) {
      // icon.src is like /icons/icon-192x192.png
      const iconPath = resolve(root, 'public', icon.src.replace(/^\//, ''))
      expect(existsSync(iconPath), `Icon file ${iconPath} must exist`).toBe(true)

      const buffer = readFileSync(iconPath)
      // PNG header check: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      expect(buffer.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
      expect(buffer.length).toBeGreaterThan(500)
    }

    // Also verify apple-touch-icon at root public/
    const appleIconPath = resolve(root, 'public/apple-touch-icon.png')
    expect(existsSync(appleIconPath)).toBe(true)
  })

  it('exports mobile-optimized viewport with safe-area and theme color', () => {
    expect(viewport.themeColor).toBe('#3B203F')
    expect(viewport.width).toBe('device-width')
    expect(viewport.viewportFit).toBe('cover')
  })

  it('constructs root metadata with PWA, Apple Web App, and manifest directives', () => {
    const meta = constructRootMetadata('pt-BR')
    expect(meta.manifest).toBe('/manifest.webmanifest')
    expect(meta.appleWebApp).toEqual({
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'Velvet',
    })
    expect(meta.icons).toEqual({
      icon: '/favicon.ico',
      apple: '/icons/apple-touch-icon.png',
    })
  })

  it('reserves PWA asset and route slugs from dynamic city landing pages', () => {
    expect(isReservedSlug('offline')).toBe(true)
    expect(isReservedSlug('sw.js')).toBe(true)
    expect(isReservedSlug('manifest.webmanifest')).toBe(true)
    expect(isReservedSlug('icons')).toBe(true)
  })
})

describe('PX4.5 — Service Worker Privacy & Caching Invariants', () => {
  const root = process.cwd()
  const swPath = resolve(root, 'public/sw.js')

  it('provides a valid service worker file in public/sw.js', () => {
    expect(existsSync(swPath)).toBe(true)
    const swContent = readFileSync(swPath, 'utf8')
    expect(swContent).toContain("self.addEventListener('install'")
    expect(swContent).toContain("self.addEventListener('activate'")
    expect(swContent).toContain("self.addEventListener('fetch'")
  })

  it('enforces that private, authenticated, and API routes are strictly excluded from caching', () => {
    const swContent = readFileSync(swPath, 'utf8')

    // Extract isPrivateOrAuthRoute function logic from sw.js
    expect(swContent).toContain("pathname === '/app'")
    expect(swContent).toContain("pathname.startsWith('/dashboard')")
    expect(swContent).toContain("pathname.startsWith('/cliente')")
    expect(swContent).toContain("pathname.startsWith('/admin')")
    expect(swContent).toContain("pathname.startsWith('/onboarding')")
    expect(swContent).toContain("pathname.startsWith('/api')")
    expect(swContent).toContain("pathname.startsWith('/auth')")
    expect(swContent).toContain("pathname === '/login'")

    // Verify it excludes signed media
    expect(swContent).toContain("url.searchParams.has('token')")
    expect(swContent).toContain("url.pathname.includes('/sign/profile-media')")
    expect(swContent).toContain("url.pathname.includes('/sign/profile-videos')")

    // Verify that fetch handler returns network only without cache.put for private routes
    const privateSection = swContent.slice(
      swContent.indexOf('isPrivateOrAuthRoute(url.pathname)'),
      swContent.indexOf('isStaticAsset(url.pathname)')
    )
    expect(privateSection).not.toContain('cache.put')
    expect(privateSection).toContain('fetch(request)')
  })

  it('implements cache versioning and cleans obsolete Velvet caches on activate', () => {
    const swContent = readFileSync(swPath, 'utf8')
    expect(swContent).toContain("key.startsWith('velvet-')")
    expect(swContent).toContain('caches.delete(key)')
    expect(swContent).toContain('self.clients.claim()')
  })

  it('precaches the offline fallback page and core brand icons during install', () => {
    const swContent = readFileSync(swPath, 'utf8')
    expect(swContent).toContain("'/offline'")
    expect(swContent).toContain("'/icons/icon-192x192.png'")
    expect(swContent).toContain("'/icons/icon-512x512.png'")
    expect(swContent).toContain("'/icons/apple-touch-icon.png'")
    expect(swContent).toContain('self.skipWaiting()')
  })

  it('ensures offline fallback page exists and exposes no personalized data', () => {
    const offlinePagePath = resolve(root, 'app/(public)/offline/page.tsx')
    expect(existsSync(offlinePagePath)).toBe(true)
    const content = readFileSync(offlinePagePath, 'utf8')

    // Must be non-personalized
    expect(content).toContain('Você está sem conexão')
    expect(content).toContain('Tentar reconectar')
    expect(content).not.toContain('dashboard')
    expect(content).not.toContain('profile_id')
    expect(content).not.toContain('account')
  })
})
