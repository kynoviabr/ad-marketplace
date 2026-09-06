'use client'

import React, { useEffect, useRef } from 'react'
import { useI18n } from '@/components/i18n/i18n-provider'

interface IosInstallModalProps {
  isOpen: boolean
  onClose: () => void
}

export function IosInstallModal({ isOpen, onClose }: IosInstallModalProps) {
  const { t } = useI18n()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus close button on mount
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="velvet-pwa-modal-backdrop"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        className="velvet-pwa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="velvet-ios-install-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="velvet-pwa-modal-header">
          <h2 id="velvet-ios-install-title" className="velvet-pwa-modal-title">
            {t('pwa.iosModalTitle')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="velvet-pwa-modal-close"
            onClick={onClose}
            aria-label={t('pwa.dismiss')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="velvet-pwa-modal-desc">
          {t('pwa.iosModalDescription')}
        </p>

        <ol className="velvet-pwa-modal-steps">
          <li className="velvet-pwa-modal-step">
            <span className="velvet-pwa-step-num" aria-hidden="true">1</span>
            <div className="velvet-pwa-step-content">
              <span>{t('pwa.iosStep1')}</span>
              <svg className="velvet-pwa-share-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3V16M12 3L7.5 7.5M12 3L16.5 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 12V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
          </li>

          <li className="velvet-pwa-modal-step">
            <span className="velvet-pwa-step-num" aria-hidden="true">2</span>
            <div className="velvet-pwa-step-content">
              <span>{t('pwa.iosStep2')}</span>
              <svg className="velvet-pwa-add-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
          </li>

          <li className="velvet-pwa-modal-step">
            <span className="velvet-pwa-step-num" aria-hidden="true">3</span>
            <div className="velvet-pwa-step-content">
              <span>{t('pwa.iosStep3')}</span>
            </div>
          </li>
        </ol>

        <div className="velvet-pwa-modal-actions">
          <button
            type="button"
            className="velvet-pwa-primary-btn"
            onClick={onClose}
          >
            {t('pwa.iosModalClose')}
          </button>
        </div>
      </div>
    </div>
  )
}
