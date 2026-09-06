/**
 * Analytics Domain Translations — PX2B
 *
 * Provides localized strings for the Professional Analytics Dashboard 2.0.
 * Covers KPIs, Funnel, Trend, Service Areas, Peak Times, Placement, and Definitions.
 */

export const analyticsPtBR = {
  'analytics.pageTitle': 'Analytics',
  'analytics.eyebrow': 'SEU DIÁRIO DE PERFORMANCE',
  'analytics.headline': 'Seu perfil em movimento.',
  'analytics.introDescription': 'Entenda sua visibilidade, visitas e o interesse real gerado pelo seu perfil.',
  'analytics.viewProfile': 'Ver meu perfil público',
  'analytics.nonPublicNote': 'As métricas continuam sendo registradas mesmo se o perfil não estiver público no momento.',
  'analytics.noProfileTitle': 'Seu perfil vem primeiro.',
  'analytics.noProfileDescription': 'Conclua a configuração do seu perfil profissional para começar a acompanhar suas métricas.',
  'analytics.setupProfile': 'Configurar perfil',

  // Period Selector
  'analytics.period': 'PERÍODO',
  'analytics.period7Days': '7 dias',
  'analytics.period30Days': '30 dias',
  'analytics.period90Days': '90 dias',
  'analytics.comparingWithPrevious': 'comparado aos {days} dias anteriores',

  // KPIs
  'analytics.kpiImpressions': 'Impressões',
  'analytics.kpiImpressionsDesc': 'Vezes em que seu perfil apareceu e permaneceu visível nos resultados.',
  'analytics.kpiViews': 'Visitas ao perfil',
  'analytics.kpiViewsDesc': 'Sessões únicas diárias que abriram sua página completa.',
  'analytics.kpiContacts': 'Cliques no WhatsApp',
  'analytics.kpiContactsDesc': 'Intenções diretas de conversa pelo botão do WhatsApp.',
  'analytics.kpiImpressionToViewRate': 'Taxa de abertura',
  'analytics.kpiImpressionToViewRateDesc': 'Visitas ÷ Impressões',
  'analytics.kpiViewToContactRate': 'Taxa de contato',
  'analytics.kpiViewToContactRateDesc': 'Cliques no WhatsApp ÷ Visitas',
  'analytics.kpiOverallRate': 'Conversão do funil',
  'analytics.kpiOverallRateDesc': 'Cliques no WhatsApp ÷ Impressões',

  // Comparisons
  'analytics.newActivity': 'Nova atividade',
  'analytics.noChange': 'Sem alteração',
  'analytics.increase': '+{change}%',
  'analytics.decrease': '{change}%',

  // Funnel
  'analytics.funnelEyebrow': 'FUNIL DE CONVERSÃO',
  'analytics.funnelTitle': 'Da exibição à intenção de contato.',
  'analytics.funnelStep1': '01 Impressões',
  'analytics.funnelStep1Desc': 'Cartões vistos na busca (≥ 50% visível por ≥ 500ms)',
  'analytics.funnelStep2': '02 Visitas ao Perfil',
  'analytics.funnelStep2Desc': 'Visitas diárias únicas ao seu perfil',
  'analytics.funnelStep3': '03 Cliques no WhatsApp',
  'analytics.funnelStep3Desc': 'Cliques no botão de contato (intenções de conversa)',
  'analytics.funnelAsymmetryNotice': 'Cliques no WhatsApp representam interações diretas com o botão e podem incluir mais de um clique pelo mesmo visitante na mesma visita.',
  'analytics.funnelOrganic': 'orgânico',
  'analytics.funnelSponsored': 'patrocinado',

  // Daily Trend
  'analytics.trendEyebrow': 'TENDÊNCIA DIÁRIA',
  'analytics.trendTitle': 'Atividade ao longo do tempo.',
  'analytics.trendTableToggle': 'Ver dados diários em tabela',
  'analytics.trendDate': 'Data',
  'analytics.trendEmpty': 'Nenhuma atividade registrada no período selecionado.',

  // Service Areas
  'analytics.locationsEyebrow': 'REGIÕES DE ATENDIMENTO',
  'analytics.locationsTitle': 'Desempenho por região de atendimento.',
  'analytics.locationsSubtitle': 'Regiões cadastradas no seu perfil onde houve exibições e interesse.',
  'analytics.locationsTableRegion': 'Região',
  'analytics.locationsTableCity': 'Cidade',
  'analytics.locationsTableImpressions': 'Impressões',
  'analytics.locationsTableViews': 'Visitas',
  'analytics.locationsTableContacts': 'Cliques',
  'analytics.locationsTableRate': 'Taxa',
  'analytics.locationsEmpty': 'Nenhuma atividade distribuída por região no período.',

  // Time & Peak Analysis
  'analytics.timeEyebrow': 'DIAS E HORÁRIOS',
  'analytics.timeTitle': 'Melhores dias e horários de interesse.',
  'analytics.bestDayLabel': 'Dia com maior atividade',
  'analytics.bestHourLabel': 'Horário com maior atividade',
  'analytics.noPeakData': 'Dados insuficientes para determinar horário de pico.',
  'analytics.timezoneNotice': 'Horários calculados com base no fuso de Brasília (America/Sao_Paulo).',
  'analytics.hourlyDistribution': 'Distribuição por hora do dia',
  'analytics.dayOfWeekDistribution': 'Distribuição por dia da semana',

  // Placement Breakdown
  'analytics.placementEyebrow': 'ORIGEM POR POSICIONAMENTO',
  'analytics.placementTitle': 'Tipo de posicionamento.',
  'analytics.placementSubtitle': 'Compara a visibilidade orgânica do perfil com posições de destaque patrocinado ativas.',
  'analytics.placementOrganic': 'Orgânico',
  'analytics.placementSponsored': 'Destaque Patrocinado',

  // Current Audience Mode
  'analytics.audienceEyebrow': 'VISIBILIDADE ATUAL',
  'analytics.audienceTitle': 'Configuração de audiência.',
  'analytics.audienceCurrent': 'Visibilidade atual do perfil: {mode}',
  'analytics.audiencePublic': 'Público',
  'analytics.audienceVipOnly': 'Somente VIP',
  'analytics.audienceDisclaimer': 'Esta é a configuração atual do seu perfil. As métricas do período refletem o histórico geral.',

  // Metric Definitions
  'analytics.definitionsEyebrow': 'TRANSPARÊNCIA',
  'analytics.definitionsTitle': 'Como estas métricas funcionam?',
  'analytics.defImpressionsTitle': 'O que é uma Impressão?',
  'analytics.defImpressionsBody': 'Registrada quando seu cartão de perfil aparece na busca e permanece visível na tela por pelo menos meio segundo com no mínimo 50% de área exibida.',
  'analytics.defViewsTitle': 'O que é uma Visita ao Perfil?',
  'analytics.defViewsBody': 'Contabilizada no máximo uma vez por dia por visitante/sessão que acessa a página completa do seu perfil. Atualizações de página e navegações repetidas no mesmo dia não inflam esse número.',
  'analytics.defContactsTitle': 'O que é um Clique no WhatsApp?',
  'analytics.defContactsBody': 'Representa cada clique no botão de contato no seu perfil, demonstrando interesse direto em iniciar uma conversa. Não mede mensagens enviadas ou atendimentos confirmados.',
  'analytics.defPrivacyTitle': 'Privacidade e Proteção de Dados',
  'analytics.defPrivacyBody': 'Todas as métricas são 100% anônimas e agregadas. Nenhum dado pessoal, endereço IP ou identificador de visitante é armazenado ou disponibilizado aos profissionais.',

  // Error State
  'analytics.errorTitle': 'Não foi possível carregar as métricas.',
  'analytics.errorDescription': 'Ocorreu uma instabilidade temporária ao consultar os dados agregados. Tente novamente em alguns instantes.',
  'analytics.retry': 'Tentar novamente',
} as const

