import Image from 'next/image'
import Link from 'next/link'
import type { SearchResultDTO } from '@/modules/search/types'
import { PublicProfileCard } from './public-profile-card'

export interface ProfileWithMedia extends SearchResultDTO {
  mediaUrl: string | null
}

interface PublicProfileGridProps {
  profiles: ProfileWithMedia[]
}

export function PublicProfileGrid({ profiles }: PublicProfileGridProps) {
  if (profiles.length === 0) {
    return null
  }

  return (
    <section className="velvet-home-profiles" aria-labelledby="featured-profiles-title">
      <header className="velvet-home-section-head"><div><p className="velvet-overline">EM DESTAQUE</p><h2 id="featured-profiles-title">Perfis para conhecer</h2></div><Link href="/sao-paulo">Ver todos <span>→</span></Link></header>
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
      {profiles.length > 3 ? <aside className="velvet-home-discovery"><div><p className="velvet-overline">UMA CURADORIA VELVET</p><h2>Descubra algo diferente</h2><Link href="/sao-paulo">Explorar seleção <span>→</span></Link></div><div>{profiles.slice(0, 4).map((profile, index) => <Link href={`/perfil/${profile.slug}`} key={profile.id}>{profile.mediaUrl ? <span className="velvet-home-discovery-image"><Image src={profile.mediaUrl} alt="" fill sizes="180px" /></span> : <span aria-hidden="true">V</span>}<b>0{index + 1}</b><strong>{profile.stageName}</strong><small>{profile.primaryLocation?.name ?? 'São Paulo'}</small></Link>)}</div></aside> : null}
    </section>
  )
}
