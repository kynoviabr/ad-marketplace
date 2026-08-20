'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { PublicContainer } from './public-container'

interface LocationItem {
  id: string
  name: string
  slug: string
}

interface HomeLocationsProps {
  locationsByZone: Record<string, LocationItem[]>
}

export function HomeLocations({ locationsByZone }: HomeLocationsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const zones = Object.entries(locationsByZone).filter(([_, locs]) => locs.length > 0)

  if (zones.length === 0) return null

  return (
    <section className="py-12 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
      <PublicContainer>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--font-display)' }}>
            Explore por região
          </h2>
        </div>

        {/* Desktop: Grid layout. Mobile: Hidden if not expanded (beyond first 2 zones) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {zones.map(([zoneName, locations], index) => {
            const isVisibleOnMobile = isExpanded || index < 2
            return (
              <div
                key={zoneName}
                className={`flex flex-col space-y-3 ${isVisibleOnMobile ? 'block' : 'hidden md:flex'}`}
              >
                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--color-foreground-2)]">
                  {zoneName}
                </h3>
                <ul className="space-y-2">
                  {locations.map((loc) => (
                    <li key={loc.id}>
                      <Link
                        href={`/sao-paulo/${loc.slug}`}
                        className="text-[var(--color-foreground)] hover:text-[var(--color-accent)] hover:underline underline-offset-2 transition-colors min-h-[44px] inline-flex items-center"
                      >
                        {loc.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Mobile Expansion Toggle */}
        {zones.length > 2 && (
          <div className="mt-6 md:hidden">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full min-h-[44px] flex items-center justify-center rounded-lg border border-[var(--color-border-strong)] bg-white text-[var(--color-foreground)] font-medium hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? 'Ver menos regiões' : 'Ver todas as regiões'}
            </button>
          </div>
        )}
      </PublicContainer>
    </section>
  )
}
