import Link from 'next/link'
import Image from 'next/image'

interface ProfileItem {
  id: string
  slug: string
  stage_name: string
  headline?: string | null
  public_age?: number | null
  show_age?: boolean | null
  mediaUrl?: string | null
  mediaWidth?: number | null
  mediaHeight?: number | null
  primaryLocation?: { name: string } | null
}

export function HomeNewProfessionals({
  profiles,
  title,
  overline,
}: {
  profiles: ProfileItem[]
  title: string
  overline?: string
}) {
  if (!profiles || profiles.length === 0) return null

  return (
    <section className="velvet-home-section" aria-label={title}>
      <div className="velvet-home-section-header">
        <div>
          <p className="velvet-overline">{overline || 'NOVIDADES'}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="velvet-home-section-grid">
        {profiles.map((p) => (
          <Link key={p.id} href={`/perfil/${p.slug}`} className="velvet-new-prof-card">
            <div className="velvet-new-prof-photo">
              {p.mediaUrl ? (
                <Image
                  src={p.mediaUrl}
                  alt={p.stage_name}
                  fill
                  sizes="(max-width: 700px) 50vw, (max-width: 1024px) 25vw, 320px"
                  className="velvet-new-prof-image"
                />
              ) : (
                <div className="velvet-photo-fallback" aria-hidden="true">
                  V
                </div>
              )}
            </div>
            <div className="velvet-new-prof-meta">
              <h3>
                {p.stage_name}
                {p.show_age && p.public_age ? `, ${p.public_age}` : ''}
              </h3>
              <p>{p.primaryLocation?.name || 'São Paulo'}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
