'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCarousel } from './use-carousel'

interface ContentItem {
  id: string
  type: string
  mediaUrl?: string | null
  profileSlug: string
}

export function HomeNewContent({
  content,
  title,
  overline,
}: {
  content: ContentItem[]
  title: string
  overline?: string
}) {
  const validContent = (content || []).filter((c) => Boolean(c.mediaUrl && c.profileSlug))

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
  } = useCarousel(validContent)

  if (validContent.length === 0) return null

  return (
    <section className="velvet-home-section velvet-home-section--alt" aria-label={title}>
      <div className="velvet-home-section-header">
        <div>
          <p className="velvet-overline">{overline || 'NOVOS CONTEÚDOS'}</p>
          <h2>{title}</h2>
        </div>
        {canScroll && (
          <div className="velvet-carousel-controls" aria-label="Controles do carrossel">
            <button
              type="button"
              onClick={handlePrev}
              className="velvet-carousel-arrow"
              aria-label="Conteúdo anterior"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="velvet-carousel-arrow"
              aria-label="Próximo conteúdo"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

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
          {renderedItems.map(({ item: c }, renderIdx) => (
            <div
              key={`${c.id}-${renderIdx}`}
              className="velvet-carousel-slide"
              style={{ width: cardWidth > 0 ? `${cardWidth}px` : undefined }}
            >
              <Link
                href={`/perfil/${c.profileSlug}`}
                className="velvet-new-content-card"
                aria-label={`Mídia do perfil ${c.profileSlug}`}
              >
                <Image
                  src={c.mediaUrl!}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="velvet-new-content-image"
                />
                {c.type === 'VIDEO' && (
                  <div className="velvet-video-badge" aria-hidden="true">
                    <span className="velvet-video-play-icon">▶</span>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
