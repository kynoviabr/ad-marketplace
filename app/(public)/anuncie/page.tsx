import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'
import { JsonLd } from '@/components/seo/json-ld'
import { getSeoConfig } from '@/modules/seo/config'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const en = locale === 'en'

  return {
    title: {
      absolute: en
        ? 'Advertise on velvet. | Professional Profiles'
        : 'Anuncie na velvet. | Perfis Profissionais',
    },
    description: en
      ? 'Create your space, present your work elegantly, and manage your profile independently on velvet.'
      : 'Crie seu espaço, apresente seu trabalho com elegância e gerencie seu perfil com autonomia na velvet.',
    alternates: {
      canonical: buildCanonicalUrl('/anuncie', undefined, locale),
      languages: buildLanguageAlternates('/anuncie'),
    },
  }
}

export default async function AdvertisePage() {
  const locale = await getRequestLocale()
  const en = locale === 'en'

  const signupHref = localizePathname('/signup', locale)
  const canonicalUrl = buildCanonicalUrl('/anuncie', undefined, locale)
  const siteUrl = getSeoConfig().siteUrl

  const content = {
    hero: {
      overline: en ? 'FOR PROFESSIONALS' : 'PARA PROFISSIONAIS',
      headline: en ? 'Your space. Your profile. Your connections.' : 'Seu espaço. Seu perfil. Suas conexões.',
      points: en
        ? [
            'Create and manage your own professional profile with total autonomy.',
            'Discerning clients discover your presentation through velvet. curation.',
            'Direct contact happens through channels enabled by you, without intermediaries.',
            'velvet. is an independent discovery platform and does not intermediate services.',
          ]
        : [
            'Crie e gerencie seu próprio perfil profissional com total autonomia.',
            'Clientes selecionados descobrem sua apresentação pela curadoria da velvet.',
            'O contato acontece diretamente pelos canais habilitados por você, sem intermediários.',
            'A velvet. é uma plataforma de descoberta e não intermedia a prestação de serviços.',
          ],
      primaryCta: en ? 'Create my profile' : 'Criar meu perfil',
      secondaryCta: en ? 'How it works' : 'Como funciona',
      preview: {
        badge: en ? '18+ VERIFIED' : '18+ VERIFICADA',
        status: en ? 'Active on velvet.' : 'Ativo na velvet.',
        name: 'Helena',
        location: 'Jardins · São Paulo',
        channels: en ? 'Direct contact: WhatsApp · Phone' : 'Contato direto: WhatsApp · Telefone',
      },
    },
    howItWorks: {
      overline: en ? 'STEP BY STEP' : 'PASSO A PASSO',
      title: en ? 'How the journey works' : 'Como funciona a jornada',
      subtitle: en
        ? 'A transparent, structured path from registration to publication.'
        : 'Um caminho transparente e estruturado desde o cadastro até a publicação.',
      steps: en
        ? [
            { num: '01', title: 'Create account', desc: 'Sign up with email and password for private account management.' },
            { num: '02', title: 'Verify identity & legal age', desc: 'Mandatory, confidential 18+ verification before publication.' },
            { num: '03', title: 'Build profile', desc: 'Define your stage name, editorial bio, and preferences.' },
            { num: '04', title: 'Add photos & videos', desc: 'Upload high-resolution gallery photos and introductory videos.' },
            { num: '05', title: 'Set services & regions', desc: 'Select operating neighborhoods and structured service preferences.' },
            { num: '06', title: 'Submit for review', desc: 'Content and media guidelines moderation by our safety team.' },
            { num: '07', title: 'Publish', desc: 'Your profile goes live on velvet. discovery with direct contact.' },
          ]
        : [
            { num: '01', title: 'Criar conta', desc: 'Acesso seguro por e-mail e senha para gerenciar seu espaço com privacidade.' },
            { num: '02', title: 'Verificar identidade e maioridade', desc: 'Procedimento confidencial e obrigatório 18+ antes da publicação.' },
            { num: '03', title: 'Montar perfil', desc: 'Defina seu nome artístico, texto de apresentação e preferências.' },
            { num: '04', title: 'Adicionar fotos e vídeos', desc: 'Carregue fotografias de alta resolução e vídeos de introdução.' },
            { num: '05', title: 'Informar serviços e regiões', desc: 'Indique bairros em São Paulo e preferências de atendimento estruturadas.' },
            { num: '06', title: 'Enviar para análise', desc: 'Moderação criteriosa de conteúdo de acordo com as diretrizes da plataforma.' },
            { num: '07', title: 'Publicar', desc: 'Seu perfil passa a ser exibido na descoberta da velvet. com contato direto.' },
          ],
    },
    offers: {
      overline: en ? 'PROFILE CAPABILITIES' : 'RECURSOS DO PERFIL',
      title: en ? 'What the profile offers' : 'O que o seu perfil oferece',
      subtitle: en
        ? 'Clear and transparent: a dedicated presentation platform designed with elegance. We do not promise lead volumes, bookings, or income.'
        : 'Clareza e transparência: uma ferramenta completa pensada para sua apresentação com elegância. Não prometemos volume de contatos, reservas ou renda.',
      items: en
        ? [
            { title: 'Professional profile', desc: 'Editorial presentation with stage name, biography, languages, and characteristics.' },
            { title: 'Photos and videos', desc: 'Visual media gallery with smooth playback and protected file delivery.' },
            { title: 'Service areas', desc: 'Select zones and neighborhoods in São Paulo where you actually operate.' },
            { title: 'Structured preferences', desc: 'Define service styles and preferences clearly without ambiguities.' },
            { title: 'Real reviews', desc: 'Authentic reviews with professional response capability and moderation.' },
            { title: 'Direct contact', desc: 'Enabled channels (WhatsApp, phone, Telegram) for communication without platform fees.' },
            { title: 'Audience control', desc: 'Choose between open visibility (PUBLIC) or members-only access (VIP ONLY).' },
            { title: 'Profile management', desc: 'Edit details, update media, or pause visibility anytime from your dashboard.' },
          ]
        : [
            { title: 'Perfil profissional', desc: 'Apresentação editorial com nome artístico, biografia, idiomas e características.' },
            { title: 'Fotos e vídeos', desc: 'Galeria visual com reprodução fluida e entrega protegida de mídia.' },
            { title: 'Regiões de atendimento', desc: 'Escolha bairros e regiões em São Paulo onde você realmente atende.' },
            { title: 'Preferências estruturadas', desc: 'Defina estilos de atendimento e preferências com total clareza.' },
            { title: 'Avaliações reais', desc: 'Avaliações autênticas com direito de resposta da profissional e moderação.' },
            { title: 'Contato direto', desc: 'Canais habilitados por você (WhatsApp, telefone, Telegram) sem intermediários.' },
            { title: 'Controle de audiência', desc: 'Defina a visibilidade do seu perfil como aberta (PÚBLICO) ou restrita (VIP ONLY).' },
            { title: 'Gestão completa do perfil', desc: 'Atualize informações, altere fotos ou pause o perfil a qualquer momento no painel.' },
          ],
    },
    privacy: {
      overline: en ? 'VERIFICATION & PRIVACY' : 'SEGURANÇA E PRIVACIDADE',
      title: en ? '18+ Verification and privacy protection' : 'Verificação 18+ e privacidade rigorosa',
      cards: en
        ? [
            {
              title: 'Mandatory 18+ verification',
              paragraphs: [
                'Identity and legal age verification is an absolute requirement for every published profile. It safeguards our community and confirms legal compliance.',
                'The procedure is performed confidentially through a secure verification workflow. Verification status confirms adult eligibility without making external endorsements.',
              ],
            },
            {
              title: 'Strict civil data protection',
              paragraphs: [
                'Your civil name, government ID (CPF), identification documents, and biometric data are NEVER displayed publicly or shared with visitors.',
                'Your public profile uses strictly your stage name and the details you choose to share. Verification data is stored separately from public marketplace content.',
              ],
            },
          ]
        : [
            {
              title: 'Verificação obrigatória 18+',
              paragraphs: [
                'A confirmação de identidade e maioridade é exigência inegociável para publicação. Ela protege a comunidade e garante conformidade legal estrita.',
                'O procedimento é conduzido de forma confidencial e digital. A verificação confirma a maioridade sem envolver promessas de serviços ou encontros.',
              ],
            },
            {
              title: 'Proteção total dos dados civis',
              paragraphs: [
                'Seu nome civil, CPF, fotos de documentos e dados de verificação NUNCA são publicados ou compartilhados com clientes ou visitantes.',
                'Seu perfil público exibe exclusivamente seu nome artístico e o que você decidir compartilhar. Os registros de verificação ficam totalmente isolados do conteúdo público.',
              ],
            },
          ],
    },
    independence: {
      overline: en ? 'PLATFORM BOUNDARIES' : 'AUTONOMIA E INDEPENDÊNCIA',
      title: en ? 'Independence and transparency' : 'Independência e transparência',
      items: en
        ? [
            { title: 'Discovery platform', desc: 'velvet. is exclusively a technology platform for discovering verified profiles. We are not an agency or employer.' },
            { title: 'Professional autonomy', desc: 'Professionals act independently, defining their own schedules, conditions, and boundaries.' },
            { title: 'Direct communication', desc: 'Clients and professionals communicate directly. velvet. does not join or monitor private conversations.' },
            { title: 'No transaction intermediation', desc: 'velvet. charges no commissions on services and does not participate in negotiations or payments.' },
          ]
        : [
            { title: 'Plataforma de descoberta', desc: 'A velvet. é exclusivamente uma plataforma tecnológica para descoberta de perfis verificados. Não somos agência nem empregadora.' },
            { title: 'Autonomia profissional', desc: 'Profissionais atuam com total independência, definindo seus próprios horários, condições e limites.' },
            { title: 'Comunicação direta', desc: 'Clientes e profissionais conversam diretamente. A velvet. não participa nem monitora conversas privadas.' },
            { title: 'Sem intermediação de serviços', desc: 'A velvet. não cobra comissões sobre serviços e não participa de negociações financeiras entre as partes.' },
          ],
    },
    plans: {
      overline: en ? 'PLANS & ACCESS' : 'PLANOS E ACESSO',
      title: en ? 'Founder access: launch availability at no charge' : 'Posicionamento Founder: acesso sem custo no lançamento',
      planTitle: en ? 'Founder Launch Plan' : 'Plano Founder de Lançamento',
      price: en ? 'Free' : 'Gratuito',
      priceSub: en ? 'during launch phase' : 'durante a fase de lançamento',
      perks: en
        ? [
            'Complete verified professional profile',
            'Up to 10 photos in high resolution',
            'Up to 3 introduction videos',
            'Up to 5 service regions in São Paulo',
            'Authentic client reviews capability',
            'Audience control (PUBLIC / VIP ONLY)',
            'No monthly charges during launch phase',
            'Zero transaction fees or commission cuts',
          ]
        : [
            'Perfil profissional verificado completo',
            'Até 10 fotografias em alta resolução',
            'Até 3 vídeos de apresentação',
            'Até 5 regiões de atendimento em São Paulo',
            'Sistema de avaliações reais de clientes',
            'Controle de audiência (PÚBLICO / VIP ONLY)',
            'Sem mensalidade na fase de lançamento',
            'Sem comissão sobre serviços ou atendimento',
          ],
      note: en
        ? 'No payment provider is currently integrated. Access is provided under the Founder launch terms with no automatic charges or hidden fees.'
        : 'Nenhum provedor de pagamento está integrado no momento. O acesso é concedido nas condições de lançamento Founder, sem cobranças automáticas ou taxas ocultas.',
    },
    safety: {
      overline: en ? 'SAFETY & CONTROL' : 'SEGURANÇA E CONTROLE',
      title: en ? 'You in full command of your presence' : 'Você no comando da sua presença',
      items: en
        ? [
            { title: 'Visibility control', desc: 'Choose whether your profile is available to all visitors (PUBLIC) or reserved for members (VIP ONLY).' },
            { title: 'Pause anytime', desc: 'Temporarily hide your profile with a single click in your dashboard without losing your content.' },
            { title: 'Responsible moderation', desc: 'All uploaded media and profile updates undergo moderation to maintain space quality.' },
            { title: 'Reporting & support', desc: 'Report inappropriate behavior or abuse through our dedicated safety and moderation team.' },
          ]
        : [
            { title: 'Controle de visibilidade', desc: 'Escolha se seu perfil fica aberto a todos os visitantes (PÚBLICO) ou restrito a membros (VIP ONLY).' },
            { title: 'Pausa a qualquer momento', desc: 'Oculte seu perfil temporariamente com um clique no painel, preservando todo o seu histórico.' },
            { title: 'Moderação responsável', desc: 'Todas as fotos, vídeos e edições passam por moderação para manter a qualidade do catálogo.' },
            { title: 'Denúncias e suporte', desc: 'Canais ativos para reportar problemas e condutas abusivas com acompanhamento pela equipe.' },
          ],
    },
    finalCta: {
      overline: en ? 'START YOUR PROFILE' : 'COMECE SEU ESPAÇO',
      headline: en ? 'Ready to create your space on velvet.?' : 'Pronta para criar seu espaço na velvet.?',
      desc: en
        ? 'It takes just a few minutes to start your profile and submit your confidential 18+ verification.'
        : 'Leva apenas alguns minutos para iniciar seu perfil e enviar sua verificação 18+ confidencial.',
      button: en ? 'Create my profile' : 'Criar meu perfil',
    },
  }

  return (
    <article className="velvet-anuncie">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: en ? 'Advertise on velvet.' : 'Anuncie na velvet.',
          description: en
            ? 'Create your space, present your work elegantly, and manage your profile independently on velvet.'
            : 'Crie seu espaço, apresente seu trabalho com elegância e gerencie seu perfil com autonomia na velvet.',
          url: canonicalUrl,
          inLanguage: locale,
          isPartOf: {
            '@type': 'WebSite',
            name: 'velvet.',
            url: locale === 'en' ? `${siteUrl}/en` : siteUrl,
          },
        }}
      />

      {/* 1. HERO */}
      <section className="velvet-anuncie-hero">
        <div className="velvet-anuncie-container">
          <div className="velvet-anuncie-hero-grid">
            <div className="velvet-anuncie-hero-copy">
              <p className="velvet-overline">{content.hero.overline}</p>
              <h1>{content.hero.headline}</h1>
              <ul className="velvet-anuncie-hero-points">
                {content.hero.points.map((pt) => (
                  <li key={pt} className="velvet-anuncie-hero-point">
                    <span className="velvet-anuncie-hero-point-bullet" aria-hidden="true" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div className="velvet-anuncie-cta-group">
                <Link href={signupHref} className="velvet-anuncie-btn-primary">
                  {content.hero.primaryCta} <span aria-hidden="true">→</span>
                </Link>
                <a href="#como-funciona" className="velvet-anuncie-btn-secondary">
                  {content.hero.secondaryCta}
                </a>
              </div>
            </div>

            <div className="velvet-anuncie-hero-visual" aria-hidden="true">
              <div className="velvet-anuncie-card-preview">
                <div className="velvet-anuncie-card-top">
                  <span className="velvet-anuncie-card-badge">{content.hero.preview.badge}</span>
                  <span className="velvet-anuncie-card-status">{content.hero.preview.status}</span>
                </div>
                <div className="velvet-anuncie-card-mockup">
                  <div className="velvet-anuncie-card-avatar">V</div>
                  <div className="velvet-anuncie-card-info">
                    <h3>{content.hero.preview.name}</h3>
                    <p>{content.hero.preview.location}</p>
                  </div>
                </div>
                <div className="velvet-anuncie-card-footer">
                  <span>{content.hero.preview.channels}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section id="como-funciona" className="velvet-anuncie-how">
        <div className="velvet-anuncie-container">
          <header className="velvet-anuncie-section-header">
            <p className="velvet-overline">{content.howItWorks.overline}</p>
            <h2>{content.howItWorks.title}</h2>
            <p>{content.howItWorks.subtitle}</p>
          </header>
          <div className="velvet-anuncie-steps-grid">
            {content.howItWorks.steps.map((step) => (
              <div key={step.num} className="velvet-anuncie-step-card">
                <span className="velvet-anuncie-step-num">{step.num}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. WHAT THE PROFILE OFFERS */}
      <section className="velvet-anuncie-offers">
        <div className="velvet-anuncie-container">
          <header className="velvet-anuncie-section-header">
            <p className="velvet-overline">{content.offers.overline}</p>
            <h2>{content.offers.title}</h2>
            <p>{content.offers.subtitle}</p>
          </header>
          <div className="velvet-anuncie-features-grid">
            {content.offers.items.map((item) => (
              <div key={item.title} className="velvet-anuncie-feature-card">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. VERIFICATION + PRIVACY */}
      <section className="velvet-anuncie-privacy">
        <div className="velvet-anuncie-container">
          <header className="velvet-anuncie-section-header">
            <p className="velvet-overline">{content.privacy.overline}</p>
            <h2>{content.privacy.title}</h2>
          </header>
          <div className="velvet-anuncie-privacy-grid">
            {content.privacy.cards.map((card) => (
              <div key={card.title} className="velvet-anuncie-privacy-card">
                <h3>{card.title}</h3>
                {card.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. INDEPENDENCE */}
      <section className="velvet-anuncie-independence">
        <div className="velvet-anuncie-container">
          <header className="velvet-anuncie-section-header">
            <p className="velvet-overline">{content.independence.overline}</p>
            <h2>{content.independence.title}</h2>
          </header>
          <div className="velvet-anuncie-ind-grid">
            {content.independence.items.map((item) => (
              <div key={item.title} className="velvet-anuncie-ind-card">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. PLANS */}
      <section className="velvet-anuncie-plans">
        <div className="velvet-anuncie-container">
          <header className="velvet-anuncie-section-header">
            <p className="velvet-overline">{content.plans.overline}</p>
            <h2>{content.plans.title}</h2>
          </header>
          <div className="velvet-anuncie-founder-card">
            <div className="velvet-anuncie-founder-head">
              <div>
                <p className="velvet-overline">FOUNDER · LAUNCH</p>
                <h3>{content.plans.planTitle}</h3>
              </div>
              <div className="velvet-anuncie-founder-price">
                {content.plans.price}
                <small>{content.plans.priceSub}</small>
              </div>
            </div>
            <ul className="velvet-anuncie-founder-perks">
              {content.plans.perks.map((perk) => (
                <li key={perk} className="velvet-anuncie-founder-perk">
                  <i aria-hidden="true">✓</i>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <p className="velvet-anuncie-founder-note">{content.plans.note}</p>
          </div>
        </div>
      </section>

      {/* 7. SAFETY / CONTROL */}
      <section className="velvet-anuncie-safety">
        <div className="velvet-anuncie-container">
          <header className="velvet-anuncie-section-header">
            <p className="velvet-overline">{content.safety.overline}</p>
            <h2>{content.safety.title}</h2>
          </header>
          <div className="velvet-anuncie-safety-grid">
            {content.safety.items.map((item) => (
              <div key={item.title} className="velvet-anuncie-safety-card">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="velvet-anuncie-final">
        <div className="velvet-anuncie-container">
          <div className="velvet-anuncie-final-card">
            <div className="velvet-anuncie-final-copy">
              <p className="velvet-overline">{content.finalCta.overline}</p>
              <h2>{content.finalCta.headline}</h2>
              <p>{content.finalCta.desc}</p>
            </div>
            <Link href={signupHref}>
              {content.finalCta.button} <span aria-hidden="true">→</span>
            </Link>
            <span className="velvet-anuncie-final-mark" aria-hidden="true">
              V
            </span>
          </div>
        </div>
      </section>
    </article>
  )
}
