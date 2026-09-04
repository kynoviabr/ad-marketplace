import Link from 'next/link'
import Image from 'next/image'

interface ContentItem {
  id: string
  type: string
  mediaUrl?: string | null
  profileSlug: string
}

export function HomeNewContent({
  content,
  title,
  overline,
}: {
  content: ContentItem[]
  title: string
  overline?: string
}) {
  if (!content || content.length === 0) return null

  return (
    <section className="velvet-home-section velvet-home-section--alt" aria-label={title}>
      <div className="velvet-home-section-header">
        <div>
          <p className="velvet-overline">{overline || 'NOVOS CONTEÚDOS'}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="velvet-home-section-grid">
        {content.map((c) => (
          <Link
            key={c.id}
            href={`/perfil/${c.profileSlug}`}
            className="velvet-new-content-card"
            aria-label={`Mídia do perfil ${c.profileSlug}`}
          >
            {c.mediaUrl ? (
              <Image
                src={c.mediaUrl}
                alt=""
                fill
                sizes="(max-width: 700px) 50vw, (max-width: 1024px) 25vw, 320px"
                className="velvet-new-content-image"
              />
            ) : (
              <div className="velvet-photo-fallback" aria-hidden="true">
                V
              </div>
            )}
            {c.type === 'VIDEO' && (
              <div className="velvet-video-badge" aria-hidden="true">
                <span className="velvet-video-play-icon">▶</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
