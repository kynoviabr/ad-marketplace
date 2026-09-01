'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'

interface GalleryImage {
  url: string
  alt: string
}

interface ProfileGalleryProps {
  images: GalleryImage[]
  labels: {
    close: string
    previous: string
    next: string
    open: string
    dialog: string
  }
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function ProfileGallery({ images, labels }: ProfileGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([])
  const returnFocusRef = useRef<HTMLButtonElement | null>(null)
  const isOpen = activeIndex !== null

  const close = useCallback(() => setActiveIndex(null), [])
  const showPrevious = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length)
  }, [images.length])
  const showNext = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current + 1) % images.length)
  }, [images.length])

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

  const open = (index: number) => {
    returnFocusRef.current = triggerRefs.current[index]
    setActiveIndex(index)
  }

  return (
    <>
      <div className="profile-gallery-grid">
        {images.map((image, index) => (
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
              sizes="(max-width: 767px) calc(50vw - 20px), (max-width: 1279px) 25vw, 300px"
            />
            <span className="profile-gallery-enlarge" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>

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
            <Image
              src={images[activeIndex].url}
              alt={images[activeIndex].alt}
              fill
              sizes="100vw"
              priority
            />
          </div>
          <button ref={closeRef} type="button" className="profile-lightbox-close" aria-label={labels.close} onClick={close}>×</button>
          {images.length > 1 ? (
            <>
              <button type="button" className="profile-lightbox-previous" aria-label={labels.previous} onClick={showPrevious}>←</button>
              <button type="button" className="profile-lightbox-next" aria-label={labels.next} onClick={showNext}>→</button>
            </>
          ) : null}
          <p className="profile-lightbox-counter" aria-live="polite">{activeIndex + 1} / {images.length}</p>
        </div>
      ) : null}
    </>
  )
}
