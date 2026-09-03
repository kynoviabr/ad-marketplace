import Link from 'next/link'
import Image from 'next/image'

export function HomeNewContent({ content, title, overline }: { content: any[], title: string, overline?: string }) {
  if (!content || content.length === 0) return null
  return (
    <section className="velvet-home-discovery" style={{ marginTop: '4rem' }}>
      <div>
        <p className="velvet-overline">{overline || 'NOVOS CONTEÚDOS'}</p>
        <h2>{title}</h2>
      </div>
      <div className="velvet-profile-grid">
        {content.map(c => (
          <Link key={c.id} href={`/perfil/${c.profileSlug}`} className="velvet-card">
            <div className="velvet-image-container" style={{ aspectRatio: '1/1', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
              {c.mediaUrl ? (
                <Image src={c.mediaUrl} alt="" fill sizes="300px" style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: '#eee' }} />
              )}
              {c.type === 'VIDEO' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  <span style={{ fontSize: '2rem' }}>▶</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
