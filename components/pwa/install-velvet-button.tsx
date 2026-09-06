'use client'

import React from 'react'
import { usePwaInstall } from './pwa-install-provider'
import { useI18n } from '@/components/i18n/i18n-provider'

interface InstallVelvetButtonProps {
  className?: string
  variant?: 'nav' | 'button'
  onClick?: () => void
}

export function InstallVelvetButton({
  className = '',
  variant = 'nav',
  onClick,
}: InstallVelvetButtonProps) {
  const { state, promptInstall, openIosModal } = usePwaInstall()
  const { t } = useI18n()

  if (state !== 'AVAILABLE' && state !== 'IOS_MANUAL') {
    return null
  }

  const handleClick = () => {
    onClick?.()
    if (state === 'AVAILABLE') {
      void promptInstall()
    } else if (state === 'IOS_MANUAL') {
      openIosModal()
    }
  }

  const baseClass =
    variant === 'nav'
      ? 'velvet-link velvet-link--navigation velvet-mobile-nav-link velvet-pwa-install-nav-link'
      : 'velvet-install-btn'

  return (
    <button
      type="button"
      className={`${baseClass} ${className}`.trim()}
      onClick={handleClick}
      aria-label={t('pwa.installVelvet')}
    >
      <span className="velvet-pwa-btn-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 3V16M12 16L7.5 11.5M12 16L16.5 11.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 20H20" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </span>
      <span>{t('pwa.installVelvet')}</span>
    </button>
  )
}
