import Image from 'next/image'
import Link from 'next/link'
import type { SearchResultDTO } from '@/modules/search/types'
import { PublicProfileCard } from './public-profile-card'
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
      {profiles.length > 3 ? <aside className="velvet-home-discovery"><div><p className="velvet-overline">{t('home.curated')}</p><h2>{t('home.discoverDifferent')}</h2><Link href={localized('/sao-paulo')}>{t('home.exploreSelection')} <span>→</span></Link></div><div>{profiles.slice(0, 4).map((profile, index) => <Link href={localized(`/perfil/${profile.slug}`)} key={profile.id}>{profile.mediaUrl ? <span className="velvet-home-discovery-image"><Image src={profile.mediaUrl} alt="" fill sizes="180px" /></span> : <span className="velvet-home-discovery-image"><span className="velvet-photo-fallback" aria-hidden="true">V</span></span>}<b>0{index + 1}</b><strong>{profile.stageName}</strong><small>{profile.primaryLocation?.name ?? 'São Paulo'}</small></Link>)}</div></aside> : null}
    </section>
  )
}
