export interface HelpArticle {
  id: string
  slug?: string
  categoryId: string
  titlePt: string
  titleEn: string
  summaryPt: string
  summaryEn: string
  contentPt: string
  contentEn: string
  keywords: string[]
  relatedLinks?: Array<{
    labelPt: string
    labelEn: string
    href: string
  }>
  relatedArticleIds?: string[]
}

export interface HelpCategory {
  id: string
  titlePt: string
  titleEn: string
  descriptionPt: string
  descriptionEn: string
  icon: string
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'primeiros-passos',
    titlePt: 'Primeiros passos',
    titleEn: 'Getting started',
    descriptionPt: 'Como criar sua conta e começar sua presença na velvet.',
    descriptionEn: 'How to create your account and begin your journey on velvet.',
    icon: '✦',
  },
  {
    id: 'conta-e-acesso',
    titlePt: 'Conta e acesso',
    titleEn: 'Account and access',
    descriptionPt: 'Acesso à conta, recuperação de senha e segurança do login.',
    descriptionEn: 'Account login, password recovery, and security credentials.',
    icon: '◈',
  },
  {
    id: 'perfil',
    titlePt: 'Perfil',
    titleEn: 'Profile',
    descriptionPt: 'Montagem de perfil, biografia, nome artístico e controles.',
    descriptionEn: 'Profile setup, biography, stage name, and display toggles.',
    icon: '◇',
  },
  {
    id: 'fotos-e-videos',
    titlePt: 'Fotos e vídeos',
    titleEn: 'Photos and videos',
    descriptionPt: 'Diretrizes para envio, foto principal e moderação de mídia.',
    descriptionEn: 'Guidelines for media uploads, primary photo, and moderation.',
    icon: '▣',
  },
  {
    id: 'verificacao',
    titlePt: 'Verificação',
    titleEn: 'Verification',
    descriptionPt: 'Confirmação obrigatória de identidade e maioridade 18+.',
    descriptionEn: 'Mandatory 18+ age and identity verification process.',
    icon: '✓',
  },
  {
    id: 'servicos-e-regioes',
    titlePt: 'Serviços e regiões',
    titleEn: 'Services and areas',
    descriptionPt: 'Configuração de bairros atendidos e experiências oferecidas.',
    descriptionEn: 'Configuring service areas and experiences offered.',
    icon: '⌖',
  },
  {
    id: 'clientes-vip',
    titlePt: 'Clientes VIP',
    titleEn: 'VIP Clients',
    descriptionPt: 'Diferenças entre perfis Públicos e exclusivos para VIPs.',
    descriptionEn: 'Differences between Public and exclusive VIP-only profiles.',
    icon: '★',
  },
  {
    id: 'avaliacoes',
    titlePt: 'Avaliações',
    titleEn: 'Reviews',
    descriptionPt: 'Como funcionam os depoimentos e a reputação na plataforma.',
    descriptionEn: 'How client testimonials and platform reputation work.',
    icon: '♦',
  },
  {
    id: 'planos',
    titlePt: 'Planos',
    titleEn: 'Plans',
    descriptionPt: 'Direito de publicação e visibilidade profissional na velvet.',
    descriptionEn: 'Publication entitlements and professional visibility on velvet.',
    icon: '◬',
  },
  {
    id: 'seguranca-e-privacidade',
    titlePt: 'Segurança e privacidade',
    titleEn: 'Security and privacy',
    descriptionPt: 'Proteção de documentos, identidade legal e dados sensíveis.',
    descriptionEn: 'Protection of documents, legal identity, and sensitive data.',
    icon: '🔒',
  },
  {
    id: 'moderacao',
    titlePt: 'Moderação',
    titleEn: 'Moderation',
    descriptionPt: 'Padrões editoriais, análise de textos e critérios de aprovação.',
    descriptionEn: 'Editorial guidelines, text reviews, and approval criteria.',
    icon: '⚖',
  },
  {
    id: 'problemas-tecnicos',
    titlePt: 'Problemas técnicos',
    titleEn: 'Technical issues',
    descriptionPt: 'Dificuldades de login, carregamento de mídia e suporte.',
    descriptionEn: 'Login difficulties, media upload troubles, and technical help.',
    icon: '⚙',
  },
]

