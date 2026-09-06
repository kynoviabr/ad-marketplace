interface AnalyticsDefinitionsGuideProps {
  locale: string
}

export function AnalyticsDefinitionsGuide({ locale }: AnalyticsDefinitionsGuideProps) {
  const isPt = locale === 'pt-BR'

  return (
    <aside className="analytics-definitions-section" aria-labelledby="analytics-definitions-title">
      <div className="analytics-definitions-header">
        <p className="dashboard-eyebrow">{isPt ? 'TRANSPARÊNCIA E CRITÉRIOS' : 'METHODOLOGY & PRIVACY'}</p>
        <h2 id="analytics-definitions-title">
          {isPt ? 'Como estas métricas funcionam?' : 'How do these metrics work?'}
        </h2>
      </div>

      <div className="analytics-definitions-grid">
        <div className="analytics-def-item">
          <h3>{isPt ? 'Impressões Qualificadas' : 'Qualified Impressions'}</h3>
          <p>
            {isPt
              ? 'Registrada quando seu cartão de perfil aparece na busca e permanece visível na tela por pelo menos 500ms (meio segundo) com no mínimo 50% de sua área exibida. Rolagens rápidas e prefetch SSR não contam. Embora robôs comuns sem renderização não acionem impressões, nenhuma tecnologia web elimina integralmente todo tráfego automatizado residual.'
              : 'Recorded when your card appears in search results and stays visible on screen for at least 500ms covering at least 50% of the card area. Fast scrolling and SSR prefetch are excluded. While non-rendered crawler requests do not trigger impressions, residual automated traffic cannot be 100% eliminated by any platform.'}
          </p>
        </div>

        <div className="analytics-def-item">
          <h3>{isPt ? 'Visitas Únicas ao Perfil' : 'Unique Profile Visits'}</h3>
          <p>
            {isPt
              ? 'Contabilizada no máximo uma vez por dia por visitante/sessão que acessa a página completa do seu perfil. Requisições prefetch e navegações repetidas no mesmo dia não inflam esse número.'
              : 'Counted at most once per day per visitor/session who views your full profile page. Prefetch requests and repeat visits within the same calendar day do not inflate this metric.'}
          </p>
        </div>

        <div className="analytics-def-item">
          <h3>{isPt ? 'Cliques no WhatsApp' : 'WhatsApp Contact Clicks'}</h3>
          <p>
            {isPt
              ? 'Representa cada clique no botão de contato no seu perfil, demonstrando interesse direto em iniciar uma conversa. Não mede mensagens enviadas nem contratações confirmadas.'
              : 'Represents each click on the contact button, indicating intention to initiate a conversation. It does not track sent messages or confirmed appointments.'}
          </p>
        </div>

        <div className="analytics-def-item">
          <h3>{isPt ? 'Privacidade e Proteção de Dados' : 'Privacy & Data Protection'}</h3>
          <p>
            {isPt
              ? 'Todas as métricas são 100% anônimas e agregadas. Nenhum dado pessoal, número de telefone de visitantes ou endereço IP é rastreado ou disponibilizado na plataforma.'
              : 'All metrics are 100% anonymous and aggregated. No personal data, visitor phone numbers, or IP addresses are tracked or made available on the platform.'}
          </p>
        </div>
      </div>
    </aside>
  )
}
