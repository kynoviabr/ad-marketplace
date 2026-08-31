import type { Metadata } from 'next'
import { HomeHero, HomeLocations, PublicProfileGrid, HomeTrustSection, HomeAcquisition } from '@/components/public'
import { getMarketplaceName } from '@/lib/brand'
import { HOME_PROFILE_PREVIEW_COUNT } from '@/lib/config'
import { getLocationsByCitySlug } from '@/modules/locations/dal'
import { getHomeDiscoveryProfiles } from '@/modules/search/dal'
import { resolveProfilesWithMedia } from '@/modules/media/delivery'
import { constructRootMetadata } from '@/modules/seo/metadata'
import { getSeoConfig } from '@/modules/seo/config'
import { JsonLd } from '@/components/seo/json-ld'
import { getRequestLocale } from '@/lib/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  return constructRootMetadata(await getRequestLocale())
}

export default async function HomePage() {
  const brandName = getMarketplaceName()
  const locale = await getRequestLocale()

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

  // 2. Fetch canonical profiles (pure organic discovery, no sponsored injection)
  const homeProfiles = await getHomeDiscoveryProfiles('sao-paulo', HOME_PROFILE_PREVIEW_COUNT)

  // 3. Resolve approved primary media for profiles via batch
  const profilesWithMedia = await resolveProfilesWithMedia(homeProfiles)

  return (
    <>
      {/* We use WebSite JSON-LD for the Home page. */}
      <JsonLd 
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: brandName,
          url: locale === 'en' ? `${getSeoConfig().siteUrl}/en` : getSeoConfig().siteUrl,
          inLanguage: locale,
        }}
      />

      <HomeHero profiles={profilesWithMedia.slice(0, 2)} />
      <PublicProfileGrid profiles={profilesWithMedia} />
      <HomeLocations locationsByZone={locationsByZone} profiles={profilesWithMedia.slice(0, 5)} />
      <HomeTrustSection />
      <HomeAcquisition />
    </>
  )
}
