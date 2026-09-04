import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ProfessionalDashboardHeader } from '@/components/dashboard/professional-dashboard-header'
import { requireAccount } from '@/modules/auth/dal'
import { getProfessionalDashboardOverview } from '@/modules/dashboard/dal'
import { getRequestLocale } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Seu estúdio | velvet.', robots: 'noindex, nofollow' }

export default async function DashboardPage() {
  const account = await requireAccount()
  if (account.role === 'CLIENT') redirect('/cliente')
  if (account.onboarding_status !== 'COMPLETED') redirect('/onboarding')
  const locale = await getRequestLocale()
  const isPt = locale === 'pt-BR'
  const { review, status, billing, metrics } = await getProfessionalDashboardOverview(account)
  const profile = review.preview
  const name = profile?.stageName ?? 'profissional'
  const actionHref = review.isPublic && review.slug ? `/perfil/${review.slug}` : '/onboarding/revisar'
  const actionLabel = review.isPublic ? 'Ver meu perfil' : 'Revisar publicação'

  return <div className="velvet-dashboard">
    <ProfessionalDashboardHeader activeHref="/dashboard" />
    <main>
      <section className="velvet-dashboard-intro"><p className="dashboard-eyebrow">SEU ESTÚDIO</p><h1>Olá, {name}.</h1><p>Acompanhe sua presença na velvet. e cuide do que está público.</p></section>
      <section className={`dashboard-status dashboard-status--${status.tone}`} aria-labelledby="profile-status-title">
        <div><p className="dashboard-eyebrow">STATUS DO PERFIL</p><h2 id="profile-status-title">{status.label}</h2></div>
        <div>
          <p>{status.summary}</p>
          <p className="dashboard-help-wrapper">
            <Link
              href={isPt ? '/ajuda/como-publicar-meu-perfil' : '/en/ajuda/como-publicar-meu-perfil'}
              className="dashboard-inline-help-link"
            >
              {isPt ? 'Precisa de ajuda? Saiba mais sobre publicação →' : 'Need help? Learn more about publishing →'}
            </Link>
          </p>
        </div>
        <Link href={actionHref}>{actionLabel}<span aria-hidden="true">↗</span></Link>
      </section>
      <section className="dashboard-preview" aria-labelledby="preview-title">
        <div className="dashboard-preview-image">{review.previewPhotoUrl ? <Image src={review.previewPhotoUrl} alt={`Foto principal de ${name}`} fill priority sizes="(max-width: 768px) 100vw, 42vw" /> : <div aria-hidden="true">V</div>}</div>
        <div className="dashboard-preview-copy"><p className="dashboard-eyebrow">PERFIL PÚBLICO</p><h2 id="preview-title">{name}{profile?.publicAge ? <>, <span>{profile.publicAge}</span></> : null}</h2><p className="dashboard-preview-place">{review.primaryLocation ?? 'Região ainda não definida'}</p>
          <dl><div><dt>Publicação</dt><dd>{status.label}</dd></div><div><dt>Verificação</dt><dd>{review.readiness.find((item) => item.key === 'verification')?.ready ? 'Identidade e maioridade confirmadas' : 'Ação necessária'}</dd></div></dl>
          <div className="dashboard-preview-actions"><Link className="dashboard-primary-action" href={actionHref}>{actionLabel}</Link><Link href="/onboarding/seu-perfil">Editar perfil</Link></div>
        </div>
      </section>
      {!review.isPublic && review.blockingReasons.length ? <section className="dashboard-attention" aria-labelledby="attention-title"><p className="dashboard-eyebrow">PRECISA DE ATENÇÃO</p><h2 id="attention-title">Antes de ficar no ar.</h2><ul>{review.blockingReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section> : null}
      <section className="dashboard-management" aria-labelledby="management-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow">GESTÃO DO PERFIL</p>
            <h2 id="management-title">Tudo em seu lugar.</h2>
          </div>
          <p className="dashboard-heading-help">
            <Link
              href={isPt ? '/ajuda/como-pausar-ou-reativar-meu-perfil' : '/en/ajuda/como-pausar-ou-reativar-meu-perfil'}
              className="dashboard-inline-help-link"
            >
              {isPt ? 'Precisa pausar ou reativar? Saiba mais →' : 'Need to pause or reactivate? Learn more →'}
            </Link>
          </p>
        </div>
        <div className="dashboard-management-list">{review.readiness.filter((item) => item.key !== 'publication').map((item) => <article key={item.key}><div><p>{item.label}</p><span>{item.key === 'photos' ? `${review.photos.approved} aprovada(s) · ${review.photos.pending} em análise` : item.key === 'locations' && review.primaryLocation ? `${review.primaryLocation}${review.serviceAreas.length > 1 ? ` + ${review.serviceAreas.length - 1} regiões` : ''}` : item.detail}</span></div><b className={item.ready ? 'is-ready' : ''}>{item.ready ? 'Em dia' : 'Atenção'}</b>{item.editHref ? <Link href={item.key === 'photos' ? '/dashboard/photos' : item.editHref}>{item.editLabel}<span aria-hidden="true">→</span></Link> : null}</article>)}</div>
      </section>
      <section className="dashboard-secondary-grid">
        <article className="dashboard-plan"><p className="dashboard-eyebrow">PLANO E PUBLICAÇÃO</p><h2>{billing.planName}</h2><p>{billing.statusLabel}</p><strong>{billing.hasPublicationEntitlement ? 'Direito de publicação ativo' : 'Sem direito de publicação ativo'}</strong>{billing.manageHref ? <Link href={billing.manageHref}>Ver plano <span aria-hidden="true">→</span></Link> : null}</article>
        <article className="dashboard-analytics-summary"><p className="dashboard-eyebrow">ÚLTIMOS 30 DIAS</p><h2>Seu alcance.</h2>{metrics ? <dl><div><dt>Impressões</dt><dd>{metrics.impressionsTotal.toLocaleString('pt-BR')}</dd></div><div><dt>WhatsApp</dt><dd>{metrics.whatsappClicks.toLocaleString('pt-BR')}</dd></div><div><dt>CTR</dt><dd>{metrics.ctr}%</dd></div></dl> : <p>As métricas aparecem depois que seu perfil começa a circular.</p>}<Link href="/dashboard/analytics">Ver analytics <span aria-hidden="true">→</span></Link></article>
      </section>
    </main>
  </div>
}
