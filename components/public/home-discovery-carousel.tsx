'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProfileWithMedia } from './public-profile-grid'
import { useCarousel } from './use-carousel'
import { localizePathname } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'

interface HomeDiscoveryCarouselProps {
  profiles: ProfileWithMedia[]
  overline: string
  title: string
  exploreText: string
  exploreHref: string
  locale: Locale
}

export function HomeDiscoveryCarousel({
  profiles,
  overline,
  title,
  exploreText,
  exploreHref,
  locale,
}: HomeDiscoveryCarouselProps) {
  const {
    viewportRef,
    renderedItems,
    cardWidth,
    gap,
    translateX,
    isTransitioning,
    canScroll,
    handlePrev,
    handleNext,
    handleTransitionEnd,
    handlers,
  } = useCarousel(profiles)

  if (profiles.length === 0) return null

  return (
    <aside className="velvet-home-discovery" aria-label={title}>
      <div className="velvet-home-discovery-sidebar">
        <div>
          <p className="velvet-overline">{overline}</p>
          <h2>{title}</h2>
          <Link href={exploreHref} className="velvet-home-discovery-link">
            {exploreText} <span>→</span>
          </Link>
        </div>
      </div>

      <div className="velvet-home-discovery-content">
        {canScroll && (
          <div className="velvet-home-discovery-header">
            <div className="velvet-carousel-controls" aria-label="Controles do carrossel">
              <button
                type="button"
                onClick={handlePrev}
                className="velvet-carousel-arrow"
                aria-label="Modelo anterior"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="velvet-carousel-arrow"
                aria-label="Próxima modelo"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div
          ref={viewportRef}
          className="velvet-carousel-viewport"
          {...handlers}
        >
          <div
            className="velvet-carousel-track"
            style={{
              transform: `translate3d(-${translateX}px, 0, 0)`,
              transition: isTransitioning
                ? 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)'
                : 'none',
              gap: `${gap}px`,
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {renderedItems.map(({ item: profile, index }, renderIdx) => (
              <div
                key={`${profile.id}-${renderIdx}`}
                className="velvet-carousel-slide"
                style={{ width: cardWidth > 0 ? `${cardWidth}px` : undefined }}
              >
                <Link
                  href={localizePathname(`/perfil/${profile.slug}`, locale)}
                  className="velvet-discovery-card"
                >
                  <span className="velvet-home-discovery-image">
                    {profile.mediaUrl ? (
                      <Image
                        src={profile.mediaUrl}
                        alt={profile.stageName}
                        fill
                        sizes="(max-width: 700px) 50vw, (max-width: 1024px) 33vw, 260px"
                      />
                    ) : (
                      <span className="velvet-photo-fallback" aria-hidden="true">
                        V
                      </span>
                    )}
                  </span>
                  <div className="velvet-discovery-card-meta">
                    <b>0{index + 1}</b>
                    <strong>{profile.stageName}</strong>
                    <small>{profile.primaryLocation?.name ?? 'São Paulo'}</small>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
