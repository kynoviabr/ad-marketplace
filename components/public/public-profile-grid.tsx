import Link from 'next/link'
import type { SearchResultDTO } from '@/modules/search/types'
import { PublicProfileCard } from './public-profile-card'
import { HomeDiscoveryCarousel } from './home-discovery-carousel'
import { getTranslations } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'

export interface ProfileWithMedia extends SearchResultDTO {
  mediaUrl: string | null
}

interface PublicProfileGridProps {
  profiles: ProfileWithMedia[]
}

export async function PublicProfileGrid({ profiles }: PublicProfileGridProps) {
  const { locale, t } = await getTranslations()
  const localized = (path: string) => localizePathname(path, locale)
  if (profiles.length === 0) {
    return null
  }

  return (
    <section className="velvet-home-profiles" aria-labelledby="featured-profiles-title">
      <header className="velvet-home-section-head"><div><p className="velvet-overline">{t('home.featured')}</p><h2 id="featured-profiles-title">{t('home.profilesToMeet')}</h2></div><Link href={localized('/sao-paulo')}>{t('home.viewAll')} <span>→</span></Link></header>
        <div className="velvet-home-profile-grid">
          {profiles.map((profile, index) => (
            <PublicProfileCard
              key={profile.id}
              profile={profile}
              mediaUrl={profile.mediaUrl}
              priority={index < 4}
            />
          ))}
        </div>
      {profiles.length > 0 ? (
        <HomeDiscoveryCarousel
          profiles={profiles}
          overline={t('home.curated')}
          title={t('home.discoverDifferent')}
          exploreText={t('home.exploreSelection')}
          exploreHref={localized('/sao-paulo')}
          locale={locale}
        />
      ) : null}
    </section>
  )
}