export const STARTER_FAQS: HelpArticle[] = [
  {
    id: 'como-publicar-perfil',
    slug: 'como-publicar-meu-perfil',
    categoryId: 'primeiros-passos',
    titlePt: 'Como publicar meu perfil',
    titleEn: 'How to publish my profile',
    summaryPt: 'Saiba quais são os critérios necessários para colocar seu perfil no ar.',
    summaryEn: 'Learn the required criteria to make your professional profile public.',
    contentPt:
      'Para que seu perfil seja ativado e exibido publicamente na velvet., são necessários os seguintes critérios:\n\n' +
      '1. Verificação 18+: Confirmação de identidade e maioridade concluída.\n' +
      '2. Perfil completo: Nome artístico, frase de apresentação e biografia preenchidos.\n' +
      '3. Contato configurado: Pelo menos um canal de contato (WhatsApp, telefone ou Telegram).\n' +
      '4. Foto aprovada: Ao menos uma foto aprovada pela moderação e definida como principal.\n' +
      '5. Região de atendimento: Ao menos uma localidade selecionada.\n' +
      '6. Moderação de texto: Apresentação aprovada pelos critérios editoriais da plataforma.\n' +
      '7. Plano/Direito de publicação ativo.\n\n' +
      'Você pode acompanhar todos esses passos em tempo real na página de revisão antes de publicar.',
    contentEn:
      'For your profile to be activated and displayed publicly on velvet., the following criteria must be satisfied:\n\n' +
      '1. 18+ Verification: Completed identity and legal age confirmation.\n' +
      '2. Complete profile: Stage name, headline, and bio filled in.\n' +
      '3. Contact channel: At least one public contact method (WhatsApp, phone, or Telegram).\n' +
      '4. Approved photo: At least one moderation-approved photo set as primary.\n' +
      '5. Service area: At least one active location selected.\n' +
      '6. Text moderation: Content approved under platform editorial standards.\n' +
      '7. Active publication entitlement/plan.\n\n' +
      'You can track every requirement in real time on the review page prior to publication.',
    keywords: ['publicar', 'ativar', 'requisitos', 'criterios', 'passo a passo', 'publish', 'activation', 'criteria'],
    relatedLinks: [
      { labelPt: 'Guia passo a passo', labelEn: 'Step-by-step guide', href: '/como-comecar' },
      { labelPt: 'Anuncie na velvet.', labelEn: 'Advertise on velvet.', href: '/anuncie' },
    ],
    relatedArticleIds: ['verificacao-18-como-funciona', 'fotos-e-videos-diretrizes', 'o-que-fica-publico-privado'],
  },
  {
    id: 'o-que-fica-publico-privado',
    slug: 'o-que-fica-publico-e-o-que-fica-privado',
    categoryId: 'seguranca-e-privacidade',
    titlePt: 'O que fica público e o que fica privado',
    titleEn: 'What is public and what remains private',
    summaryPt: 'Entenda a separação absoluta entre sua identidade profissional e seus dados civis.',
    summaryEn: 'Understand the strict separation between your public profile and civil documents.',
    contentPt:
      'A velvet. protege rigorosamente a sua privacidade:\n\n' +
      '• Dados que NUNCA são exibidos publicamente: Seu nome civil, CPF, documentos de identificação, fotos de verificação (selfie/documento) e endereço residencial. O processo de KYC serve unicamente para garantir a maioridade legal (18+) e integridade da rede.\n\n' +
      '• Dados públicos que você controla: Seu nome artístico, fotos e vídeos aprovados, biografia, bairros onde você atende e contatos que você optar por exibir.\n\n' +
      '• Características físicas: Idade, altura e peso são opcionais; você decide individualmente se cada item deve aparecer.',
    contentEn:
      'velvet. strictly protects your privacy:\n\n' +
      '• Information NEVER shown publicly: Your legal name, government ID/CPF, verification documents, verification photos (selfies/IDs), and residential address. Verification exists solely to guarantee legal 18+ age and platform integrity.\n\n' +
      '• Public information you control: Stage name, approved photos and videos, biography, service neighborhoods, and public contact channels you choose to enable.\n\n' +
      '• Physical traits: Age, height, and weight are optional; you control each display toggle independently.',
    keywords: ['privacidade', 'publico', 'privado', 'nome civil', 'cpf', 'documentos', 'seguranca', 'privacy', 'confidentiality'],
    relatedLinks: [
      { labelPt: 'Política de Privacidade', labelEn: 'Privacy Policy', href: '/privacidade' },
      { labelPt: 'Como começar na velvet.', labelEn: 'How to start on velvet.', href: '/como-comecar' },
    ],
    relatedArticleIds: ['verificacao-18-como-funciona', 'public-vs-vip-only', 'pausar-ou-ocultar-perfil'],
  },
  {
    id: 'verificacao-18-como-funciona',
    slug: 'verificacao-de-identidade-e-maioridade',
    categoryId: 'verificacao',
    titlePt: 'Verificação de identidade e maioridade',
    titleEn: 'Identity and legal age verification',
    summaryPt: 'A verificação é obrigatória, segura e nunca expõe seus documentos.',
    summaryEn: 'Verification is mandatory, confidential, and never displays your documents.',
    contentPt:
      'A verificação é uma exigência legal e um pilar de segurança da velvet.:\n\n' +
      '• O processo é conduzido em um ambiente criptografado através de um parceiro seguro especializado.\n' +
      '• É necessário enviar um documento de identificação oficial com foto e realizar uma validação biométrica de vivacidade (selfie rápida).\n' +
      '• A análise confirma apenas se você é maior de 18 anos e titular do documento.\n' +
      '• Seus documentos não são arquivados na sua página nem expostos a clientes ou visitantes.\n' +
      '• O resultado é sincronizado automaticamente com seu painel.',
    contentEn:
      'Verification is a legal requirement and safety foundation of velvet.:\n\n' +
      '• The process is hosted in an encrypted environment by our secure verification partner.\n' +
      '• You provide a valid government-issued photo ID and complete a quick liveness selfie check.\n' +
      '• The check only confirms legal age (18+) and document authenticity.\n' +
      '• Your documents are never stored on your public page nor shared with visitors or clients.\n' +
      '• Results synchronize automatically with your onboarding dashboard.',
    keywords: ['verificacao', '18+', 'maioridade', 'identidade', 'documento', 'kyc', 'verification', 'id', 'age'],
    relatedLinks: [
      { labelPt: 'Verificação no guia', labelEn: 'Verification in guide', href: '/como-comecar' },
      { labelPt: 'Central de Segurança', labelEn: 'Safety Center', href: '/seguranca' },
    ],
    relatedArticleIds: ['o-que-fica-publico-privado', 'como-publicar-perfil', 'public-vs-vip-only'],
  },
  {
    id: 'fotos-e-videos-diretrizes',
    slug: 'fotos-e-videos-envio-aprovacao-e-limites',
    categoryId: 'fotos-e-videos',
    titlePt: 'Fotos e vídeos: envio, aprovação e limites',
    titleEn: 'Photos and videos: upload, approval, and guidelines',
    summaryPt: 'Diretrizes sobre formatos aceitos, foto principal e processo de aprovação.',
    summaryEn: 'Guidelines on accepted formats, primary photo, and approval review.',
    contentPt:
      'Suas fotos e vídeos são a porta de entrada para seu perfil:\n\n' +
      '• Formatos: Imagens nos formatos JPEG, PNG ou WebP de alta qualidade (até 15 MB). Vídeos curtos são suportados.\n' +
      '• Foto principal: Você deve definir uma foto aprovada como "Principal". Esta será a imagem exibida nas buscas e na capa do seu perfil.\n' +
      '• Moderação: Todo conteúdo passa por moderação antes de ficar público. Enquanto estiver em análise, as mídias continuam visíveis apenas para você no painel.\n' +
      '• Conteúdos rejeitados: Caso alguma imagem não cumpra as diretrizes de qualidade ou termos de uso, você será informada para substituí-la.',
    contentEn:
      'Your photos and videos are the front door to your presence on velvet.:\n\n' +
      '• Formats: High-quality JPEG, PNG, or WebP images (up to 15 MB). Short videos are supported.\n' +
      '• Primary photo: You must choose one approved photo as "Primary". This image appears in search and as your cover.\n' +
      '• Moderation: All media undergoes moderation review before becoming public. Pending items remain visible only to you.\n' +
      '• Rejected items: If any item does not comply with guidelines or terms, you are notified to replace it.',
    keywords: ['fotos', 'videos', 'galeria', 'foto principal', 'aprovacao', 'moderacao', 'media', 'photos', 'upload'],
    relatedLinks: [
      { labelPt: 'Envio de mídia no guia', labelEn: 'Media upload guide', href: '/como-comecar' },
    ],
    relatedArticleIds: ['como-publicar-perfil', 'public-vs-vip-only', 'o-que-fica-publico-privado'],
  },
  {
    id: 'public-vs-vip-only',
    slug: 'perfil-publico-vs-vip',
    categoryId: 'clientes-vip',
    titlePt: 'Perfil Público vs VIP',
    titleEn: 'Public vs VIP profile',
    summaryPt: 'Escolha quem pode descobrir e visualizar suas informações.',
    summaryEn: 'Choose who can discover and view your profile information.',
    contentPt:
      'Na velvet., você tem total autonomia para definir a visibilidade do seu perfil:\n\n' +
      '• Perfil Público (PUBLIC): Fica visível para qualquer visitante que acesse a plataforma velvet. Aparece nas listagens orgânicas de busca por cidade e bairro.\n\n' +
      '• Somente VIP (VIP_ONLY): Fica visível exclusivamente para clientes que possuem assinatura VIP ativa e verificada na velvet. Visitantes anônimos e usuários com cadastro gratuito não conseguem visualizar seus dados, fotos ou contato na busca ou no perfil direto.\n\n' +
      'Você pode alterar essa configuração a qualquer momento no seu painel.',
    contentEn:
      'On velvet., you have complete autonomy over your profile visibility:\n\n' +
      '• Public profile (PUBLIC): Visible to any visitor browsing velvet. Appears in search results for your city and neighborhood.\n\n' +
      '• VIP-Only profile (VIP_ONLY): Visible exclusively to verified clients with an active VIP subscription. Anonymous visitors and free accounts cannot view your details, media, or contact channels in search or direct URLs.\n\n' +
      'You can switch this setting at any time from your profile settings.',
    keywords: ['vip', 'vip_only', 'publico', 'visibilidade', 'assinatura vip', 'filtro', 'public', 'audience'],
    relatedLinks: [
      { labelPt: 'Entenda os públicos no guia', labelEn: 'Audience settings in guide', href: '/como-comecar' },
    ],
    relatedArticleIds: ['o-que-fica-publico-privado', 'pausar-ou-ocultar-perfil', 'como-publicar-perfil'],
  },
  {
    id: 'pausar-ou-ocultar-perfil',
    slug: 'como-pausar-ou-reativar-meu-perfil',
    categoryId: 'perfil',
    titlePt: 'Como pausar ou reativar meu perfil',
    titleEn: 'How to pause or reactivate my profile',
    summaryPt: 'Você tem total controle sobre quando seu anúncio fica visível.',
    summaryEn: 'You maintain full control over when your ad is visible.',
    contentPt:
      'Se você for viajar, tirar férias ou precisar de uma pausa no atendimento:\n\n' +
      '• Você pode alterar o status do seu perfil para pausado diretamente pelo seu painel de controle.\n' +
      '• Quando pausado, seu perfil deixa de aparecer nas buscas públicas e nas páginas de bairros imediatamente.\n' +
      '• Todos os seus dados, fotos aprovadas e histórico permanecem preservados de forma segura.\n' +
      '• Para voltar a atender, basta reativar o perfil no painel.',
    contentEn:
      'If you are traveling, taking time off, or taking a break from bookings:\n\n' +
      '• You can pause your profile status directly from your dashboard.\n' +
      '• While paused, your profile is immediately removed from search results and neighborhood pages.\n' +
      '• All your information, approved media, and settings remain securely preserved.\n' +
      '• To resume visibility, simply reactivate your profile anytime.',
    keywords: ['pausar', 'ocultar', 'ferias', 'desativar temporariamente', 'status', 'pause', 'hide', 'offline'],
    relatedLinks: [
      { labelPt: 'Ir para o painel', labelEn: 'Go to dashboard', href: '/dashboard' },
    ],
    relatedArticleIds: ['como-publicar-perfil', 'public-vs-vip-only', 'o-que-fica-publico-privado'],
  },
  {
    id: 'como-funcionam-avaliacoes',
    categoryId: 'avaliacoes',
    titlePt: 'Como funcionam as avaliações na velvet.?',
    titleEn: 'How do reviews and feedback work on velvet.?',
    summaryPt: 'Depoimentos autênticos com respeito e transparência.',
    summaryEn: 'Authentic feedback designed for transparency and respect.',
    contentPt:
      'O sistema de avaliações da velvet. foi projetado com seriedade:\n\n' +
      '• Apenas clientes com contas verificadas podem registrar avaliações sobre seu atendimento.\n' +
      '• Todas as avaliações passam por moderação para garantir que não contenham linguagem abusiva, ofensas, discriminação ou dados privados.\n' +
      '• Avaliações autênticas ajudam a construir sua credibilidade e reputação na plataforma.\n' +
      '• Você pode acompanhar todas as avaliações recebidas na área de Avaliações do seu painel.',
    contentEn:
      'The velvet. review system is built on trust and respect:\n\n' +
      '• Only verified client accounts can submit reviews regarding experiences.\n' +
      '• All reviews are moderated to ensure they contain no abusive language, harassment, discrimination, or private details.\n' +
      '• Authentic reviews help build your credibility and reputation.\n' +
      '• You can monitor your received testimonials in the Reviews section of your dashboard.',
    keywords: ['avaliacoes', 'depoimentos', 'feedback', 'reputacao', 'reviews', 'rating'],
    relatedLinks: [
      { labelPt: 'Diretrizes da comunidade', labelEn: 'Community guidelines', href: '/termos' },
    ],
  },
  {
    id: 'contato-direto-sem-intermediacao',
    categoryId: 'servicos-e-regioes',
    titlePt: 'Como os clientes entram em contato? A velvet. intermedia serviços?',
    titleEn: 'How do clients reach out? Does velvet. intermediate services?',
    summaryPt: 'O contato acontece diretamente entre você e os clientes.',
    summaryEn: 'Contact occurs directly between you and clients without intermediaries.',
    contentPt:
      'A velvet. é exclusivamente uma plataforma de publicidade e descoberta:\n\n' +
      '• Não intermediamos atendimentos, conversas, agendamentos nem valores de cachê.\n' +
      '• Os clientes entram em contato direto com você através dos canais que você mesma autorizou (WhatsApp, telefone ou Telegram).\n' +
      '• Você mantém 100% dos seus ganhos e define integralmente suas próprias condições, valores e horários.\n' +
      '• Nenhuma porcentagem ou comissão sobre seus serviços é retida pela velvet.',
    contentEn:
      'velvet. is exclusively a discovery and advertising platform:\n\n' +
      '• We do not intermediate conversations, appointments, or service fees.\n' +
      '• Clients contact you directly through the channels you authorize (WhatsApp, direct phone, or Telegram).\n' +
      '• You keep 100% of your earnings and maintain full autonomy over your rates, schedule, and preferences.\n' +
      '• No commission or fee is taken from your independent bookings.',
    keywords: ['contato direto', 'whatsapp', 'intermediacao', 'comissao', 'autonomia', 'direct contact', 'no commission'],
    relatedLinks: [
      { labelPt: 'Anuncie na velvet.', labelEn: 'Advertise on velvet.', href: '/anuncie' },
    ],
  },
  {
    id: 'problemas-de-acesso-recuperacao',
    categoryId: 'conta-e-acesso',
    titlePt: 'Esqueci minha senha ou não consigo acessar minha conta',
    titleEn: 'I forgot my password or cannot access my account',
    summaryPt: 'Como redefinir sua senha com segurança através do seu e-mail cadastrado.',
    summaryEn: 'How to securely reset your password via your registered email.',
    contentPt:
      'Se você perdeu o acesso à sua conta profissional:\n\n' +
      '1. Acesse a página de login e clique em "Esqueci minha senha".\n' +
      '2. Digite o e-mail cadastrado na sua conta.\n' +
      '3. Você receberá um link seguro para criar uma nova senha.\n' +
      '4. Verifique também sua caixa de spam ou lixo eletrônico.\n' +
      '5. Por medidas de segurança e proteção anti-enumeração, o sistema confirma o envio de forma idêntica.\n\n' +
      'Se você mudou de e-mail e não consegue recuperar o acesso, entre em contato pelo suporte técnico.',
    contentEn:
      'If you lost access to your professional account:\n\n' +
      '1. Navigate to the login page and click "Forgot password".\n' +
      '2. Enter the email registered with your account.\n' +
      '3. You will receive a secure link to create a new password.\n' +
      '4. Please check your spam or junk folder as well.\n' +
      '5. For security and anti-enumeration safeguards, the confirmation is delivered silently.\n\n' +
      'If your email address changed and you cannot recover access, reach out to technical support.',
    keywords: ['senha', 'recuperar', 'esqueci', 'login', 'acesso', 'problema', 'password', 'recovery'],
    relatedLinks: [
      { labelPt: 'Recuperar senha', labelEn: 'Reset password', href: '/forgot-password' },
      { labelPt: 'Fazer login', labelEn: 'Sign in', href: '/login' },
    ],
  },
  {
    id: 'planos-e-direito-publicacao',
    categoryId: 'planos',
    titlePt: 'Como funcionam os planos e o direito de publicação?',
    titleEn: 'How do plans and publication entitlements work?',
    summaryPt: 'Entenda como o direito de manter seu perfil publicado é gerenciado.',
    summaryEn: 'Understand how publication entitlements are managed on velvet.',
    contentPt:
      'O direito de publicação permite que seu perfil fique visível para os visitantes da plataforma:\n\n' +
      '• Ao ativar seu plano, sua conta recebe o direito de publicação (CAN_PUBLISH_PROFILE).\n' +
      '• O status do seu plano pode ser acompanhado diretamente na aba de Planos/Assinatura do seu painel profissional.\n' +
      '• O faturamento é transparente e gerencia sua presença contínua na velvet.\n' +
      '• Se o plano expirar, o perfil permanece salvo com todas as suas fotos e dados intactos, aguardando renovação para voltar ao ar.',
    contentEn:
      'Publication entitlements allow your profile to remain visible to platform visitors:\n\n' +
      '• Activating your plan grants your account the publication entitlement (CAN_PUBLISH_PROFILE).\n' +
      '• You can inspect your plan status directly in the Billing/Plans section of your dashboard.\n' +
      '• Transparent billing maintains your ongoing presence on velvet.\n' +
      '• If a plan expires, your profile and uploaded content remain safely saved, ready to return upon renewal.',
    keywords: ['planos', 'assinatura', 'direito de publicacao', 'entitlement', 'mensalidade', 'plans', 'billing'],
    relatedLinks: [
      { labelPt: 'Como começar', labelEn: 'How to start', href: '/como-comecar' },
    ],
  },
  {
    id: 'moderacao-de-conteudo-regras',
    categoryId: 'moderacao',
    titlePt: 'Quais são as regras de moderação de texto e imagens?',
    titleEn: 'What are the text and image moderation rules?',
    summaryPt: 'Saiba o que a moderação da velvet. avalia para garantir o padrão editorial.',
    summaryEn: 'Learn what velvet. moderation reviews to ensure editorial standards.',
    contentPt:
      'A moderação garante um ambiente elegante e seguro para todas as profissionais:\n\n' +
      '• Moderação de texto: Não são permitidos termos vulgares, conteúdo discriminatório, ofertas explícitas ilegais ou dados pessoais de terceiros.\n' +
      '• Moderação de fotos: As imagens devem ter boa resolução, boa iluminação e respeitar os termos de uso. Fotos que contenham terceiros sem autorização ou menores de idade são estritamente proibidas.\n' +
      '• O processo de moderação ocorre com rapidez e o status é atualizado diretamente no seu painel.',
    contentEn:
      'Moderation ensures an elegant and trustworthy environment for all professionals:\n\n' +
      '• Text moderation: Vulgar terminology, hate speech, unlawful explicit offers, or third-party private information are not permitted.\n' +
      '• Photo moderation: Images must feature good lighting, clear quality, and respect platform policies. Photos containing unauthorized third parties or minors are strictly forbidden.\n' +
      '• Moderation reviews are swift and statuses update directly inside your dashboard.',
    keywords: ['moderacao', 'regras', 'diretrizes', 'texto', 'analise', 'editorial', 'moderation', 'policy'],
    relatedLinks: [
      { labelPt: 'Termos de Uso', labelEn: 'Terms of Use', href: '/termos' },
    ],
  },
  {
    id: 'problemas-tecnicos-navegador',
    categoryId: 'problemas-tecnicos',
    titlePt: 'Estou com dificuldades para carregar fotos ou acessar o site',
    titleEn: 'Trouble uploading photos or accessing the website',
    summaryPt: 'Orientações rápidas para resolver problemas comuns de conexão e cache.',
    summaryEn: 'Quick troubleshooting steps for connection or browser caching issues.',
    contentPt:
      'Se você encontrar instabilidades técnicas:\n\n' +
      '• Navegadores recomendados: Utilize versões atualizadas do Google Chrome, Safari ou Firefox no celular ou computador.\n' +
      '• Limpeza de cache: Limpar o cache do navegador ou tentar em uma aba anônima pode resolver erros de sessão.\n' +
      '• Tamanho de imagem: Certifique-se de que a foto tem menos de 15 MB e está no formato JPEG, PNG ou WebP.\n' +
      '• Conexão: Evite conexões públicas instáveis durante uploads de fotos ou verificação facial.',
    contentEn:
      'If you encounter technical issues:\n\n' +
      '• Recommended browsers: Use updated versions of Google Chrome, Safari, or Firefox on mobile or desktop.\n' +
      '• Clear cache: Clearing browser cache or using private browsing mode frequently resolves session glitches.\n' +
      '• File sizes: Ensure photos are under 15 MB and in JPEG, PNG, or WebP format.\n' +
      '• Stable connection: Avoid unstable public Wi-Fi during photo uploads or selfie verification.',
    keywords: ['problema', 'erro', 'upload', 'foto', 'navegador', 'cache', 'suporte', 'technical', 'bug'],
    relatedLinks: [
      { labelPt: 'Central de Ajuda', labelEn: 'Help Center', href: '/ajuda' },
    ],
  },
]

