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
    titleEn: 'First steps',
    descriptionPt: 'Como criar sua conta e colocar seu perfil no ar na Velvet.',
    descriptionEn: 'How to create your account and get your profile live on Velvet.',
    icon: '✦',
  },
  {
    id: 'conta-e-acesso',
    titlePt: 'Conta e acesso',
    titleEn: 'Account and access',
    descriptionPt: 'Acesso à sua conta, recuperação de senha e dados de login.',
    descriptionEn: 'Account login, password recovery, and sign-in details.',
    icon: '◈',
  },
  {
    id: 'perfil',
    titlePt: 'Meu perfil',
    titleEn: 'My profile',
    descriptionPt: 'Como organizar suas informações, biografia e pausar sua exibição.',
    descriptionEn: 'How to arrange your bio, details, and pause your visibility.',
    icon: '◇',
  },
  {
    id: 'fotos-e-videos',
    titlePt: 'Fotos e vídeos',
    titleEn: 'Photos and videos',
    descriptionPt: 'Como adicionar fotos e vídeos, escolher a foto principal e organizar suas mídias.',
    descriptionEn: 'How to upload photos and videos, choose your cover, and organize media.',
    icon: '▣',
  },
  {
    id: 'verificacao',
    titlePt: 'Verificação',
    titleEn: 'Verification',
    descriptionPt: 'Confirmação de identidade e maioridade para publicar seu perfil com segurança.',
    descriptionEn: 'Identity and age verification to safely publish your profile.',
    icon: '✓',
  },
  {
    id: 'servicos-e-regioes',
    titlePt: 'Contato e regiões',
    titleEn: 'Contact and areas',
    descriptionPt: 'Como escolher seus canais de contato direto e onde você atende.',
    descriptionEn: 'How to choose your direct contact channels and service locations.',
    icon: '⌖',
  },
  {
    id: 'clientes-vip',
    titlePt: 'Quem pode ver meu perfil',
    titleEn: 'Who can see my profile',
    descriptionPt: 'Como definir a visibilidade do seu perfil entre público geral e assinantes VIP.',
    descriptionEn: 'How to set your profile visibility between public visitors and VIP subscribers.',
    icon: '★',
  },
  {
    id: 'avaliacoes',
    titlePt: 'Avaliações',
    titleEn: 'Reviews',
    descriptionPt: 'Como as avaliações funcionam no seu perfil e como são analisadas.',
    descriptionEn: 'How client reviews work on your profile and how they are reviewed.',
    icon: '♦',
  },
  {
    id: 'planos',
    titlePt: 'Plano e publicação',
    titleEn: 'Plan and publication',
    descriptionPt: 'O que está incluído no seu plano e o que precisa estar em dia para seu perfil ficar visível.',
    descriptionEn: 'What is included in your plan and what keeps your profile live.',
    icon: '◬',
  },
  {
    id: 'seguranca-e-privacidade',
    titlePt: 'Segurança e privacidade',
    titleEn: 'Security and privacy',
    descriptionPt: 'O que aparece no seu perfil público e o que permanece protegido e privado.',
    descriptionEn: 'What is shown on your public profile and what stays protected and private.',
    icon: '◎',
  },
  {
    id: 'moderacao',
    titlePt: 'Moderação',
    titleEn: 'Moderation',
    descriptionPt: 'Critérios simples para textos, fotos e vídeos antes de ficarem visíveis.',
    descriptionEn: 'Clear guidelines for texts, photos, and videos before they appear publicly.',
    icon: '§',
  },
  {
    id: 'problemas-tecnicos',
    titlePt: 'Problemas técnicos',
    titleEn: 'Technical issues',
    descriptionPt: 'Dicas práticas para resolver dificuldades de acesso ou envio de fotos.',
    descriptionEn: 'Practical tips to resolve sign-in troubles or media upload issues.',
    icon: '⊙',
  },
]

