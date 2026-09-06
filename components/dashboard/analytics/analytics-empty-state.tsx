import Link from 'next/link'

interface AnalyticsEmptyStateProps {
  isPublic: boolean
  profileSlug: string
  locale: string
}

export function AnalyticsEmptyState({ isPublic, profileSlug, locale }: AnalyticsEmptyStateProps) {
  const isPt = locale === 'pt-BR'

  return (
    <section className="analytics-empty-section">
      <div className="analytics-empty-card">
        <p className="dashboard-eyebrow">{isPt ? 'SEU DIÁRIO DE PERFORMANCE' : 'PERFORMANCE JOURNAL'}</p>
        <h2>{isPt ? 'Seus primeiros dados aparecerão aqui.' : 'Your initial data will appear here.'}</h2>
        <p className="analytics-empty-desc">
          {isPt
            ? 'Quando seu perfil começar a receber exibições nos resultados de busca e visitas, você poderá acompanhar sua visibilidade, taxa de abertura e intenções de contato detalhadas.'
            : 'As your profile starts receiving search impressions and visits, you will be able to track your visibility, open rates, and direct contact intentions.'}
        </p>

        <div className="analytics-empty-actions">
          {isPublic && profileSlug ? (
            <Link href={`/perfil/${profileSlug}`} className="analytics-empty-link">
              {isPt ? 'Ver meu perfil público' : 'View my public profile'} <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <Link href="/onboarding/revisar" className="analytics-empty-link">
              {isPt ? 'Revisar status de publicação' : 'Review publication status'} <span aria-hidden="true">→</span>
            </Link>
          )}

          <Link href="/dashboard/photos" className="analytics-empty-sublink">
            {isPt ? 'Atualizar fotos e mídias' : 'Update photos & media'} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
