import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ProfileReturnLink } from '@/components/public/profile-return-link'
import { ProfileViewTracker } from '@/components/public/profile-view-tracker'
import { WhatsAppCTA } from '@/components/search/whatsapp-cta'
import { getEligiblePublicProfileBySlug } from '@/modules/profiles/public-detail'
import { constructProfileMetadata } from '@/modules/seo/metadata'
import { generateProfileJsonLd } from '@/modules/seo/structured-data'
import { getRequestLocale, getTranslations } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ slug: string }> }

const labelsPtBR = {
  eye: { BLACK: 'Pretos', BROWN: 'Castanhos', GREEN: 'Verdes', BLUE: 'Azuis', HAZEL: 'Mel', OTHER: 'Outros' },
  hair: { BLACK: 'Preto', BRUNETTE: 'Castanho', BLONDE: 'Loiro', REDHEAD: 'Ruivo', OTHER: 'Outro' },
  length: { SHORT: 'Curto', MEDIUM: 'Médio', LONG: 'Longo', VERY_LONG: 'Muito longo', BALD: 'Raspado' },
  body: { SLIM: 'Esbelto', ATHLETIC: 'Atlético', CURVY: 'Curvilíneo', AVERAGE: 'Médio', PLUS_SIZE: 'Plus size', OTHER: 'Outro' },
} as const
const labelsEn = {
  eye: { BLACK: 'Black', BROWN: 'Brown', GREEN: 'Green', BLUE: 'Blue', HAZEL: 'Hazel', OTHER: 'Other' },
  hair: { BLACK: 'Black', BRUNETTE: 'Brown', BLONDE: 'Blonde', REDHEAD: 'Red', OTHER: 'Other' },
  length: { SHORT: 'Short', MEDIUM: 'Medium', LONG: 'Long', VERY_LONG: 'Very long', BALD: 'Shaved' },
  body: { SLIM: 'Slim', ATHLETIC: 'Athletic', CURVY: 'Curvy', AVERAGE: 'Average', PLUS_SIZE: 'Plus size', OTHER: 'Other' },
} as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, t } = await getTranslations()
  const { slug } = await params
  const detail = await getEligiblePublicProfileBySlug(slug)
  if (!detail) return { title: t('profile.unavailable'), robots: { index: false, follow: false } }
  const metadata = constructProfileMetadata({ stageName: detail.profile.stageName, headline: detail.profile.headline, cityName: detail.city.name, citySlug: detail.city.slug, slug: detail.profile.slug, primaryMediaUrl: null, locale })
  return { ...metadata, title: { absolute: String(metadata.title) } }
}