export const analyticsEn = {
  'analytics.pageTitle': 'Analytics',
  'analytics.eyebrow': 'PERFORMANCE JOURNAL',
  'analytics.headline': 'Your profile in motion.',
  'analytics.introDescription': 'Understand your visibility, visits, and real engagement generated by your profile.',
  'analytics.viewProfile': 'View my public profile',
  'analytics.nonPublicNote': 'Metrics continue to be recorded even if your profile is not currently public.',
  'analytics.noProfileTitle': 'Your profile comes first.',
  'analytics.noProfileDescription': 'Complete your professional profile configuration to start tracking your performance.',
  'analytics.setupProfile': 'Set up profile',

  // Period Selector
  'analytics.period': 'PERIOD',
  'analytics.period7Days': '7 days',
  'analytics.period30Days': '30 days',
  'analytics.period90Days': '90 days',
  'analytics.comparingWithPrevious': 'compared to the previous {days} days',

  // KPIs
  'analytics.kpiImpressions': 'Impressions',
  'analytics.kpiImpressionsDesc': 'Times your profile appeared and remained visible in search results.',
  'analytics.kpiViews': 'Profile visits',
  'analytics.kpiViewsDesc': 'Unique daily sessions that opened your full profile page.',
  'analytics.kpiContacts': 'WhatsApp clicks',
  'analytics.kpiContactsDesc': 'Direct contact intentions started from the WhatsApp button.',
  'analytics.kpiImpressionToViewRate': 'Open rate',
  'analytics.kpiImpressionToViewRateDesc': 'Profile visits ÷ Impressions',
  'analytics.kpiViewToContactRate': 'Contact rate',
  'analytics.kpiViewToContactRateDesc': 'WhatsApp clicks ÷ Profile visits',
  'analytics.kpiOverallRate': 'Funnel conversion',
  'analytics.kpiOverallRateDesc': 'WhatsApp clicks ÷ Impressions',

  // Comparisons
  'analytics.newActivity': 'New activity',
  'analytics.noChange': 'No change',
  'analytics.increase': '+{change}%',
  'analytics.decrease': '{change}%',

  // Funnel
  'analytics.funnelEyebrow': 'CONVERSION FUNNEL',
  'analytics.funnelTitle': 'From exposure to contact intent.',
  'analytics.funnelStep1': '01 Impressions',
  'analytics.funnelStep1Desc': 'Search cards viewed (≥ 50% visible for ≥ 500ms)',
  'analytics.funnelStep2': '02 Profile Visits',
  'analytics.funnelStep2Desc': 'Unique daily visits to your profile page',
  'analytics.funnelStep3': '03 WhatsApp Clicks',
  'analytics.funnelStep3Desc': 'Clicks on the contact CTA button (intent signals)',
  'analytics.funnelAsymmetryNotice': 'WhatsApp clicks reflect interactions with the CTA button and may include repeat clicks from the same visit.',
  'analytics.funnelOrganic': 'organic',
  'analytics.funnelSponsored': 'sponsored',

  // Daily Trend
  'analytics.trendEyebrow': 'DAILY TREND',
  'analytics.trendTitle': 'Activity over time.',
  'analytics.trendTableToggle': 'View daily data as table',
  'analytics.trendDate': 'Date',
  'analytics.trendEmpty': 'No activity recorded in the selected period.',

  // Service Areas
  'analytics.locationsEyebrow': 'SERVICE AREAS',
  'analytics.locationsTitle': 'Performance by service area.',
  'analytics.locationsSubtitle': 'Configured areas on your profile where exposures and interest occurred.',
  'analytics.locationsTableRegion': 'Area',
  'analytics.locationsTableCity': 'City',
  'analytics.locationsTableImpressions': 'Impressions',
  'analytics.locationsTableViews': 'Visits',
  'analytics.locationsTableContacts': 'Clicks',
  'analytics.locationsTableRate': 'Rate',
  'analytics.locationsEmpty': 'No activity distributed across service areas in this period.',

  // Time & Peak Analysis
  'analytics.timeEyebrow': 'DAYS & TIMES',
  'analytics.timeTitle': 'Peak days and hours of engagement.',
  'analytics.bestDayLabel': 'Most active day',
  'analytics.bestHourLabel': 'Most active hour',
  'analytics.noPeakData': 'Not enough data to calculate peak times.',
  'analytics.timezoneNotice': 'Times calculated based on Brasília timezone (America/Sao_Paulo).',
  'analytics.hourlyDistribution': 'Hourly distribution (24h)',
  'analytics.dayOfWeekDistribution': 'Day of week distribution',

  // Placement Breakdown
  'analytics.placementEyebrow': 'PLACEMENT BREAKDOWN',
  'analytics.placementTitle': 'Placement type.',
  'analytics.placementSubtitle': 'Compares organic search visibility with active sponsored featured positions.',
  'analytics.placementOrganic': 'Organic',
  'analytics.placementSponsored': 'Sponsored Featured',

  // Current Audience Mode
  'analytics.audienceEyebrow': 'CURRENT VISIBILITY',
  'analytics.audienceTitle': 'Audience setting.',
  'analytics.audienceCurrent': 'Current profile visibility: {mode}',
  'analytics.audiencePublic': 'Public',
  'analytics.audienceVipOnly': 'VIP Only',
  'analytics.audienceDisclaimer': 'This is your current profile setting. Historical metrics reflect overall period activity.',

  // Metric Definitions
  'analytics.definitionsEyebrow': 'TRANSPARENCY',
  'analytics.definitionsTitle': 'How do these metrics work?',
  'analytics.defImpressionsTitle': 'What is an Impression?',
  'analytics.defImpressionsBody': 'Counted when your profile card appears in search results and stays visible on screen for at least 500ms covering at least 50% of the card area.',
  'analytics.defViewsTitle': 'What is a Profile Visit?',
  'analytics.defViewsBody': 'Recorded at most once per day per visitor/session who views your full profile page. Page refreshes and repeat visits within the same calendar day do not inflate this metric.',
  'analytics.defContactsTitle': 'What is a WhatsApp Click?',
  'analytics.defContactsBody': 'Represents each click on the WhatsApp contact button, indicating intention to start a conversation. It does not measure messages sent or confirmed bookings.',
  'analytics.defPrivacyTitle': 'Privacy & Data Protection',
  'analytics.defPrivacyBody': 'All analytics are 100% anonymous and aggregate. No personal data, IP addresses, or visitor identifiers are stored or exposed to professionals.',

  // Error State
  'analytics.errorTitle': 'Could not load analytics metrics.',
  'analytics.errorDescription': 'A temporary error occurred while querying aggregated data. Please try again shortly.',
  'analytics.retry': 'Try again',
} satisfies Record<keyof typeof analyticsPtBR, string>
