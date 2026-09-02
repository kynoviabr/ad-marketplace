'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getVideoPlaybackUrlAction } from '@/modules/videos/actions'

interface GalleryImage {
  url: string
  alt: string
  videoId?: string
}

interface ProfileGalleryProps {
  images: GalleryImage[]
  videos?: GalleryImage[]
  labels: {
    close: string
    previous: string
    next: string
    open: string
    dialog: string
    viewAll: string
  }
}

export const DESKTOP_MEDIA_PREVIEW_LIMIT = 8
export const MOBILE_MEDIA_PREVIEW_LIMIT = 6

export function getProfileMediaPreview(images: GalleryImage[]) {
  return images.slice(0, DESKTOP_MEDIA_PREVIEW_LIMIT)
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ProfileGallery({ images, videos = [], labels }: ProfileGalleryProps) {
  const allMedia = [...images, ...videos]
  const mediaLength = images.length + videos.length
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [videoUrl,setVideoUrl]=useState<string|null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([])
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)
  const viewAllRef = useRef<HTMLButtonElement>(null)
  const isOpen = activeIndex !== null
  const previewImages = getProfileMediaPreview(allMedia)
  const activeVideoId = activeIndex === null ? null : allMedia[activeIndex]?.videoId

  const close = useCallback(() => {setActiveIndex(null);setVideoUrl(null)}, [])
  const showPrevious = useCallback(() => {
    setVideoUrl(null)
    setActiveIndex((current) => current === null ? null : (current - 1 + mediaLength) % mediaLength)
  }, [mediaLength])
  const showNext = useCallback(() => {
    setVideoUrl(null)
    setActiveIndex((current) => current === null ? null : (current + 1) % mediaLength)
  }, [mediaLength])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    const page = dialogRef.current?.closest('.profile-detail-page')
    const gallerySection = dialogRef.current?.closest('.profile-gallery')
    const pageTargets = page
      ? Array.from(page.children).filter((element): element is HTMLElement => (
          element instanceof HTMLElement && element !== gallerySection
        ))
      : []
    const shellTargets = Array.from(document.querySelectorAll<HTMLElement>(
      '.velvet-public-header, .velvet-public-footer'
    ))
    const inertTargets = [...pageTargets, ...shellTargets]
    const previousInert = inertTargets.map((element) => element.inert)

    document.body.style.overflow = 'hidden'
    inertTargets.forEach((element) => { element.inert = true })
    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        showPrevious()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        showNext()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1)
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      inertTargets.forEach((element, index) => { element.inert = previousInert[index] })
      window.requestAnimationFrame(() => returnFocusRef.current?.focus())
    }
  }, [close, isOpen, showNext, showPrevious])

  useEffect(() => {
    if (activeIndex === null) return
    const videoId = activeVideoId
    if (!videoId) return
    let current = true
    void getVideoPlaybackUrlAction({ video_id: videoId }).then((result) => {
      if (current && result.success) setVideoUrl(result.data)
    })
    return () => { current = false }
  }, [activeIndex, activeVideoId])

  const open = (index: number) => {
    returnFocusRef.current = triggerRefs.current[index]
    setVideoUrl(null)
    setActiveIndex(index)
  }

  const openAll = () => {
    returnFocusRef.current = viewAllRef.current
    setActiveIndex(0)
  }

  return (
    <>
      <div className="profile-gallery-grid">
        {previewImages.map((image, index) => (
          <button
            key={image.url}
            ref={(element) => { triggerRefs.current[index] = element }}
            type="button"
            className="profile-gallery-thumbnail"
            aria-label={`${labels.open}: ${image.alt}`}
            onClick={() => open(index)}
          >
            <Image
              src={image.url}
              alt={image.alt}
              fill
              loading="lazy"
              quality={75}
              sizes="(max-width: 767px) calc((100vw - 64px) / 3), (max-width: 1099px) 132px, 136px"
            />
            <span className="profile-gallery-enlarge" aria-hidden="true">↗</span>
            {image.videoId ? <span className="profile-gallery-play" aria-hidden="true">▶</span> : null}
          </button>
        ))}
      </div>

      {allMedia.length > MOBILE_MEDIA_PREVIEW_LIMIT ? (
        <button
          ref={viewAllRef}
          type="button"
          className={`profile-gallery-view-all${allMedia.length <= DESKTOP_MEDIA_PREVIEW_LIMIT ? ' profile-gallery-view-all--mobile' : ''}`}
          onClick={openAll}
        >
          {labels.viewAll} <span aria-hidden="true">→</span>
        </button>
      ) : null}

      {activeIndex !== null ? (
        <div
          ref={dialogRef}
          className="profile-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={labels.dialog}
          tabIndex={-1}
        >
          <button
            type="button"
            className="profile-lightbox-backdrop"
            aria-label={labels.close}
            tabIndex={-1}
            onClick={close}
          />
          <div className="profile-lightbox-stage">
            {allMedia[activeIndex].videoId ? (videoUrl ? <video src={videoUrl} poster={allMedia[activeIndex].url} controls preload="none" playsInline /> : <Image src={allMedia[activeIndex].url} alt={allMedia[activeIndex].alt} fill sizes="100vw" />) : <Image
              src={images[activeIndex].url}
              alt={images[activeIndex].alt}
              fill
              sizes="100vw"
              priority
            />}
          </div>
          <button ref={closeRef} type="button" className="profile-lightbox-close" aria-label={labels.close} onClick={close}>×</button>
          {allMedia.length > 1 ? (
            <>
              <button type="button" className="profile-lightbox-previous" aria-label={labels.previous} onClick={showPrevious}>←</button>
              <button type="button" className="profile-lightbox-next" aria-label={labels.next} onClick={showNext}>→</button>
            </>
          ) : null}
          <p className="profile-lightbox-counter" aria-live="polite">{videos.length ? <>{activeIndex + 1} / {allMedia.length}</> : <>{activeIndex + 1} / {images.length}</>}</p>
        </div>
      ) : null}
    </>
  )
}
