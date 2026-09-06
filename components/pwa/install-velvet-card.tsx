'use client'

import React, { useEffect } from 'react'
import { usePwaInstall } from './pwa-install-provider'
import { IosInstallModal } from './ios-install-modal'
import { useI18n } from '@/components/i18n/i18n-provider'

interface InstallVelvetCardProps {
  className?: string
}

export function InstallVelvetCard({ className = '' }: InstallVelvetCardProps) {
  const {
    state,
    promptInstall,
    isIosModalOpen,
    openIosModal,
    closeIosModal,
    dismissInstall,
    trackCtaShown,
  } = usePwaInstall()
  const { t } = useI18n()

  const isEligible = state === 'AVAILABLE' || state === 'IOS_MANUAL'

  useEffect(() => {
    if (isEligible) {
      trackCtaShown()
    }
  }, [isEligible, trackCtaShown])

  if (!isEligible) {
    return isIosModalOpen ? (
      <IosInstallModal isOpen={isIosModalOpen} onClose={closeIosModal} />
    ) : null
  }

  const handleInstallClick = () => {
    if (state === 'AVAILABLE') {
      void promptInstall()
    } else if (state === 'IOS_MANUAL') {
      openIosModal()
    }
  }

  return (
    <>
      <aside
        className={`velvet-install-card ${className}`.trim()}
        aria-label={t('pwa.cardHeading')}
      >
        <div className="velvet-install-card-main">
          <div className="velvet-install-card-badge" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 18H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="velvet-install-card-text">
            <h3 className="velvet-install-card-heading">{t('pwa.cardHeading')}</h3>
            <p className="velvet-install-card-desc">{t('pwa.cardDescription')}</p>
          </div>
        </div>

        <div className="velvet-install-card-actions">
          <button
            type="button"
            className="velvet-install-btn"
            onClick={handleInstallClick}
          >
            {t('pwa.installVelvet')}
          </button>

          <button
            type="button"
            className="velvet-install-dismiss"
            onClick={dismissInstall}
            aria-label={t('pwa.dismiss')}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </aside>

      <IosInstallModal isOpen={isIosModalOpen} onClose={closeIosModal} />
    </>
  )
}
