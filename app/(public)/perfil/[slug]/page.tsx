import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ProfileReturnLink } from '@/components/public/profile-return-link'
import { ProfileViewTracker } from '@/components/public/profile-view-tracker'
import { WhatsAppCTA } from '@/components/search/whatsapp-cta'
import { getEligiblePublicProfileBySlug } from '@/modules/profiles/public-detail'
import { constructProfileMetadata } from '@/modules/seo/metadata'
import { generateProfileJsonLd } from '@/modules/seo/structured-data'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }

const labels = {
  eye: { BLACK: 'Pretos', BROWN: 'Castanhos', GREEN: 'Verdes', BLUE: 'Azuis', HAZEL: 'Mel', OTHER: 'Outros' },
  hair: { BLACK: 'Preto', BRUNETTE: 'Castanho', BLONDE: 'Loiro', REDHEAD: 'Ruivo', OTHER: 'Outro' },
  length: { SHORT: 'Curto', MEDIUM: 'Médio', LONG: 'Longo', VERY_LONG: 'Muito longo', BALD: 'Raspado' },
  body: { SLIM: 'Esbelto', ATHLETIC: 'Atlético', CURVY: 'Curvilíneo', AVERAGE: 'Médio', PLUS_SIZE: 'Plus size', OTHER: 'Outro' },
} as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const detail = await getEligiblePublicProfileBySlug(slug)
  if (!detail) return { title: 'Perfil indisponível', robots: { index: false, follow: false } }
  const metadata = constructProfileMetadata({ stageName: detail.profile.stageName, headline: detail.profile.headline, cityName: detail.city.name, citySlug: detail.city.slug, slug: detail.profile.slug, primaryMediaUrl: null })
  return { ...metadata, title: { absolute: String(metadata.title) } }
}

export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params
  const detail = await getEligiblePublicProfileBySlug(slug)
  if (!detail) notFound()
  const { profile, city, locations, media } = detail
  const primary = media.find((item) => item.isPrimary) ?? media[0]
  const primaryLocation = locations.find((item) => item.isPrimary) ?? locations[0]
  const whatsappDigits = profile.whatsappPhone?.replace(/\D/g, '') ?? ''
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null
  const information = [
    profile.publicAge ? ['Idade', `${profile.publicAge} anos`] : null,
    profile.heightCm ? ['Altura', `${profile.heightCm} cm`] : null,
    profile.weightKg ? ['Peso', `${profile.weightKg} kg`] : null,
    profile.hairColor ? ['Cabelo', labels.hair[profile.hairColor]] : null,
    profile.hairLength ? ['Comprimento', labels.length[profile.hairLength]] : null,
    profile.eyeColor ? ['Olhos', labels.eye[profile.eyeColor]] : null,
    profile.bodyType ? ['Tipo físico', labels.body[profile.bodyType]] : null,
  ].filter((item): item is string[] => Boolean(item))
  const seoContract = { stageName: profile.stageName, headline: profile.headline, cityName: city.name, citySlug: city.slug, slug: profile.slug, primaryMediaUrl: null }

  return <div className="profile-detail-page">
    <ProfileViewTracker profileSlug={profile.slug} citySlug={city.slug} locationSlug={primaryLocation.slug} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProfileJsonLd(seoContract)).replace(/</g, '\\u003c') }} />
    <div className="profile-detail-wrap"><ProfileReturnLink fallbackHref={`/${city.slug}`} /></div>
    <section className="profile-hero profile-detail-wrap">
      <div className="profile-hero-photo"><Image src={primary.url} alt={`Retrato de ${profile.stageName}`} fill priority sizes="(max-width: 768px) 100vw, 58vw" /></div>
      <div className="profile-hero-identity">
        <p className="profile-kicker">PERFIL VELVET</p>
        <h1>{profile.stageName}{profile.publicAge ? <>, <span>{profile.publicAge}</span></> : null}</h1>
        <p className="profile-location">{primaryLocation.name} · {city.name}</p>
        <div className="profile-verification"><i>V</i><p><b>Identidade verificada</b><span>Maioridade confirmada</span></p></div>
        {profile.headline ? <p className="profile-headline">{profile.headline}</p> : null}
        {profile.bio ? <p className="profile-hero-bio">{profile.bio}</p> : null}
        {whatsappUrl ? <><WhatsAppCTA whatsappUrl={whatsappUrl} analyticsPayload={{ profileSlug: profile.slug, citySlug: city.slug, locationSlug: primaryLocation.slug, placementType: 'ORGANIC' }} className="profile-whatsapp">Conversar no WhatsApp <span aria-hidden="true">↗</span></WhatsAppCTA><small>Velvet não participa da conversa ou da contratação.</small></> : null}
      </div>
    </section>

    {profile.bio ? <section className="profile-section profile-about"><div className="profile-detail-wrap"><p className="profile-kicker">SOBRE {profile.stageName.toUpperCase()}</p><h2>Presença,<br />em suas palavras.</h2><p>{profile.bio}</p></div></section> : null}
    {information.length ? <section className="profile-section profile-detail-wrap"><p className="profile-kicker">INFORMAÇÕES</p><h2>Detalhes públicos.</h2><dl className="profile-information">{information.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></section> : null}
    <section className="profile-section profile-locations"><div className="profile-detail-wrap"><p className="profile-kicker">ONDE ATENDE</p><h2>{city.name},<br />por escolha.</h2><ul>{locations.map((location) => <li key={location.slug}><span>{location.name}</span>{location.isPrimary ? <b>Local principal</b> : null}</li>)}</ul></div></section>
    <section className="profile-section profile-gallery profile-detail-wrap"><p className="profile-kicker">FOTOS</p><h2>Galeria.</h2><div className={`profile-gallery-grid count-${Math.min(media.length, 4)}`}>{media.map((item, index) => <figure key={item.url}><Image src={item.url} alt={`${profile.stageName}, foto ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 55vw" /></figure>)}</div></section>
    <section className="profile-trust"><div className="profile-detail-wrap"><i>V</i><div><p className="profile-kicker">PERFIL VERIFICADO</p><h2>Identidade confirmada.<br />Maioridade confirmada.</h2><p>A verificação da Velvet confirma identidade e maioridade. Ela não representa garantia sobre serviços ou encontros.</p></div></div></section>
    {whatsappUrl ? <section className="profile-final-contact"><div className="profile-detail-wrap"><p className="profile-kicker">PRONTO PARA CONVERSAR?</p><h2>Fale diretamente<br />com {profile.stageName}.</h2><WhatsAppCTA whatsappUrl={whatsappUrl} analyticsPayload={{ profileSlug: profile.slug, citySlug: city.slug, locationSlug: primaryLocation.slug, placementType: 'ORGANIC' }} className="profile-whatsapp profile-whatsapp--light">Conversar no WhatsApp <span aria-hidden="true">↗</span></WhatsAppCTA><small>Velvet não participa da conversa ou da contratação.</small></div></section> : null}
  </div>
}
