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
import { getRequestLocale, getTranslations } from '@/lib/i18n/server'
import { HomeNewProfessionals } from '@/components/public/home-new-professionals'
import { HomeNewContent } from '@/components/public/home-new-content'
import { getNewProfessionals, getNewContent } from '@/modules/search/home-sections'
import { getAccount } from '@/modules/auth/dal'

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

  // 4. Fetch R10 new bounded sections
  const account = await getAccount()
  const { t } = await getTranslations()
  const [newProfessionals, newContent] = await Promise.all([
    getNewProfessionals(account?.id ?? null, 4),
    getNewContent(account?.id ?? null, 4)
  ])

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
      <HomeNewProfessionals profiles={newProfessionals} title={locale === 'en' ? 'New Professionals' : 'Novas Modelos'} overline={locale === 'en' ? 'UPDATES' : 'NOVIDADES'} />
      <HomeNewContent content={newContent} title={locale === 'en' ? 'New Content' : 'Novos Conteúdos'} overline={locale === 'en' ? 'NEW CONTENT' : 'NOVOS CONTEÚDOS'} />
      <HomeLocations locationsByZone={locationsByZone} profiles={profilesWithMedia.slice(0, 5)} />
      <HomeTrustSection />
      <HomeAcquisition />
    </>
  )
}
