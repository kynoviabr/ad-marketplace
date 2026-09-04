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
        ? 'How to start on velvet. | Step-by-step Guide'
        : 'Como começar na velvet. | Guia Passo a Passo',
    },
    description: en
      ? 'Understand how to create, verify, build, and publish your professional profile on velvet. with autonomy and privacy.'
      : 'Entenda como criar, verificar, montar e publicar seu perfil profissional na velvet. com autonomia e privacidade.',
    alternates: {
      canonical: buildCanonicalUrl('/como-comecar', undefined, locale),
      languages: buildLanguageAlternates('/como-comecar'),
    },
  }
}

export default async function HowToStartPage() {
  const locale = await getRequestLocale()
  const en = locale === 'en'

  const signupHref = localizePathname('/signup', locale)
  const anuncieHref = localizePathname('/anuncie', locale)
  const canonicalUrl = buildCanonicalUrl('/como-comecar', undefined, locale)
  const siteUrl = getSeoConfig().siteUrl

  const content = {
    intro: {
      overline: en ? 'PROFESSIONAL ONBOARDING GUIDE' : 'GUIA PARA PROFISSIONAIS',
      title: en ? 'How to start on velvet.' : 'Como começar na velvet.',
      lead: en
        ? 'Profile creation on velvet. happens in structured, transparent stages. You remain in complete control of your presentation, your schedule, and your boundaries at every step.'
        : 'A criação do seu perfil na velvet. acontece em etapas estruturadas e transparentes. Você mantém o controle total da sua apresentação, dos seus horários e dos seus limites em cada momento.',
    },
    journey: {
      overline: en ? 'STEP BY STEP JOURNEY' : 'A JORNADA EM ETAPAS',
      title: en ? 'From registration to publication' : 'Do cadastro à publicação',
      subtitle: en
        ? 'Understand what each stage involves, what velvet. verifies, and how your privacy is protected.'
        : 'Entenda o que acontece em cada etapa, o que a velvet. verifica e como sua privacidade é protegida.',
      steps: en
        ? [
            {
              idx: '01',
              title: 'Create your account',
              visibility: 'Private',
              visibilityType: 'is-private',
              whatYouDo: 'Sign up with your personal email and create a secure password to access your dedicated dashboard.',
              whatVelvetChecks: 'Email verification and credential security to safeguard access to your private profile management.',
            },
            {
              idx: '02',
              title: 'Verify identity & legal age',
              visibility: 'Confidential',
              visibilityType: 'is-private',
              whatYouDo: 'Complete a brief, confidential digital 18+ verification using an official government photo ID.',
              whatVelvetChecks: 'Strict confirmation that you are 18 or older and authentic, maintaining legal compliance and ecosystem safety.',
            },
            {
              idx: '03',
              title: 'Build your profile',
              visibility: 'Public',
              visibilityType: 'is-public',
              whatYouDo: 'Choose your professional stage name, compose an editorial presentation bio, and select languages.',
              whatVelvetChecks: 'Editorial consistency and adherence to our community and public presentation guidelines.',
            },
            {
              idx: '04',
              title: 'Add photos & videos',
              visibility: 'Controlled',
              visibilityType: 'is-controlled',
              whatYouDo: 'Upload high-resolution photographs for your gallery and short video presentations.',
              whatVelvetChecks: 'Technical resolution, formatting, image integrity, and media guideline compliance.',
            },
            {
              idx: '05',
              title: 'Set services & regions',
              visibility: 'Public',
              visibilityType: 'is-public',
              whatYouDo: 'Select operating neighborhoods and zones in São Paulo, service preferences, and enabled direct contact channels.',
              whatVelvetChecks: 'Recognized geographic locations and valid channel formatting (WhatsApp, direct phone, Telegram).',
            },
            {
              idx: '06',
              title: 'Choose Public or VIP',
              visibility: 'Under your control',
              visibilityType: 'is-controlled',
              whatYouDo: 'Choose your audience setting: open to all visitors (PUBLIC) or reserved exclusively for members (VIP).',
              whatVelvetChecks: 'Applies access gates and delivers protected media only according to your selected audience rule.',
            },
            {
              idx: '07',
              title: 'Submit for review',
              visibility: 'In review',
              visibilityType: 'is-private',
              whatYouDo: 'Review your complete profile presentation and submit it for our moderation team to evaluate.',
              whatVelvetChecks: 'Holistic review verifying that verification, completeness, and all content guidelines are met.',
            },
            {
              idx: '08',
              title: 'Publish',
              visibility: 'Live',
              visibilityType: 'is-public',
              whatYouDo: 'Once approved, your profile goes live on velvet. discovery and you can pause or update it anytime.',
              whatVelvetChecks: 'Continuous publication eligibility and active index placement for direct client discovery.',
            },
          ]
        : [
            {
              idx: '01',
              title: 'Criar sua conta',
              visibility: 'Privado',
              visibilityType: 'is-private',
              whatYouDo: 'Cadastre seu e-mail e crie uma senha exclusiva para acessar seu painel de gestão com total privacidade.',
              whatVelvetChecks: 'Validação de e-mail e proteção de credenciais para garantir que apenas você acerte seu perfil.',
            },
            {
              idx: '02',
              title: 'Verificar identidade e maioridade',
              visibility: 'Confidencial',
              visibilityType: 'is-private',
              whatYouDo: 'Realize o procedimento digital e confidencial de confirmação 18+ com um documento oficial de identidade.',
              whatVelvetChecks: 'Confirmação estrita de maioridade legal (18+) e autenticidade para garantir a segurança de toda a comunidade.',
            },
            {
              idx: '03',
              title: 'Montar seu perfil',
              visibility: 'Público',
              visibilityType: 'is-public',
              whatYouDo: 'Defina seu nome artístico, escreva seu texto de apresentação, selecione idiomas e características.',
              whatVelvetChecks: 'Coerência editorial e conformidade com as diretrizes de apresentação e respeito da plataforma.',
            },
            {
              idx: '04',
              title: 'Adicionar fotos e vídeos',
              visibility: 'Controlado',
              visibilityType: 'is-controlled',
              whatYouDo: 'Envie fotografias em alta resolução para sua galeria e vídeos curtos de apresentação pessoal.',
              whatVelvetChecks: 'Qualidade técnica, integridade visual e conformidade com as diretrizes de mídia da plataforma.',
            },
            {
              idx: '05',
              title: 'Informar serviços e regiões',
              visibility: 'Público',
              visibilityType: 'is-public',
              whatYouDo: 'Indique as regiões e bairros onde atende em São Paulo, preferências estruturadas e canais de contato direto.',
              whatVelvetChecks: 'Localizações geográficas reconhecidas e formato válido dos canais habilitados (WhatsApp, telefone, Telegram).',
            },
            {
              idx: '06',
              title: 'Escolher Público ou VIP',
              visibility: 'Sob seu controle',
              visibilityType: 'is-controlled',
              whatYouDo: 'Defina quem pode acessar seu perfil: aberto a qualquer visitante (Público) ou exclusivo para assinantes (VIP).',
              whatVelvetChecks: 'Aplicação dos filtros de acesso e proteção de mídia conforme a audiência escolhida por você.',
            },
            {
              idx: '07',
              title: 'Enviar para análise',
              visibility: 'Em análise',
              visibilityType: 'is-private',
              whatYouDo: 'Revise todas as etapas do perfil e envie para a avaliação final da nossa equipe de moderação.',
              whatVelvetChecks: 'Análise criteriosa assegurando que a verificação, o preenchimento e as diretrizes de conteúdo foram atendidos.',
            },
            {
              idx: '08',
              title: 'Publicar',
              visibility: 'No ar',
              visibilityType: 'is-public',
              whatYouDo: 'Com a aprovação concluída, ative seu perfil no catálogo e gerencie sua disponibilidade quando quiser.',
              whatVelvetChecks: 'Elegibilidade contínua de publicação e presença ativa nos resultados de busca da plataforma.',
            },
          ],
    },
    privacy: {
      overline: en ? 'PRIVACY & SAFETY' : 'PRIVACIDADE E SEGURANÇA',
      title: en ? 'Absolute civil privacy, verified credibility' : 'Privacidade civil absoluta, credibilidade verificada',
      subtitle: en
        ? 'We believe professional presentation requires uncompromising protection of your personal identity.'
        : 'Acreditamos que uma apresentação profissional exige proteção rigorosa e intransigente da sua identidade pessoal.',
      items: en
        ? [
            {
              title: 'Civil data is strictly private',
              desc: 'Your legal name, CPF, identification documents, and facial verification images are NEVER displayed publicly or shared with visitors or clients.',
            },
            {
              title: 'Stage identity is what appears',
              desc: 'Your public profile displays exclusively your professional stage name and the biographical information and contact channels you choose to publish.',
            },
            {
              title: 'Verification is for safety, not display',
              desc: 'The identity verification process exists solely to confirm legal age (18+) and maintain a secure community. It is completely isolated from public content.',
            },
          ]
        : [
            {
              title: 'Dados civis são rigorosamente privados',
              desc: 'Seu nome civil, CPF, fotos de documentos e registros de verificação NUNCA são mostrados publicamente nem compartilhados com visitantes ou clientes.',
            },
            {
              title: 'Identidade artística é o que aparece',
              desc: 'Seu perfil público exibe exclusivamente seu nome artístico profissional e os dados, biografia e canais de contato que você decidir publicar.',
            },
            {
              title: 'Verificação é para segurança, não exibição',
              desc: 'O procedimento de verificação de identidade serve unicamente para confirmar a maioridade legal (18+) e segurança do ecossistema. Ele é totalmente isolado do perfil público.',
            },
          ],
    },
    publication: {
      overline: en ? 'PUBLICATION REQUIREMENTS' : 'CONDIÇÕES DE PUBLICAÇÃO',
      title: en ? 'What publication depends on' : 'Do que depende a sua publicação',
      subtitle: en
        ? 'To maintain a curated, safe marketplace, every live profile meets six straightforward conditions:'
        : 'Para manter um catálogo curado e seguro, cada perfil publicado cumpre seis condições claras:',
      items: en
        ? [
            { title: '18+ Identity verification', desc: 'Completed and confirmed verification proving legal adult age.' },
            { title: 'Profile completeness', desc: 'Stage name, presentation text, and essential profile details filled out.' },
            { title: 'Approved content & media', desc: 'Gallery photos and media approved according to safety guidelines.' },
            { title: 'At least one service area', desc: 'Specific neighborhood or operating zone selected in São Paulo.' },
            { title: 'Active launch access / plan', desc: 'Active Founder launch benefit with zero cost during this phase.' },
            { title: 'Responsible moderation', desc: 'Ongoing compliance with respectful community and presentation terms.' },
          ]
        : [
            { title: 'Verificação 18+ concluída', desc: 'Confirmação de identidade e maioridade legal aprovada com sucesso.' },
            { title: 'Perfil preenchido', desc: 'Nome artístico, texto de apresentação e informações essenciais completas.' },
            { title: 'Mídia e fotos aprovadas', desc: 'Fotografias e vídeos avaliados e aprovados pela moderação de conteúdo.' },
            { title: 'Região de atendimento informada', desc: 'Ao menos um bairro ou zona de atendimento selecionado em São Paulo.' },
            { title: 'Plano ou acesso ativo', desc: 'Benefício Founder de lançamento ativo, sem custos na fase inicial.' },
            { title: 'Moderação responsável', desc: 'Conformidade contínua com os termos de convivência e respeito da plataforma.' },
          ],
    },
    cta: {
      overline: en ? 'READY TO START?' : 'PRONTA PARA COMEÇAR?',
      headline: en ? 'Create your space on velvet.' : 'Crie seu espaço na velvet.',
      desc: en
        ? 'Registration takes just a few minutes. Start building your profile today with complete autonomy.'
        : 'O cadastro leva apenas alguns minutos. Comece a montar seu perfil hoje com total autonomia.',
      primaryBtn: en ? 'Start my profile' : 'Começar meu perfil',
      secondaryBtn: en ? 'Advertise on velvet.' : 'Anuncie na velvet.',
    },
  }

  return (
    <article className="velvet-guide">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: content.intro.title,
          description: en
            ? 'Understand how to create, verify, build, and publish your professional profile on velvet. with autonomy and privacy.'
            : 'Entenda como criar, verificar, montar e publicar seu perfil profissional na velvet. com autonomia e privacidade.',
          url: canonicalUrl,
          inLanguage: locale,
          isPartOf: {
            '@type': 'WebSite',
            name: 'velvet.',
            url: locale === 'en' ? `${siteUrl}/en` : siteUrl,
          },
        }}
      />

      {/* 1. INTRO */}
      <header className="velvet-guide-intro">
        <div className="velvet-guide-container">
          <p className="velvet-overline">{content.intro.overline}</p>
          <h1>{content.intro.title}</h1>
          <p className="velvet-guide-intro-lead">{content.intro.lead}</p>
        </div>
      </header>

      {/* 2. JOURNEY STEPS */}
      <section className="velvet-guide-journey">
        <div className="velvet-guide-container">
          <header className="velvet-guide-section-head">
            <p className="velvet-overline">{content.journey.overline}</p>
            <h2>{content.journey.title}</h2>
            <p>{content.journey.subtitle}</p>
          </header>

          <div className="velvet-guide-steps-list">
            {content.journey.steps.map((step) => (
              <div key={step.idx} className="velvet-guide-step-card">
                <div className="velvet-guide-step-header">
                  <div className="velvet-guide-step-title-group">
                    <span className="velvet-guide-step-idx">{step.idx}</span>
                    <h3>{step.title}</h3>
                  </div>
                  <span className={`velvet-guide-visibility-tag ${step.visibilityType}`}>
                    {step.visibility}
                  </span>
                </div>
                <div className="velvet-guide-step-body">
                  <div className="velvet-guide-step-col">
                    <h4>{en ? 'What you do' : 'O que você faz'}</h4>
                    <p>{step.whatYouDo}</p>
                  </div>
                  <div className="velvet-guide-step-col">
                    <h4>{en ? 'What velvet. verifies' : 'O que a velvet. verifica'}</h4>
                    <p>{step.whatVelvetChecks}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PRIVACY CALLOUT */}
      <section className="velvet-guide-privacy-callout">
        <div className="velvet-guide-container">
          <div className="velvet-guide-privacy-box">
            <p className="velvet-overline">{content.privacy.overline}</p>
            <h2>{content.privacy.title}</h2>
            <p className="velvet-guide-intro-lead">{content.privacy.subtitle}</p>

            <div className="velvet-guide-privacy-grid">
              {content.privacy.items.map((item) => (
                <div key={item.title} className="velvet-guide-privacy-item">
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PUBLICATION */}
      <section className="velvet-guide-publication">
        <div className="velvet-guide-container">
          <header className="velvet-guide-section-head">
            <p className="velvet-overline">{content.publication.overline}</p>
            <h2>{content.publication.title}</h2>
            <p>{content.publication.subtitle}</p>
          </header>

          <div className="velvet-guide-publication-grid">
            {content.publication.items.map((item) => (
              <div key={item.title} className="velvet-guide-pub-card">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="velvet-guide-cta">
        <div className="velvet-guide-container">
          <div className="velvet-guide-cta-card">
            <div className="velvet-guide-cta-copy">
              <p className="velvet-overline">{content.cta.overline}</p>
              <h2>{content.cta.headline}</h2>
              <p>{content.cta.desc}</p>
            </div>
            <div className="velvet-guide-cta-actions">
              <Link href={signupHref} className="velvet-guide-btn-primary">
                {content.cta.primaryBtn} <span aria-hidden="true">→</span>
              </Link>
              <Link href={anuncieHref} className="velvet-guide-btn-secondary">
                {content.cta.secondaryBtn}
              </Link>
            </div>
            <span className="velvet-guide-cta-mark" aria-hidden="true">
              V
            </span>
          </div>
        </div>
      </section>
    </article>
  )
}
