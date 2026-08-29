import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { ProfileWithMedia } from './public-profile-grid'

interface LocationItem {
  id: string
  name: string
  slug: string
}

interface HomeLocationsProps {
  locationsByZone: Record<string, LocationItem[]>
  profiles: ProfileWithMedia[]
}

export function HomeLocations({ locationsByZone, profiles }: HomeLocationsProps) {
  const canonicalZoneOrder = ['Zona Sul', 'Zona Oeste', 'Centro', 'Zona Norte', 'Zona Leste']

  const zones = Object.entries(locationsByZone)
    .filter(([_, locs]) => locs.length > 0)
    .sort(([zoneA], [zoneB]) => {
      const indexA = canonicalZoneOrder.indexOf(zoneA)
      const indexB = canonicalZoneOrder.indexOf(zoneB)
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
    })

  if (zones.length === 0) return null

  // Flatten locations
  const allLocations = zones.flatMap(([_, locs]) => locs)

  return (
    <section className="velvet-home-locations">
      <header className="velvet-home-section-head"><div><p className="velvet-overline">PELA CIDADE</p><h2>Explore São Paulo</h2></div><p>Descubra perfis perto de onde você está.</p></header>
          <div className="velvet-home-location-rail">
            {allLocations.slice(0, 8).map((loc, index) => {
              const portrait = profiles[index % Math.max(profiles.length, 1)]
              return (
              <Link
                key={loc.id}
                href={`/sao-paulo/${loc.slug}`}
                className="velvet-home-location"
              >
                {portrait?.mediaUrl ? <span><Image src={portrait.mediaUrl} alt="" fill sizes="260px" /></span> : <span className="velvet-home-location-placeholder" aria-hidden="true">SP</span>}
                <strong>{loc.name}<i aria-hidden="true">→</i></strong>
              </Link>
            )})}
          </div>
    </section>
  )
}
