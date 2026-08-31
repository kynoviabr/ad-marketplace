'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { SearchResultDTO } from '@/modules/search/types'
import { useI18n } from '@/components/i18n'

export interface PublicProfileCardProps {
  profile: SearchResultDTO
  mediaUrl: string | null
  priority?: boolean
}

export function PublicProfileCard({ profile, mediaUrl, priority = false }: PublicProfileCardProps) {
  const { t } = useI18n()
  return (
    <Link href={`/perfil/${profile.slug}`} className="velvet-profile-card">
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
            <div className="velvet-profile-no-photo" aria-hidden="true">
              V
            </div>
          )}

          {/* Overlays */}
          <div className="velvet-profile-badges">
            {profile.isVerified && (
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

          <div>
            {profile.primaryLocation ? (
              <span>{profile.primaryLocation.name}</span>
            ) : (
              <span>São Paulo</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
