'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

function getInitialVisibleCount(): number {
  if (typeof window === 'undefined') return 4
  if (window.innerWidth <= 700) return 2
  if (window.innerWidth <= 1024) return 3
  return 4
}

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCarousel<T>(items: T[]) {
  const [visibleCount, setVisibleCount] = useState(getInitialVisibleCount)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialReducedMotion)
  const viewportRef = useRef<HTMLDivElement>(null)

  // 1. Responsive layout listener
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth
      if (w <= 700) {
        setVisibleCount(2)
      } else if (w <= 1024) {
        setVisibleCount(3)
      } else {
        setVisibleCount(4)
      }
      if (viewportRef.current) {
        setContainerWidth(viewportRef.current.clientWidth)
      }
    }

    // Set initial container width from DOM element
    if (viewportRef.current) {
      setContainerWidth(viewportRef.current.clientWidth)
    }

    window.addEventListener('resize', handleResize, { passive: true })

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && viewportRef.current) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width)
        }
      })
      ro.observe(viewportRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      ro?.disconnect()
    }
  }, [])

  // 2. Prefers-reduced-motion listener
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [])

  const gap = visibleCount === 2 ? 10 : visibleCount === 3 ? 14 : 16
  const count = items.length

  // Infinite loop condition: loop if >= 4 items or more items than visible slots.
  // When fewer than 4 items on desktop, render naturally without duplication.
  const shouldLoop = count >= 4 || count > visibleCount
  const canScroll = shouldLoop && count > 1

  const [currentIndex, setCurrentIndex] = useState(() => (shouldLoop ? visibleCount : 0))

  // Adjust state during render if layout mode changes (official React pattern)
  const [prevConfig, setPrevConfig] = useState({ shouldLoop, visibleCount })
  if (prevConfig.shouldLoop !== shouldLoop || prevConfig.visibleCount !== visibleCount) {
    setPrevConfig({ shouldLoop, visibleCount })
    setCurrentIndex(shouldLoop ? visibleCount : 0)
  }

  // Build rendered item array
  const renderedItems: { item: T; index: number }[] = []
  if (count > 0) {
    if (shouldLoop) {
      // Clones before
      for (let i = count - visibleCount; i < count; i++) {
        const idx = ((i % count) + count) % count
        renderedItems.push({ item: items[idx], index: idx })
      }
      // Real items
      for (let i = 0; i < count; i++) {
        renderedItems.push({ item: items[i], index: i })
      }
      // Clones after
      for (let i = 0; i < visibleCount; i++) {
        const idx = i % count
        renderedItems.push({ item: items[idx], index: idx })
      }
    } else {
      // Natural items without duplication
      for (let i = 0; i < count; i++) {
        renderedItems.push({ item: items[i], index: i })
      }
    }
  }

  // Exact pixel sizing
  const cardWidth =
    containerWidth > 0
      ? Math.max(0, (containerWidth - (visibleCount - 1) * gap) / visibleCount)
      : 0
  const step = cardWidth + gap
  const translateX = shouldLoop ? currentIndex * step : 0

  // 1-card advance navigation
  const handleNext = useCallback(() => {
    if (!canScroll) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => prev + 1)
  }, [canScroll])

  const handlePrev = useCallback(() => {
    if (!canScroll) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => prev - 1)
  }, [canScroll])

  // Seamless snap at infinite boundary
  const handleTransitionEnd = useCallback(() => {
    if (!shouldLoop || count === 0) return
    if (currentIndex >= visibleCount + count) {
      setIsTransitioning(false)
      setCurrentIndex((prev) => prev - count)
    } else if (currentIndex < visibleCount) {
      setIsTransitioning(false)
      setCurrentIndex((prev) => prev + count)
    }
  }, [shouldLoop, count, currentIndex, visibleCount])

  // Auto-advance every 5 seconds (paused on hover, focus, reduced motion)
  const isPaused = isHovered || isFocused
  useEffect(() => {
    if (!canScroll || isPaused || prefersReducedMotion) return
    const interval = setInterval(() => {
      handleNext()
    }, 5000)
    return () => clearInterval(interval)
  }, [canScroll, isPaused, prefersReducedMotion, handleNext])

  // Touch and swipe gestures
  const touchStartX = useRef<number | null>(null)
  const touchDeltaX = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchDeltaX.current = 0
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current
    }
  }

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return
    const threshold = 35
    if (touchDeltaX.current < -threshold) {
      handleNext()
    } else if (touchDeltaX.current > threshold) {
      handlePrev()
    }
    touchStartX.current = null
    touchDeltaX.current = 0
  }

  return {
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
    handlers: {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      onFocus: () => setIsFocused(true),
      onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false)
        }
      },
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
