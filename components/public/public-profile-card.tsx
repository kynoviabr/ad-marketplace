'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { SearchResultDTO } from '@/modules/search/types'
import { useI18n } from '@/components/i18n'
import { localizePathname } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'

export interface PublicProfileCardProps {
  profile: SearchResultDTO
  mediaUrl: string | null
  priority?: boolean
  variant?: 'default' | 'search'
  cityName?: string
  locale?: Locale
}

export function PublicProfileCard({ profile, mediaUrl, priority = false, variant = 'default', cityName = 'São Paulo', locale = 'pt-BR' }: PublicProfileCardProps) {
  const { t } = useI18n()
  const isSearch = variant === 'search'
  return (
    <Link href={localizePathname(`/perfil/${profile.slug}`, locale)} className={`velvet-profile-card${isSearch ? ' velvet-profile-card--search' : ''}`}>
      <div>
        {/* Photo Container - 4:5 Aspect Ratio */}
        <div className="velvet-profile-photo">
          {mediaUrl ? (
            <Image
              src={mediaUrl}
              alt={profile.stageName}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="velvet-profile-image"
            />
          ) : (
            <div className="velvet-photo-fallback" aria-hidden="true">
              V
            </div>
          )}

          {/* Overlays */}
          <div className="velvet-profile-badges">
            {!isSearch && profile.isVerified && (
              <div className="velvet-verified-mark"><i>V</i><span>{t('common.verified18')}</span>
              </div>
            )}
            {profile.isSponsored && (
              <div className="velvet-sponsored-mark">
                {t('common.sponsored')}
              </div>
            )}
          </div>
        </div>

        {/* Content Area - Minimalist */}
        <div className="velvet-profile-meta">
          <div>
            <h3>
              {profile.stageName}{profile.publicAge ? `, ${profile.publicAge}` : ''}
            </h3>
          </div>

          <div className="velvet-profile-location">
            {profile.primaryLocation ? (
              <span>{isSearch ? `${profile.primaryLocation.name} · ${cityName}` : profile.primaryLocation.name}</span>
            ) : (
              <span>{cityName}</span>
            )}
          </div>
          {isSearch && profile.isVerified ? <div className="velvet-profile-verification"><i aria-hidden="true">V</i><span>{t('common.verified18')}</span></div> : null}
        </div>
      </div>
    </Link>
  )
}