export const STARTER_FAQS: HelpArticle[] = [
  {
    id: 'como-publicar-perfil',
    slug: 'como-publicar-meu-perfil',
    categoryId: 'primeiros-passos',
    titlePt: 'Como colocar meu perfil no ar',
    titleEn: 'How to get my profile live',
    summaryPt: 'Veja o que precisa estar pronto antes que seu perfil possa ser publicado.',
    summaryEn: 'See what needs to be ready before your profile can go live.',
    contentPt:
      'Para que seu perfil fique visível na Velvet, você só precisa concluir algumas etapas simples:\n\n' +
      '1. Verificação 18+: Confirmação de identidade e maioridade concluída para a segurança da plataforma.\n' +
      '2. Informações do perfil: Seu nome artístico, frase de apresentação e biografia preenchidos.\n' +
      '3. Contato direto: Pelo menos um canal de contato ativo (WhatsApp, telefone ou Telegram).\n' +
      '4. Foto aprovada: Ao menos uma foto aprovada pela moderação e definida como principal.\n' +
      '5. Locais de atendimento: Ao menos um bairro ou cidade onde você atende.\n' +
      '6. Apresentação alinhada: Texto de acordo com as regras de respeito e convivência da comunidade.\n' +
      '7. Plano ativo: Ter um plano ativo (ou acesso promocional de Fundadora).\n\n' +
      'Você pode acompanhar cada uma dessas etapas diretamente na página de revisão antes de publicar. Quando tudo estiver pronto, seu perfil entra no ar imediatamente.',
    contentEn:
      'To make your profile visible on Velvet, you only need to complete a few simple steps:\n\n' +
      '1. 18+ Verification: Confirmation of identity and legal age completed for platform safety.\n' +
      '2. Profile details: Your stage name, headline, and bio filled in.\n' +
      '3. Direct contact: At least one active contact channel (WhatsApp, direct phone, or Telegram).\n' +
      '4. Approved cover photo: At least one photo approved by moderation and set as primary.\n' +
      '5. Service locations: At least one neighborhood or city where you are available.\n' +
      '6. Respectful bio: Presentation text that follows community guidelines.\n' +
      '7. Active plan: An active plan (or Founder promotional access).\n\n' +
      'You can follow each of these steps on the review screen before publishing. Once everything is ready, your profile goes live immediately.',
    keywords: ['publicar', 'perfil', 'ativar', 'como começar', 'etapas', 'publicar perfil', 'publish', 'go live', 'profile'],
    relatedLinks: [
      { labelPt: 'Guia passo a passo', labelEn: 'Step-by-step guide', href: '/como-comecar' },
      { labelPt: 'Anuncie na Velvet', labelEn: 'Advertise on Velvet', href: '/anuncie' },
      { labelPt: 'Criar minha conta', labelEn: 'Create my account', href: '/signup' },
    ],
    relatedArticleIds: ['verificacao-18-como-funciona', 'fotos-e-videos-diretrizes', 'o-que-fica-publico-privado'],
  },
  {
    id: 'o-que-fica-publico-privado',
    slug: 'o-que-fica-publico-e-o-que-fica-privado',
    categoryId: 'seguranca-e-privacidade',
    titlePt: 'O que aparece no meu perfil e o que fica privado?',
    titleEn: 'What appears on my profile and what stays private?',
    summaryPt: 'Entenda quais informações você escolhe mostrar e quais dados não fazem parte do seu perfil público.',
    summaryEn: 'Understand what information you choose to display and what data never appears on your public profile.',
    contentPt:
      'Na Velvet, você tem clareza sobre o que é exibido para os visitantes e o que fica protegido:\n\n' +
      '• O que nunca aparece publicamente: Seu nome civil, CPF, documentos enviados na verificação, fotos de verificação (selfie de documento) e endereço residencial. Essas informações servem unicamente para comprovar que você é maior de 18 anos e titular do documento, permanecendo guardadas em ambiente protegido.\n\n' +
      '• O que você escolhe mostrar: Seu nome artístico, fotos e vídeos aprovados, biografia, bairros e cidades onde atende e os canais de contato que você cadastrar.\n\n' +
      '• Detalhes opcionais: Idade, altura e peso são escolhas suas. Você decide se deseja exibir ou ocultar cada um desses itens no seu perfil.\n\n' +
      'Você pode revisar e alterar essas preferências no seu painel a qualquer momento.',
    contentEn:
      'On Velvet, you have total clarity on what is shown to visitors and what stays protected:\n\n' +
      '• What never appears publicly: Your legal name, government ID/CPF, verification documents, verification selfie, and residential address. This information is used solely to verify you are 18 or older and the rightful document holder, remaining safely protected.\n\n' +
      '• What you choose to show: Your stage name, approved photos and videos, biography, service areas, and the contact channels you enable.\n\n' +
      '• Optional details: Age, height, and weight are entirely up to you. You decide whether to show or hide each detail on your profile.\n\n' +
      'You can review and update these preferences anytime directly from your dashboard.',
    keywords: ['privacidade', 'publico', 'privado', 'nome civil', 'cpf', 'documentos', 'seguranca', 'privacy', 'confidentiality'],
    relatedLinks: [
      { labelPt: 'Política de Privacidade', labelEn: 'Privacy Policy', href: '/privacidade' },
      { labelPt: 'Central de Segurança', labelEn: 'Safety Center', href: '/seguranca' },
    ],
    relatedArticleIds: ['verificacao-18-como-funciona', 'public-vs-vip-only', 'pausar-ou-ocultar-perfil'],
  },
  {
    id: 'verificacao-18-como-funciona',
    slug: 'verificacao-de-identidade-e-maioridade',
    categoryId: 'verificacao',
    titlePt: 'Como funciona a verificação de identidade e maioridade?',
    titleEn: 'How does identity and age verification work?',
    summaryPt: 'Para publicar seu perfil, você precisa confirmar sua identidade e comprovar que tem 18 anos ou mais. Veja como funciona essa etapa e quais informações fazem parte da verificação.',
    summaryEn: 'To publish your profile, you need to confirm your identity and verify that you are 18 or older. Learn how this step works and what is involved.',
    contentPt:
      'A verificação de identidade e maioridade é um cuidado essencial para proteger você e manter a comunidade segura:\n\n' +
      '• Como funciona: Você tira uma foto de um documento oficial com foto (como RG ou CNH) e faz uma rápida validação facial pelo celular para confirmar que o documento pertence a você.\n' +
      '• O que é confirmado: O procedimento verifica apenas se você tem 18 anos ou mais e confirma a titularidade do documento.\n' +
      '• Proteção dos seus dados: Seus documentos e fotos de verificação não são exibidos no seu perfil público nem compartilhados com visitantes ou clientes.\n' +
      '• Resultado no painel: Assim que a análise for concluída, o status de verificação é atualizado no seu painel. Se a foto do documento estiver ilegível ou cortada, o sistema orientará você a tentar novamente.',
    contentEn:
      'Identity and age verification is an essential standard to protect you and maintain a safe community:\n\n' +
      '• How it works: You take a clear photo of an official government photo ID (such as a driver license or national ID) and complete a quick facial check on your phone to confirm document ownership.\n' +
      '• What is confirmed: The process only verifies that you are 18 or older and that you are the rightful holder of the ID.\n' +
      '• Document protection: Your verification documents and facial check are never displayed on your public profile nor shared with visitors or clients.\n' +
      '• Fast results: Once the review is complete, your verification status updates automatically on your dashboard. If a document photo is blurry or cropped, guidance will be provided to try again.',
    keywords: ['verificacao', '18+', 'maioridade', 'identidade', 'documento', 'idade', 'verification', 'age', 'id'],
    relatedLinks: [
      { labelPt: 'Central de Segurança', labelEn: 'Safety Center', href: '/seguranca' },
      { labelPt: 'Guia passo a passo', labelEn: 'Step-by-step guide', href: '/como-comecar' },
    ],
    relatedArticleIds: ['o-que-fica-publico-privado', 'como-publicar-perfil', 'public-vs-vip-only'],
  },
  {
    id: 'fotos-e-videos-diretrizes',
    slug: 'fotos-e-videos-envio-aprovacao-e-limites',
    categoryId: 'fotos-e-videos',
    titlePt: 'Como enviar fotos e vídeos para o meu perfil?',
    titleEn: 'How to upload photos and videos to my profile?',
    summaryPt: 'Veja como adicionar suas mídias, escolher a foto principal e entender o que acontece antes de elas ficarem visíveis.',
    summaryEn: 'Learn how to add your media, choose your primary photo, and understand what happens before it goes live.',
    contentPt:
      'As fotos e os vídeos são fundamentais para valorizar seu perfil e chamar a atenção dos visitantes:\n\n' +
      '• Como enviar: No seu painel, acesse a área de fotos para fazer o upload de imagens nos formatos JPEG, PNG ou WebP (de até 15 MB cada) e vídeos curtos.\n' +
      '• Foto principal: Você escolhe uma das fotos aprovadas para ser a imagem de capa do seu perfil. Ela será a foto de destaque que aparece nas buscas por cidade e bairro.\n' +
      '• Análise prévia: Para manter um ambiente elegante e de qualidade, as fotos passam por uma rápida análise de moderação antes de aparecerem para o público. Enquanto isso, elas ficam visíveis apenas para você no painel.\n' +
      '• Se precisar de ajustes: Caso alguma foto não atenda às orientações de qualidade ou às regras da comunidade, você receberá um aviso no painel explicando o motivo para poder substituí-la tranquilamente.',
    contentEn:
      'Photos and videos are central to presenting your profile and catching the attention of visitors:\n\n' +
      '• How to upload: In your dashboard, visit the photos section to upload JPEG, PNG, or WebP images (up to 15 MB each) and short videos.\n' +
      '• Cover photo: You choose one approved photo as your primary profile cover. This is the main photo shown in city and neighborhood searches.\n' +
      '• Review before publishing: To maintain an elegant and quality atmosphere, media items undergo a quick moderation review before appearing publicly. During review, they remain visible only to you.\n' +
      '• If adjustments are needed: If a photo does not meet quality guidelines or community rules, a note will appear in your dashboard so you can easily replace it.',
    keywords: ['fotos', 'videos', 'foto principal', 'capa', 'galeria', 'upload', 'media', 'photos'],
    relatedLinks: [
      { labelPt: 'Guia passo a passo', labelEn: 'Step-by-step guide', href: '/como-comecar' },
    ],
    relatedArticleIds: ['como-publicar-perfil', 'public-vs-vip-only', 'o-que-fica-publico-privado'],
  },
  {
    id: 'public-vs-vip-only',
    slug: 'perfil-publico-vs-vip',
    categoryId: 'clientes-vip',
    titlePt: 'Quem pode ver meu perfil?',
    titleEn: 'Who can see my profile?',
    summaryPt: 'Entenda as opções disponíveis para escolher como seu perfil pode ser encontrado e visualizado.',
    summaryEn: 'Understand the options available to choose how your profile is discovered and viewed.',
    contentPt:
      'Você decide como deseja apresentar seu perfil na Velvet:\n\n' +
      '• Perfil Público: Fica visível para qualquer pessoa que acesse a Velvet. Aparece normalmente nas buscas por cidade, filtros de localização e nas páginas públicas do site.\n\n' +
      '• Perfil Exclusivo para Assinantes VIP: Fica visível apenas para clientes com assinatura VIP ativa e confirmada na plataforma. Visitantes comuns ou cadastros sem assinatura VIP não conseguem ver suas fotos, informações ou formas de contato.\n\n' +
      'Você pode alternar entre essas opções sempre que quiser nas configurações do seu perfil, escolhendo o nível de exposição mais confortável para o seu momento.',
    contentEn:
      'You decide how your profile is presented on Velvet:\n\n' +
      '• Public Profile: Visible to anyone browsing Velvet. Appears normally in city searches, neighborhood filters, and public catalog pages.\n\n' +
      '• VIP Subscribers Only: Visible exclusively to clients with an active, confirmed VIP subscription. Regular visitors or accounts without a VIP subscription cannot view your photos, details, or contact options.\n\n' +
      'You can switch between these settings anytime in your profile options, choosing the visibility level that feels right for you.',
    keywords: ['quem pode ver', 'visibilidade', 'publico', 'vip', 'exclusivo', 'filtros', 'visibility', 'public', 'audience'],
    relatedLinks: [
      { labelPt: 'Guia passo a passo', labelEn: 'Step-by-step guide', href: '/como-comecar' },
      { labelPt: 'Acessar painel', labelEn: 'Go to dashboard', href: '/dashboard' },
    ],
    relatedArticleIds: ['o-que-fica-publico-privado', 'pausar-ou-ocultar-perfil', 'como-publicar-perfil'],
  },
  {
    id: 'pausar-ou-ocultar-perfil',
    slug: 'como-pausar-ou-reativar-meu-perfil',
    categoryId: 'perfil',
    titlePt: 'Como pausar ou voltar a exibir meu perfil?',
    titleEn: 'How to pause or reactivate my profile?',
    summaryPt: 'Se precisar ficar um período fora da descoberta, veja como pausar seu perfil e como voltar quando quiser.',
    summaryEn: 'If you need time away from discovery, see how to pause your profile and return whenever you want.',
    contentPt:
      'Se você for viajar, tirar férias ou simplesmente preferir uma pausa nos contatos, você pode pausar seu perfil a qualquer momento:\n\n' +
      '• Como pausar: No seu painel de controle, você encontra a opção de alterar a exibição do perfil para pausado.\n' +
      '• O que acontece enquanto estiver pausado: Seu perfil é retirado imediatamente das buscas públicas e das páginas de bairros. Ninguém conseguirá encontrar seu anúncio durante esse período.\n' +
      '• Suas informações continuam guardadas: Todas as suas fotos aprovadas, biografia, preferências e histórico permanecem salvos com segurança. Você não precisa refazer nada.\n' +
      '• Como voltar: Quando quiser retornar aos atendimentos, basta reativar a exibição no painel e seu perfil voltará a aparecer nas buscas normalmente.',
    contentEn:
      'If you are traveling, taking time off, or simply want a break from new inquiries, you can pause your profile anytime:\n\n' +
      '• How to pause: In your dashboard, you will find an option to switch your profile status to paused.\n' +
      '• What happens while paused: Your profile is immediately removed from public searches and neighborhood listings. No one can find your profile during this time.\n' +
      '• Your information stays saved: All approved photos, your bio, preferences, and settings remain securely preserved. You never have to re-enter anything.\n' +
      '• How to return: When you are ready to welcome clients again, simply reactivate visibility in your dashboard and your profile returns to search results.',
    keywords: ['pausar', 'pausado', 'reativar', 'ferias', 'ocultar', 'voltar', 'pause', 'reactivate', 'hide'],
    relatedLinks: [
      { labelPt: 'Acessar painel', labelEn: 'Go to dashboard', href: '/dashboard' },
    ],
    relatedArticleIds: ['como-publicar-perfil', 'public-vs-vip-only', 'o-que-fica-publico-privado'],
  },
  {
    id: 'como-funcionam-avaliacoes',
    categoryId: 'avaliacoes',
    titlePt: 'Como funcionam as avaliações na Velvet?',
    titleEn: 'How do reviews work on Velvet?',
    summaryPt: 'Entenda como as avaliações aparecem no seu perfil, quais regras se aplicam e como funciona a moderação.',
    summaryEn: 'Understand how reviews appear on your profile, what rules apply, and how moderation works.',
    contentPt:
      'As avaliações ajudam a construir confiança e destacam a qualidade do seu atendimento na plataforma:\n\n' +
      '• Quem pode avaliar: Apenas clientes com cadastro ativo e confirmado podem registrar avaliações sobre as experiências que tiveram.\n' +
      '• Análise de respeito e segurança: Cada avaliação passa por análise prévia antes de ser publicada. Não são permitidas ofensas, linguagem desrespeitosa, discriminação, chantagem ou exposição de dados pessoais.\n' +
      '• Onde acompanhar: Todas as avaliações recebidas ficam visíveis na seção de avaliações do seu painel, permitindo que você acompanhe o retorno do público.\n' +
      '• Solicitação de revisão: Caso você receba um comentário que desrespeite as regras de convivência da plataforma, é possível solicitar uma reanálise pela moderação diretamente pelo painel.',
    contentEn:
      'Reviews help build trust and highlight the quality of your client experience on the platform:\n\n' +
      '• Who can review: Only clients with an active, confirmed account can submit reviews about their experiences.\n' +
      '• Respect and safety moderation: Every review undergoes review before publication. Disrespectful language, harassment, discrimination, extortion, or disclosure of personal data are not permitted.\n' +
      '• Where to check: All received reviews appear in the reviews section of your dashboard, allowing you to track your feedback.\n' +
      '• Requesting a review: If you ever receive feedback that breaches community guidelines, you can request a moderation re-evaluation directly from your dashboard.',
    keywords: ['avaliacoes', 'opinioes', 'comentarios', 'reputacao', 'moderacao', 'reviews', 'feedback'],
    relatedLinks: [
      { labelPt: 'Termos de Uso', labelEn: 'Terms of Use', href: '/termos' },
    ],
  },
  {
    id: 'contato-direto-sem-intermediacao',
    categoryId: 'servicos-e-regioes',
    titlePt: 'Como as pessoas entram em contato comigo?',
    titleEn: 'How do people contact me?',
    summaryPt: 'Você escolhe os canais de contato que deseja disponibilizar no seu perfil. A conversa acontece diretamente entre vocês, e a Velvet não participa do que for combinado.',
    summaryEn: 'You choose the contact channels you want on your profile. Conversations happen directly between you, and Velvet does not participate in any arrangements.',
    contentPt:
      'Na Velvet, a comunicação é sempre direta entre você e os clientes, com independência:\n\n' +
      '• Seus canais de contato: Você escolhe quais meios deseja divulgar no seu perfil (como WhatsApp, telefone direto ou Telegram). Os visitantes entram em contato diretamente com você pelo canal que você definir.\n' +
      '• Sem intermediação: A Velvet não participa das conversas, não agenda horários e não interfere nos acordos feitos entre você e quem te procura.\n' +
      '• Onde você atende: No painel, você seleciona os bairros e cidades onde atende, facilitando para que os clientes da sua região encontrem seu perfil.\n' +
      '• Seus valores e ganhos: Você define livremente seus horários, regras de atendimento e valores. A Velvet não cobra comissões nem porcentagens sobre o que você recebe: você fica com 100% dos seus ganhos.',
    contentEn:
      'On Velvet, communication is always direct between you and your clients, with complete independence:\n\n' +
      '• Your contact channels: You choose which options to display on your profile (such as WhatsApp, direct phone, or Telegram). Visitors reach out directly to you via your preferred channels.\n' +
      '• No intermediaries: Velvet does not participate in conversations, does not book appointments, and never interferes with any arrangements made between you and those who contact you.\n' +
      '• Where you meet: In your dashboard, you choose the neighborhoods and cities where you are available, helping local clients find your profile easily.\n' +
      '• Your rates and earnings: You freely set your schedule, availability, and rates. Velvet takes no commission or percentage on what you earn from your independent services: you keep 100% of your earnings.',
    keywords: ['contato', 'whatsapp', 'telefone', 'telegram', 'direto', 'comissao', 'regioes', 'contact', 'direct'],
    relatedLinks: [
      { labelPt: 'Anuncie na Velvet', labelEn: 'Advertise on Velvet', href: '/anuncie' },
      { labelPt: 'Guia passo a passo', labelEn: 'Step-by-step guide', href: '/como-comecar' },
    ],
  },
  {
    id: 'problemas-de-acesso-recuperacao',
    categoryId: 'conta-e-acesso',
    titlePt: 'Esqueci minha senha ou não consigo entrar',
    titleEn: 'I forgot my password or cannot sign in',
    summaryPt: 'Veja como recuperar o acesso à sua conta e o que conferir quando algo não estiver funcionando.',
    summaryEn: 'Learn how to recover access to your account and what to check when something is not working.',
    contentPt:
      'Se você perdeu sua senha ou está com dificuldades para entrar na sua conta:\n\n' +
      '1. Recuperar senha: Na página de login, clique em "Esqueci minha senha".\n' +
      '2. Digite seu e-mail: Insira o endereço de e-mail que você utilizou ao criar sua conta.\n' +
      '3. Verifique sua caixa de entrada: Você receberá um e-mail com um link seguro para criar uma nova senha.\n' +
      '4. Confira o spam: Caso a mensagem não chegue em poucos minutos, confira também sua pasta de lixo eletrônico ou spam.\n' +
      '5. Crie a nova senha: Ao clicar no link recebido, defina uma nova senha e use-a para entrar normalmente.\n\n' +
      'Se você não tiver mais acesso ao e-mail cadastrado, confira se não digitou com algum erro antes de tentar novamente.',
    contentEn:
      'If you forgot your password or are having trouble signing in:\n\n' +
      '1. Reset password: On the login page, click "Forgot password".\n' +
      '2. Enter your email: Enter the email address you used when signing up.\n' +
      '3. Check your inbox: You will receive an email with a secure link to create a new password.\n' +
      '4. Check spam folder: If the message does not appear within a few minutes, check your junk or spam folder.\n' +
      '5. Set your new password: Click the link, choose a new password, and sign in smoothly.\n\n' +
      'If you no longer have access to the email address you registered with, double-check that there were no typos in the address you entered.',
    keywords: ['senha', 'recuperar', 'esqueci a senha', 'login', 'acesso', 'entrar', 'password', 'recovery'],
    relatedLinks: [
      { labelPt: 'Recuperar senha', labelEn: 'Reset password', href: '/forgot-password' },
      { labelPt: 'Entrar na conta', labelEn: 'Sign in', href: '/login' },
    ],
  },
  {
    id: 'planos-e-direito-publicacao',
    categoryId: 'planos',
    titlePt: 'Como meu plano se relaciona com a publicação do perfil?',
    titleEn: 'How does my plan relate to profile publication?',
    summaryPt: 'Veja o que está incluído no seu plano e quais condições precisam estar em dia para seu perfil continuar publicado.',
    summaryEn: 'See what is included in your plan and what conditions need to be in order for your profile to stay published.',
    contentPt:
      'O plano mantém seu perfil ativo e visível para quem procura profissionais na Velvet:\n\n' +
      '• O que o plano oferece: Ao assinar um plano (ou durante o acesso promocional de Fundadora), seu perfil pode ser publicado e aparecer nas buscas por cidade e bairro assim que o cadastro e a verificação estiverem concluídos.\n' +
      '• Acompanhamento simples: Você pode conferir a situação do seu plano, datas de renovação e detalhes da assinatura a qualquer momento na área de plano do seu painel.\n' +
      '• Se o plano vencer: Caso o período do plano termine, seu perfil sai temporariamente das buscas públicas. Porém, todas as suas fotos, textos e configurações continuam guardados com segurança.\n' +
      '• Para voltar a exibir: Basta renovar seu plano no painel para que seu perfil volte a ser exibido para os visitantes exatamente como estava.',
    contentEn:
      'Your plan keeps your profile active and visible to visitors searching on Velvet:\n\n' +
      '• What your plan provides: When you subscribe to a plan (or during the Founder promotional period), your profile can go live and appear in searches once registration and verification are complete.\n' +
      '• Easy monitoring: You can check your plan details, renewal dates, and subscription status anytime in the plan section of your dashboard.\n' +
      '• If your plan expires: If your plan period ends, your profile is temporarily hidden from public searches. However, all your photos, texts, and settings remain safely stored.\n' +
      '• Restoring visibility: Simply renew your plan from the dashboard to make your profile live again exactly as it was.',
    keywords: ['plano', 'publicacao', 'visibilidade', 'renovacao', 'assinatura', 'fundadora', 'plan', 'billing', 'subscription'],
    relatedLinks: [
      { labelPt: 'Como começar', labelEn: 'How to start', href: '/como-comecar' },
      { labelPt: 'Anuncie na Velvet', labelEn: 'Advertise on Velvet', href: '/anuncie' },
    ],
  },
  {
    id: 'moderacao-de-conteudo-regras',
    categoryId: 'moderacao',
    titlePt: 'O que a Velvet analisa antes de publicar um conteúdo?',
    titleEn: 'What does Velvet review before publishing content?',
    summaryPt: 'Entenda as principais regras para textos, fotos e vídeos e o que pode fazer um conteúdo precisar de ajustes antes de aparecer.',
    summaryEn: 'Understand the key rules for texts, photos, and videos, and what might require adjustments before going live.',
    contentPt:
      'A análise de moderação existe para manter a Velvet um espaço agradável, seguro e respeitoso para todas as profissionais:\n\n' +
      '• Apresentação de texto: Sua biografia e frase de destaque devem falar sobre você e seu atendimento com clareza. Não são permitidos termos ofensivos, agressivos, discriminatórios ou divulgação de dados privados de terceiros.\n' +
      '• Fotos e vídeos: As mídias enviadas devem apresentar boa nitidez e iluminação. É estritamente proibido publicar fotos ou vídeos que contenham menores de idade ou terceiros sem autorização.\n' +
      '• Notificação no painel: A moderação analisa novos envios com agilidade. Se algum texto ou foto precisar de ajustes para cumprir as regras, uma mensagem clara aparecerá no seu painel indicando o que você pode ajustar.\n\n' +
      'Você pode editar seus textos e reenviar suas fotos a qualquer momento.',
    contentEn:
      'Moderation exists to keep Velvet an elegant, safe, and respectful environment for all professionals:\n\n' +
      '• Presentation text: Your bio and headline should describe you and your services clearly. Offensive terms, aggressive remarks, discrimination, or third-party private data are not allowed.\n' +
      '• Photos and videos: Uploaded media should feature good lighting and clarity. Content featuring minors or third parties without consent is strictly prohibited.\n' +
      '• Dashboard updates: Moderation reviews new submissions promptly. If any text or photo needs adjustments, a clear note will appear on your dashboard explaining what to update.\n\n' +
      'You can edit your text and upload revised photos whenever you wish.',
    keywords: ['moderacao', 'regras', 'fotos', 'textos', 'analise', 'conteudo', 'moderation', 'guidelines'],
    relatedLinks: [
      { labelPt: 'Termos de Uso', labelEn: 'Terms of Use', href: '/termos' },
      { labelPt: 'Central de Segurança', labelEn: 'Safety Center', href: '/seguranca' },
    ],
  },
  {
    id: 'problemas-tecnicos-navegador',
    categoryId: 'problemas-tecnicos',
    titlePt: 'Não consigo enviar fotos ou acessar o site. O que faço?',
    titleEn: 'I cannot upload photos or access the site. What do I do?',
    summaryPt: 'Confira algumas verificações simples que podem resolver os problemas mais comuns antes de tentar novamente.',
    summaryEn: 'Check a few simple steps that can resolve the most common issues before trying again.',
    contentPt:
      'Se você encontrar alguma dificuldade ao navegar no site ou enviar fotos, algumas conferências simples costumam resolver a maioria das situações:\n\n' +
      '1. Conexão de internet: Verifique se sua conexão está estável. Fotos de alta qualidade ou a verificação facial precisam de uma internet com bom sinal.\n' +
      '2. Tamanho e formato das imagens: Confira se suas fotos estão nos formatos JPEG, PNG ou WebP e se cada arquivo tem no máximo 15 MB.\n' +
      '3. Navegador atualizado: Recomendamos usar versões recentes do Chrome, Safari ou Firefox no celular ou computador.\n' +
      '4. Aba privativa ou recarregar: Abrir o site em uma aba anônima ou recarregar a página ajuda a descartar arquivos temporários que possam estar desatualizados no navegador.\n' +
      '5. Fechar e reabrir: Se o aplicativo do navegador estiver travado, feche-o completamente e tente novamente.',
    contentEn:
      'If you encounter any trouble navigating the site or uploading photos, a few simple checks usually resolve most issues:\n\n' +
      '1. Internet connection: Make sure your connection is stable. High-resolution photos and facial verification require good network signal.\n' +
      '2. Image size and format: Ensure your photos are in JPEG, PNG, or WebP format and do not exceed 15 MB each.\n' +
      '3. Updated browser: We recommend using current versions of Chrome, Safari, or Firefox on mobile or desktop.\n' +
      '4. Private window or refresh: Opening the page in a private browsing tab or refreshing helps clear temporary files that might be out of date.\n' +
      '5. Close and reopen: If your mobile browser feels unresponsive, fully close the app and try opening it again.',
    keywords: ['problemas', 'fotos', 'erro', 'upload', 'navegador', 'tentar novamente', 'technical', 'help'],
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
