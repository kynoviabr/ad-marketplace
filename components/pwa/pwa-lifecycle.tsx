'use client'

import { useEffect } from 'react'

/**
 * PWA Lifecycle & Standalone Detection Component.
 *
 * Responsibilities:
 * - Registers the Velvet Service Worker (/sw.js) in production and supported environments.
 * - Detects standalone mode (display-mode: standalone / iOS navigator.standalone).
 * - Tracks privacy-safe PWA lifecycle telemetry without PII or intrusive popups.
 */
export function PwaLifecycle() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // 1. Register Service Worker in production or localhost
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (process.env.NODE_ENV === 'production' || isLocalhost) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Check for updates on page load
          registration.onupdatefound = () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available; will activate on next navigation
                  console.info('[PWA] Nova versão do Velvet instalada e pronta para ativação.')
                }
              }
            }
          }
        })
        .catch((error) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', error)
        })
    }

    // 2. Standalone Mode Detection & Session Telemetry
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true

    if (isStandalone) {
      const sessionKey = 'velvet_pwa_standalone_logged'
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1')
        console.info('[PWA] Sessão iniciada em modo standalone (PWA instalado).')
      }
    }

    // 3. Native install prompt telemetry (non-intrusive, no popups)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Do NOT show an intrusive modal or prevent default unless a contextual CTA is requested
      console.info('[PWA] Navegador elegível para instalação do Velvet (beforeinstallprompt detectado).')
    }

    const handleAppInstalled = () => {
      console.info('[PWA] Aplicativo Velvet instalado com sucesso pelo usuário.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return null
}
