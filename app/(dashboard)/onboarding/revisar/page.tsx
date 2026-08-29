import Image from 'next/image'
import Link from 'next/link'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { PublicationAction } from '@/components/onboarding/publication-action'
import { requireAccount } from '@/modules/auth/dal'
import { getPublicationReviewState } from '@/modules/publication/dal'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revisar e publicar — Onboarding Velvet', robots: 'noindex, nofollow' }

const eyeLabels: Record<string, string> = { BLACK: 'Pretos', BROWN: 'Castanhos', GREEN: 'Verdes', BLUE: 'Azuis', HAZEL: 'Mel', OTHER: 'Outros' }
const hairLabels: Record<string, string> = { BLACK: 'Preto', BRUNETTE: 'Castanho', BLONDE: 'Loiro', REDHEAD: 'Ruivo', OTHER: 'Outro' }
const bodyLabels: Record<string, string> = { SLIM: 'Esbelto', ATHLETIC: 'Atlético', CURVY: 'Curvilíneo', AVERAGE: 'Médio', PLUS_SIZE: 'Plus size', OTHER: 'Outro' }

export default async function ReviewAndPublishPage({ searchParams }: { searchParams: Promise<{ published?: string }> }) {
  const account = await requireAccount()
  const [review, params] = await Promise.all([getPublicationReviewState(account), searchParams])
  const justPublished = params.published === '1' && review.isPublic
  const preview = review.preview
  const attributes = preview ? [
    preview.publicAge ? `${preview.publicAge} anos` : null,
    preview.heightCm ? `${preview.heightCm} cm` : null,
    preview.hairColor ? `Cabelo ${hairLabels[preview.hairColor].toLowerCase()}` : null,
    preview.eyeColor ? `Olhos ${eyeLabels[preview.eyeColor].toLowerCase()}` : null,
    preview.bodyType ? bodyLabels[preview.bodyType] : null,
  ].filter(Boolean) : []

  return <OnboardingShell currentStep={6}>
    <main className="review-main">
      <header className="review-heading">
        <p className="onboarding-eyebrow">06 — REVISAR &amp; PUBLICAR</p>
        <h1>{review.isPublic ? 'Seu perfil está no ar.' : 'Uma última revisão.'}</h1>
        <p>{review.isPublic ? 'Seu perfil passou pelos critérios atuais de publicação da Velvet.' : 'Confira sua apresentação pública e veja o que ainda precisa de atenção.'}</p>
        {justPublished ? <p className="review-success" role="status">Perfil publicado com sucesso.</p> : null}
      </header>
      <section className="review-layout" aria-label="Revisão do perfil">
        <article className="review-preview" aria-labelledby="preview-title">
          <div className="review-preview-label"><span>PRÉVIA PÚBLICA</span><em>{review.previewPhotoUrl ? 'Somente foto aprovada' : 'Nenhuma foto aprovada'}</em></div>
          <div className="review-portrait">
            {review.previewPhotoUrl && preview ? <Image src={review.previewPhotoUrl} alt={`Foto de ${preview.stageName}`} fill sizes="(max-width: 768px) 100vw, 42vw" /> : <span aria-hidden="true">V</span>}
          </div>
          {preview ? <div className="review-identity">
            <p>{review.primaryLocation ?? review.serviceAreas[0] ?? 'Velvet São Paulo'}</p>
            <h2 id="preview-title">{preview.stageName}</h2>
            {preview.headline ? <blockquote>{preview.headline}</blockquote> : null}
            {attributes.length ? <p className="review-attributes">{attributes.join(' · ')}</p> : null}
            {preview.bio ? <p className="review-bio">{preview.bio}</p> : null}
            {review.serviceAreas.length ? <p className="review-regions"><span>ATENDE EM</span>{review.serviceAreas.join(' · ')}</p> : null}
          </div> : <p className="review-empty">Complete a primeira etapa para gerar sua prévia.</p>}
        </article>
        <section className="review-readiness" aria-labelledby="readiness-title">
          <div className="review-readiness-head"><p>PRONTIDÃO</p><h2 id="readiness-title">Antes de publicar</h2></div>
          <ol>{review.readiness.map((item, index) => <li key={item.key} className={item.ready ? 'is-ready' : 'is-pending'}>
            <span className="review-index">{String(index + 1).padStart(2, '0')}</span>
            <div><h3>{item.label}</h3><p>{item.detail}</p></div><b>{item.ready ? 'Pronto' : 'Pendente'}</b>
            {item.editHref ? <Link href={item.editHref}>{item.editLabel}</Link> : null}
          </li>)}</ol>
          {review.photos.pending > 0 ? <p className="review-owner-note">Visível somente para você: {review.photos.pending} foto(s) aguardando processamento ou moderação. Elas não aparecem na prévia pública.</p> : null}
          {review.photos.rejected + review.photos.blocked > 0 ? <p className="review-owner-note review-owner-note--alert">Fotos rejeitadas ou bloqueadas não podem ser publicadas. <Link href="/onboarding/fotos">Gerenciar fotos</Link></p> : null}
          {review.isPublic && review.slug ? <div className="review-live-actions">
            <Link className="onboarding-primary" href={`/perfil/${review.slug}`}><span>Ver meu perfil</span><span aria-hidden="true">→</span></Link>
            <Link className="onboarding-secondary" href="/dashboard">Ir para o painel</Link>
          </div> : <><PublicationAction enabled={review.isCanonicallyEligible && !review.hasDataError} />{!review.isCanonicallyEligible ? <p className="review-blocked-summary" role="status">A publicação será liberada quando todos os itens estiverem prontos.</p> : null}</>}
        </section>
      </section>
    </main>
    <aside className="onboarding-privacy"><span>PUBLICAÇÃO SEGURA E REVERSÍVEL</span><p>Somente dados escolhidos como públicos e fotos aprovadas aparecem para visitantes.</p></aside>
  </OnboardingShell>
}
