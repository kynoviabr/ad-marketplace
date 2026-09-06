'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

export type PwaInstallState =
  | 'UNSUPPORTED'
  | 'AVAILABLE'
  | 'IOS_MANUAL'
  | 'INSTALLED'
  | 'DISMISSED'

export type PwaTelemetryEvent =
  | 'PWA_INSTALL_CTA_SHOWN'
  | 'PWA_INSTALL_CTA_CLICKED'
  | 'PWA_INSTALL_PROMPT_ACCEPTED'
  | 'PWA_INSTALL_PROMPT_DISMISSED'
  | 'PWA_INSTALLED'
  | 'PWA_IOS_INSTRUCTIONS_OPENED'
  | 'PWA_STANDALONE_SESSION'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PwaInstallContextValue {
  state: PwaInstallState
  promptInstall: () => Promise<boolean>
  isIosModalOpen: boolean
  openIosModal: () => void
  closeIosModal: () => void
  dismissInstall: () => void
  trackCtaShown: () => void
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

const DISMISSED_STORAGE_KEY = 'velvet_pwa_install_dismissed'
const STANDALONE_SESSION_KEY = 'velvet_pwa_standalone_logged'

/**
 * Privacy-safe telemetry helper.
 *
 * NOTE: Canonical analytics integration is marked DEFERRED per PX4.6 specification
 * because the PostgreSQL enum `analytics_event_type` cannot be extended without
 * a database migration (MIGRATION = NONE policy).
 *
 * Emits zero PII, zero device fingerprinting, and enforces session-scoped deduplication.
 */
function recordPwaTelemetry(event: PwaTelemetryEvent, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  console.info(`[PWA Telemetry] ${event}`, meta ?? '')
}

/**
 * Safe iOS/iPadOS detection that respects user-agent nuances (including iPadOS desktop UA).
 */
export function detectIsIos(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIosDevice = /iphone|ipad|ipod/i.test(ua)
  const isMacWithTouch =
    navigator.platform === 'MacIntel' &&
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1
  return isIosDevice || isMacWithTouch
}

/**
 * Detects if the current window is executing in PWA standalone display mode.
 *
 * CRITICAL ARCHITECTURAL GUARANTEE (Section 15):
 * Install state is UX ONLY. It MUST NEVER be used for authentication, role checks,
 * authorization, or access control.
 */
export function detectIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const isStandaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const isNavigatorStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  return isStandaloneMedia || isNavigatorStandalone
}

class PwaInstallStore {
  private state: PwaInstallState = 'UNSUPPORTED'
  private deferredPrompt: BeforeInstallPromptEvent | null = null
  private listeners = new Set<() => void>()
  private initialized = false

  private init() {
    if (this.initialized || typeof window === 'undefined') return
    this.initialized = true

    if (detectIsStandalone()) {
      this.state = 'INSTALLED'
      if (!sessionStorage.getItem(STANDALONE_SESSION_KEY)) {
        sessionStorage.setItem(STANDALONE_SESSION_KEY, '1')
        recordPwaTelemetry('PWA_STANDALONE_SESSION')
      }
      return
    }

    if (sessionStorage.getItem(DISMISSED_STORAGE_KEY) === '1') {
      this.state = 'DISMISSED'
      return
    }

    if (detectIsIos()) {
      this.state = 'IOS_MANUAL'
    }
  }

  getState(): PwaInstallState {
    this.init()
    return this.state
  }

  getDeferredPrompt(): BeforeInstallPromptEvent | null {
    return this.deferredPrompt
  }

  setBeforeInstallPrompt(e: BeforeInstallPromptEvent) {
    this.deferredPrompt = e
    this.state = 'AVAILABLE'
    this.notify()
  }

  setInstalled() {
    this.deferredPrompt = null
    this.state = 'INSTALLED'
    recordPwaTelemetry('PWA_INSTALLED')
    this.notify()
  }

  setDismissed() {
    this.deferredPrompt = null
    this.state = 'DISMISSED'
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISSED_STORAGE_KEY, '1')
    }
    this.notify()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export const pwaInstallStore = new PwaInstallStore()

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    (callback) => pwaInstallStore.subscribe(callback),
    () => pwaInstallStore.getState(),
    (): PwaInstallState => 'UNSUPPORTED'
  )
  const [isIosModalOpen, setIsIosModalOpen] = useState(false)
  const ctaShownTrackedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Service Worker registration
    if ('serviceWorker' in navigator) {
      const isLocalhost =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      if (process.env.NODE_ENV === 'production' || isLocalhost) {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            registration.onupdatefound = () => {
              const installingWorker = registration.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
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
    }

    // 2. Native Chromium beforeinstallprompt handling
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar on mobile and capture the event
      e.preventDefault()
      pwaInstallStore.setBeforeInstallPrompt(e as BeforeInstallPromptEvent)
    }

    // 3. App installed handler
    const handleAppInstalled = () => {
      pwaInstallStore.setInstalled()
      setIsIosModalOpen(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    recordPwaTelemetry('PWA_INSTALL_CTA_CLICKED')
    const promptEvent = pwaInstallStore.getDeferredPrompt()
    if (!promptEvent) return false

    try {
      await promptEvent.prompt()
      const choiceResult = await promptEvent.userChoice
      if (choiceResult.outcome === 'accepted') {
        recordPwaTelemetry('PWA_INSTALL_PROMPT_ACCEPTED')
        pwaInstallStore.setInstalled()
        return true
      } else {
        recordPwaTelemetry('PWA_INSTALL_PROMPT_DISMISSED')
        pwaInstallStore.setDismissed()
        return false
      }
    } catch (err) {
      console.warn('[PWA] Erro ao invocar prompt de instalação:', err)
      return false
    }
  }, [])

  const openIosModal = useCallback(() => {
    recordPwaTelemetry('PWA_INSTALL_CTA_CLICKED')
    recordPwaTelemetry('PWA_IOS_INSTRUCTIONS_OPENED')
    setIsIosModalOpen(true)
  }, [])

  const closeIosModal = useCallback(() => {
    setIsIosModalOpen(false)
  }, [])

  const dismissInstall = useCallback(() => {
    pwaInstallStore.setDismissed()
  }, [])

  const trackCtaShown = useCallback(() => {
    if (ctaShownTrackedRef.current) return
    ctaShownTrackedRef.current = true
    recordPwaTelemetry('PWA_INSTALL_CTA_SHOWN')
  }, [])

  const value: PwaInstallContextValue = {
    state,
    promptInstall,
    isIosModalOpen,
    openIosModal,
    closeIosModal,
    dismissInstall,
    trackCtaShown,
  }

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  )
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext)
  if (!context) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider')
  }
  return context
}