export default async function PublicProfilePage({ params }: Props) {
  const { locale, t } = await getTranslations()
  const labels = locale === 'en' ? labelsEn : labelsPtBR
  const { slug } = await params
  const detail = await getEligiblePublicProfileBySlug(slug)
  if (!detail) notFound()
  const { profile, city, locations, media } = detail
  const primary = media.find((item) => item.isPrimary) ?? media[0]
  const primaryLocation = locations.find((item) => item.isPrimary) ?? locations[0]
  const whatsappDigits = profile.whatsappPhone?.replace(/\D/g, '') ?? ''
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null
  const information = [
    profile.publicAge ? [t('profile.age'), t('common.ageYears', { age: profile.publicAge })] : null,
    profile.heightCm ? [t('profile.height'), `${profile.heightCm} cm`] : null,
    profile.weightKg ? [t('profile.weight'), `${profile.weightKg} kg`] : null,
    profile.hairColor ? [t('profile.hair'), labels.hair[profile.hairColor]] : null,
    profile.hairLength ? [t('profile.hairLength'), labels.length[profile.hairLength]] : null,
    profile.eyeColor ? [t('profile.eyes'), labels.eye[profile.eyeColor]] : null,
    profile.bodyType ? [t('profile.bodyType'), labels.body[profile.bodyType]] : null,
  ].filter((item): item is string[] => Boolean(item))
  const seoContract = { stageName: profile.stageName, headline: profile.headline, cityName: city.name, citySlug: city.slug, slug: profile.slug, primaryMediaUrl: null, locale }

  return <div className="profile-detail-page">
    <ProfileViewTracker profileSlug={profile.slug} citySlug={city.slug} locationSlug={primaryLocation.slug} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProfileJsonLd(seoContract)).replace(/</g, '\\u003c') }} />
    <div className="profile-detail-wrap"><ProfileReturnLink fallbackHref={`/${city.slug}`} /></div>
    <section className="profile-hero profile-detail-wrap">
      <div className="profile-hero-photo"><Image src={primary.url} alt={t('profile.portrait', { name: profile.stageName })} fill priority sizes="(max-width: 768px) 100vw, 58vw" /></div>
      <div className="profile-hero-identity">
        <p className="profile-kicker">{t('profile.kicker')}</p>
        <h1>{profile.stageName}{profile.publicAge ? <>, <span>{profile.publicAge}</span></> : null}</h1>
        <p className="profile-location">{primaryLocation.name} · {city.name}</p>
        <div className="profile-verification"><i>V</i><p><b>{t('profile.verifiedIdentity')}</b><span>{t('profile.adulthoodConfirmed')}</span></p></div>
        {profile.headline ? <p className="profile-headline">{profile.headline}</p> : null}
        {profile.bio ? <p className="profile-hero-bio">{profile.bio}</p> : null}
        {whatsappUrl ? <><WhatsAppCTA whatsappUrl={whatsappUrl} analyticsPayload={{ profileSlug: profile.slug, citySlug: city.slug, locationSlug: primaryLocation.slug, placementType: 'ORGANIC' }} className="profile-whatsapp">{t('profile.whatsapp')} <span aria-hidden="true">↗</span></WhatsAppCTA><small>{t('profile.contactDisclaimer')}</small></> : null}
      </div>
    </section>

    {profile.bio ? <section className="profile-section profile-about"><div className="profile-detail-wrap"><p className="profile-kicker">{t('profile.aboutPerson', { name: profile.stageName.toUpperCase() })}</p><h2>{t('profile.inTheirWords').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2><p>{profile.bio}</p></div></section> : null}
    {information.length ? <section className="profile-section profile-detail-wrap"><p className="profile-kicker">{t('profile.information').toUpperCase()}</p><h2>{t('profile.publicDetails')}</h2><dl className="profile-information">{information.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl></section> : null}
    <section className="profile-section profile-locations"><div className="profile-detail-wrap"><p className="profile-kicker">{t('profile.where')}</p><h2>{t('profile.cityByChoice', { city: city.name }).split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2><ul>{locations.map((location) => <li key={location.slug}><span>{location.name}</span>{location.isPrimary ? <b>{t('profile.primaryLocation')}</b> : null}</li>)}</ul></div></section>
    <section className="profile-section profile-gallery profile-detail-wrap"><p className="profile-kicker">{t('profile.photos')}</p><h2>{t('profile.gallery')}.</h2><div className={`profile-gallery-grid count-${Math.min(media.length, 4)}`}>{media.map((item, index) => <figure key={item.url}><Image src={item.url} alt={t('profile.photo', { name: profile.stageName, number: index + 1 })} fill sizes="(max-width: 768px) 100vw, 55vw" /></figure>)}</div></section>
    <section className="profile-trust"><div className="profile-detail-wrap"><i>V</i><div><p className="profile-kicker">{t('profile.verifiedProfile')}</p><h2>{t('profile.identityConfirmed').split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2><p>{t('profile.verificationDisclaimer')}</p></div></div></section>
    {whatsappUrl ? <section className="profile-final-contact"><div className="profile-detail-wrap"><p className="profile-kicker">{t('profile.readyToTalk')}</p><h2>{t('profile.talkDirectly', { name: profile.stageName }).split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</h2><WhatsAppCTA whatsappUrl={whatsappUrl} analyticsPayload={{ profileSlug: profile.slug, citySlug: city.slug, locationSlug: primaryLocation.slug, placementType: 'ORGANIC' }} className="profile-whatsapp profile-whatsapp--light">{t('profile.whatsapp')} <span aria-hidden="true">↗</span></WhatsAppCTA><small>{t('profile.contactDisclaimer')}</small></div></section> : null}
  </div>
}