export const ESSENTIAL_HELP_SLUGS = [
  'como-publicar-meu-perfil',
  'verificacao-de-identidade-e-maioridade',
  'o-que-fica-publico-e-o-que-fica-privado',
  'fotos-e-videos-envio-aprovacao-e-limites',
  'perfil-publico-vs-vip',
  'como-pausar-ou-reativar-meu-perfil',
] as const

export type EssentialHelpSlug = (typeof ESSENTIAL_HELP_SLUGS)[number]

export function isEssentialHelpSlug(slug: string): slug is EssentialHelpSlug {
  return (ESSENTIAL_HELP_SLUGS as readonly string[]).includes(slug)
}

export function getHelpArticleBySlug(slug: string): HelpArticle | undefined {
  return STARTER_FAQS.find((a) => a.slug === slug)
}

export function getHelpCategoryById(categoryId: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.id === categoryId)
}

export function getRelatedHelpArticles(article: HelpArticle, limit = 3): HelpArticle[] {
  if (article.relatedArticleIds && article.relatedArticleIds.length > 0) {
    const matched = article.relatedArticleIds
      .map((id) => STARTER_FAQS.find((a) => a.id === id))
      .filter((a): a is HelpArticle => Boolean(a && a.slug))
    if (matched.length > 0) {
      return matched.slice(0, limit)
    }
  }

  return STARTER_FAQS.filter((a) => a.id !== article.id && a.slug).slice(0, limit)
}
