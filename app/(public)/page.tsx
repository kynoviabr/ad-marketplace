import type { Metadata } from 'next'
import { HomeHero, HomeLocations, HomeProfileGrid, HomeTrustSection, HomeAcquisition } from '@/components/public'
import { getMarketplaceName } from '@/lib/brand'
import { HOME_PROFILE_PREVIEW_COUNT } from '@/lib/config'
import { getLocationsByCitySlug } from '@/modules/locations/dal'
import { executeSearch } from '@/modules/search/dal'
import { getPrimaryMedia } from '@/modules/media/dal'
import { getApprovedMediaDeliveryUrl } from '@/modules/media/delivery'
import { constructRootMetadata } from '@/modules/seo/metadata'
import { getSeoConfig } from '@/modules/seo/config'
import { JsonLd } from '@/components/seo/json-ld'

export function generateMetadata(): Metadata {
  return constructRootMetadata()
}

export default async function HomePage() {
  const brandName = getMarketplaceName()

  // 1. Fetch locations
  const locations = await getLocationsByCitySlug('sao-paulo')
  
  const locationsByZone: Record<string, typeof locations> = {
    'Centro': [],
    'Zona Sul': [],
    'Zona Oeste': [],
    'Zona Norte': [],
    'Zona Leste': [],
  }
  
  for (const loc of locations) {
    if (locationsByZone[loc.zone] !== undefined) {
      locationsByZone[loc.zone].push(loc)
    } else {
      locationsByZone[loc.zone] = [loc]
    }
  }

  // 2. Fetch canonical profiles (organic + sponsored logic from FASE 08 handled by dal)
  const searchResponse = await executeSearch({
    citySlug: 'sao-paulo',
    limit: HOME_PROFILE_PREVIEW_COUNT,
    sort: 'recommended',
  })

  // 3. Resolve approved primary media for profiles
  const profilesWithMedia = await Promise.all(
    searchResponse.results.map(async (profile) => {
      // profile.id is now the real UUID thanks to our mapping fix
      const media = await getPrimaryMedia(profile.id)
      const mediaUrl = await getApprovedMediaDeliveryUrl(media)
      return {
        ...profile,
        mediaUrl,
      }
    })
  )

  const city = await getCityBySlug('sao-paulo')

  return (
    <>
      {/* We use WebSite JSON-LD for the Home page. */}
      <JsonLd 
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: brandName,
          url: getSeoConfig().siteUrl,
        }}
      />

      <HomeHero />
      <HomeLocations locationsByZone={locationsByZone} />
      <HomeProfileGrid profiles={profilesWithMedia} />
      <HomeTrustSection />
      <HomeAcquisition />
    </>
  )
}
