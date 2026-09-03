import Link from 'next/link'
import Image from 'next/image'

export function HomeNewProfessionals({ profiles, title, overline }: { profiles: any[], title: string, overline?: string }) {
  if (!profiles || profiles.length === 0) return null
  return (
    <section className="velvet-home-discovery" style={{ marginTop: '4rem' }}>
      <div>
        <p className="velvet-overline">{overline || 'NOVIDADES'}</p>
        <h2>{title}</h2>
      </div>
      <div className="velvet-profile-grid">
        {profiles.map(p => (
          <Link key={p.id} href={`/perfil/${p.slug}`} className="velvet-card">
            <div className="velvet-image-container" style={{ aspectRatio: '4/5', position: 'relative', overflow: 'hidden', borderRadius: '8px' }}>
              {p.mediaUrl ? (
                <Image src={p.mediaUrl} alt={p.stage_name} fill sizes="300px" style={{ objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: '#eee' }} />
              )}
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              <strong>{p.stage_name}{p.show_age && p.public_age ? `, ${p.public_age}` : ''}</strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
