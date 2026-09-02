import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProfileReturnLink } from '@/components/public/profile-return-link'
import { ProfileGallery } from '@/components/public/profile-gallery'
import { ProfileInformation } from '@/components/public/profile-information'
import { ProfileReviewsPreview } from '@/components/public/profile-reviews-preview'
import { ProfileViewTracker } from '@/components/public/profile-view-tracker'
import { WhatsAppCTA } from '@/components/search/whatsapp-cta'
import { VelvetBadge } from '@/components/ui/velvet-badge'
import { localizePathname } from '@/lib/i18n/routing'
import { OFFERING_GROUPS } from '@/modules/offerings/types'
import { getTranslations } from '@/lib/i18n/server'
import { getEligiblePublicProfileBySlug } from '@/modules/profiles/public-detail'
import { constructProfileMetadata } from '@/modules/seo/metadata'
import { generateProfileJsonLd } from '@/modules/seo/structured-data'

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

const HERO_BIO_LIMIT = 300

function createBioPresentation(bio: string | null) {
  const normalized = bio?.trim() ?? ''
  if (!normalized) return { excerpt: null, full: null }
  if (normalized.length <= HERO_BIO_LIMIT) return { excerpt: normalized, full: null }

  const candidate = normalized.slice(0, HERO_BIO_LIMIT)
  const wordBoundary = candidate.lastIndexOf(' ')
  const excerpt = `${candidate.slice(0, wordBoundary > 220 ? wordBoundary : HERO_BIO_LIMIT).trim()}…`
  return { excerpt, full: normalized }
}

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
  const offeringText = (key: string) => t(key as Parameters<typeof t>[0])
  const labels = locale === 'en' ? labelsEn : labelsPtBR
  const { slug } = await params
  const detail = await getEligiblePublicProfileBySlug(slug)
  if (!detail) notFound()

  const { profile, city, locations, media } = detail
  const primary = media.find((item) => item.isPrimary) ?? media[0]
  const supportingMedia = media.filter((item) => item.url !== primary.url)
  const primaryLocation = locations.find((item) => item.isPrimary) ?? locations[0]
  const whatsappDigits = profile.whatsappPhone?.replace(/\D/g, '') ?? ''
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits}` : null
  const bio = createBioPresentation(profile.bio)
  const offeringInformation = OFFERING_GROUPS.flatMap((group) => {
    const codes = profile.offerings[group] ?? []
    return codes.length ? [{
      label: offeringText(`offering.group.${group.toLowerCase()}`),
      value: codes.map((code) => offeringText(`offering.option.${code}`)).join(' · '),
    }] : []
  })
  const information = [
    profile.publicAge ? { label: t('profile.age'), value: t('common.ageYears', { age: profile.publicAge }) } : null,
    profile.heightCm ? { label: t('profile.height'), value: `${profile.heightCm} cm` } : null,
    profile.weightKg ? { label: t('profile.weight'), value: `${profile.weightKg} kg` } : null,
    profile.hairColor ? { label: t('profile.hair'), value: labels.hair[profile.hairColor] } : null,
    profile.hairLength ? { label: t('profile.hairLength'), value: labels.length[profile.hairLength] } : null,
    profile.eyeColor ? { label: t('profile.eyes'), value: labels.eye[profile.eyeColor] } : null,
    profile.bodyType ? { label: t('profile.bodyType'), value: labels.body[profile.bodyType] } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item)).concat(offeringInformation)
  const serviceAreas = locations.map((location) => ({
    id: location.slug,
    label: location.name,
    annotation: location.isPrimary ? t('profile.primaryLocation') : undefined,
  }))
  const analyticsPayload = { profileSlug: profile.slug, citySlug: city.slug, locationSlug: primaryLocation.slug, placementType: 'ORGANIC' as const }
  const seoContract = { stageName: profile.stageName, headline: profile.headline, cityName: city.name, citySlug: city.slug, slug: profile.slug, primaryMediaUrl: null, locale }
  const galleryCount = supportingMedia.length === 1
    ? t('profile.mediaCountOne')
    : t('profile.mediaCountMany', { count: supportingMedia.length })

  return (
    <div className="profile-detail-page profile-detail-page--r4">
      <ProfileViewTracker profileSlug={profile.slug} citySlug={city.slug} locationSlug={primaryLocation.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProfileJsonLd(seoContract)).replace(/</g, '\\u003c') }} />

      <div className="profile-detail-wrap profile-return-row">
        <ProfileReturnLink fallbackHref={`/${city.slug}`} />
      </div>

      <section className="profile-hero profile-detail-wrap" aria-labelledby="profile-title">
        <div className="profile-hero-photo">
          <Image
            src={primary.url}
            alt={t('profile.portrait', { name: profile.stageName })}
            fill
            priority
            sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) 54vw, 58vw"
          />
        </div>

        <div className="profile-hero-identity">
          <VelvetBadge variant="verified" className="profile-verification-badge" icon="✓">
            {t('profile.verificationBadge')}
          </VelvetBadge>
          <h1 id="profile-title">
            {profile.stageName}{profile.publicAge ? <>, <span>{profile.publicAge}</span></> : null}
          </h1>
          <p className="profile-location">{primaryLocation.name} · {city.name}</p>
          {profile.headline ? <p className="profile-headline">{profile.headline}</p> : null}
          {bio.excerpt ? <p className="profile-hero-bio">{bio.excerpt}</p> : null}

          {whatsappUrl ? (
            <div className="profile-contact-block">
              <WhatsAppCTA
                whatsappUrl={whatsappUrl}
                analyticsPayload={analyticsPayload}
                className="velvet-button velvet-button--primary profile-whatsapp"
              >
                {t('profile.whatsapp')} <span aria-hidden="true">↗</span>
              </WhatsAppCTA>
              <small>{t('profile.contactDisclaimer')}</small>
            </div>
          ) : null}

          <ProfileInformation
            title={t('profile.information')}
            facts={information}
            serviceAreas={serviceAreas}
            serviceAreasLabel={t('profile.where')}
          />
        </div>
      </section>

      {bio.full ? (
        <section className="profile-overview">
          <div className="profile-detail-wrap profile-overview-grid">
            <article className="profile-about" aria-labelledby="profile-about-title">
              <p className="profile-kicker">{t('profile.about')}</p>
              <h2 id="profile-about-title">{t('profile.aboutPersonTitle', { name: profile.stageName })}</h2>
              <p>{bio.full}</p>
            </article>
          </div>
        </section>
      ) : null}

      {supportingMedia.length ? (
        <section className="profile-section profile-gallery profile-detail-wrap" aria-labelledby="profile-gallery-title">
          <header className="profile-gallery-heading">
            <div>
              <p className="profile-kicker">{t('profile.photos')}</p>
              <h2 id="profile-gallery-title">{t('profile.gallery')}</h2>
            </div>
            <p>{galleryCount}</p>
          </header>
          <ProfileGallery
            images={supportingMedia.map((item, index) => ({
              url: item.url,
              alt: t('profile.photo', { name: profile.stageName, number: index + 2 }),
            }))}
            labels={{
              close: t('common.close'),
              previous: t('common.previous'),
              next: t('common.next'),
              open: t('profile.openPhoto'),
              dialog: t('profile.galleryDialog'),
              viewAll: t('profile.viewAllPhotos', { count: supportingMedia.length }),
            }}
          />
        </section>
      ) : null}

      <ProfileReviewsPreview
        labels={{
          eyebrow: t('profile.reviewsEyebrow'),
          title: t('profile.reviews'),
          noReviews: t('profile.noReviews'),
          noReviewsDescription: t('profile.noReviewsDescription'),
          ratingSummary: '',
          viewAll: '',
        }}
      />

      <aside className="profile-trust" aria-label={t('profile.verifiedProfile')}>
        <div className="profile-detail-wrap">
          <VelvetBadge variant="verified" icon="✓">{t('profile.verificationBadge')}</VelvetBadge>
          <p>{t('profile.verificationDisclaimer')}</p>
          <Link href={localizePathname('/seguranca', locale)} className="velvet-link">
            {t('profile.learnSafety')}
          </Link>
        </div>
      </aside>

      {whatsappUrl ? (
        <section className="profile-final-contact" aria-labelledby="profile-contact-title">
          <div className="profile-detail-wrap">
            <div>
              <p className="profile-kicker">{t('profile.readyToTalk')}</p>
              <h2 id="profile-contact-title">{t('profile.talkDirectly', { name: profile.stageName }).replace('\n', ' ')}</h2>
            </div>
            <div>
              <WhatsAppCTA
                whatsappUrl={whatsappUrl}
                analyticsPayload={analyticsPayload}
                className="velvet-button velvet-button--secondary profile-whatsapp profile-whatsapp--light"
              >
                {t('profile.whatsapp')} <span aria-hidden="true">↗</span>
              </WhatsAppCTA>
              <small>{t('profile.contactDisclaimer')}</small>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
