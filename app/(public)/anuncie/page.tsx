import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'
import { JsonLd } from '@/components/seo/json-ld'
import { getSeoConfig } from '@/modules/seo/config'
import { VelvetVerifiedChip } from '@/components/ui/velvet-verified-chip'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const en = locale === 'en'

  return {
    title: {
      absolute: en
        ? 'Advertise on Velvet | Professional Profiles'
        : 'Anuncie na Velvet | Perfis Profissionais',
    },
    description: en
      ? 'Create your space, present your profile with care, and manage your choices with autonomy on Velvet.'
      : 'Crie seu espaço, apresente seu perfil com cuidado e gerencie suas escolhas com autonomia na Velvet.',
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
      headline: en
        ? 'Your space.\nYour profile.\nYour way.'
        : 'Seu espaço.\nSeu perfil.\nDo seu jeito.',
      paragraphs: en
        ? [
            'Velvet is a space for you to present yourself with care, freedom, and clarity.',
            'You choose what to display on your profile, where you are available, and how you prefer to be contacted. Before publication, we confirm your identity and legal age and review submitted content.',
            'Once your profile is live, interested people can reach out directly through the channels you choose to provide.',
            'Velvet helps your profile be discovered, but does not take part in conversations, negotiations, payments, or meetings arranged between you.',
          ]
        : [
            'A Velvet é um espaço para você se apresentar com cuidado, liberdade e clareza.',
            'Você escolhe o que quer mostrar no seu perfil, as regiões onde atende e como prefere ser contatada. Antes da publicação, confirmamos sua identidade e maioridade e revisamos o conteúdo enviado.',
            'Depois que seu perfil estiver no ar, quem se interessar pode falar diretamente com você pelos canais que você escolher disponibilizar.',
            'A Velvet ajuda seu perfil a ser descoberto, mas não participa das conversas, negociações, pagamentos ou encontros combinados entre vocês.',
          ],
      primaryCta: en ? 'Create my profile' : 'Criar meu perfil',
      secondaryCta: en ? 'How it works' : 'Entenda como funciona',
      preview: {
        badge: en ? '18+ VERIFIED' : 'VERIFICADA 18+',
        name: 'Helena',
        location: 'Jardins · São Paulo',
        footer: en ? 'Direct contact available' : 'Contato direto disponível',
      },
    },
    howItWorks: {
      overline: en ? 'STEP BY STEP' : 'PASSO A PASSO',
      title: en ? 'From registration to your published profile' : 'Do cadastro ao seu perfil publicado',
      subtitle: en
        ? 'You can take everything at your own pace. Velvet guides you through the main steps and shows what remains before submitting your profile for review.'
        : 'Você pode fazer tudo no seu ritmo. A Velvet acompanha você pelas principais etapas e mostra o que falta antes de enviar seu perfil para análise.',
      steps: en
        ? [
            { num: '01', title: 'Create your account', desc: 'Start with your email and password to access your space on Velvet.' },
            { num: '02', title: 'Confirm your identity and legal age', desc: 'Before publishing, you need to confirm your identity and prove you are 18 or older. This step is mandatory for all professionals.' },
            { num: '03', title: 'Tell us a bit about yourself', desc: 'Choose your stage name, write your introduction, and add the details you want to show on your profile.' },
            { num: '04', title: 'Choose your photos and videos', desc: 'Add the images and videos you wish to use in your presentation. Content is reviewed before becoming visible.' },
            { num: '05', title: 'Share where you are available', desc: 'Select the areas of São Paulo where you want to appear and where you are available.' },
            { num: '06', title: 'Review and submit', desc: 'Review your profile calmly and make any adjustments you like. When you are ready, submit it for review.' },
            { num: '07', title: 'Publish your profile', desc: 'Once the required steps are completed and content is approved, your profile can appear in Velvet discovery. Anyone interested can reach out directly to you.' },
          ]
        : [
            { num: '01', title: 'Crie sua conta', desc: 'Comece com seu e-mail e uma senha para acessar seu espaço na Velvet.' },
            { num: '02', title: 'Confirme sua identidade e maioridade', desc: 'Antes de publicar, você precisa confirmar sua identidade e comprovar que tem 18 anos ou mais. Essa etapa é obrigatória para todas as profissionais.' },
            { num: '03', title: 'Conte um pouco sobre você', desc: 'Escolha seu nome artístico, escreva sua apresentação e adicione as informações que deseja mostrar no perfil.' },
            { num: '04', title: 'Escolha suas fotos e vídeos', desc: 'Adicione as imagens e vídeos que você quer usar na sua apresentação. O conteúdo passa por revisão antes de ficar visível.' },
            { num: '05', title: 'Informe onde você atende', desc: 'Escolha as regiões de São Paulo onde deseja aparecer e onde costuma atender.' },
            { num: '06', title: 'Revise e envie', desc: 'Confira seu perfil com calma e faça os ajustes que quiser. Quando estiver pronta, envie para análise.' },
            { num: '07', title: 'Coloque seu perfil no ar', desc: 'Depois que as etapas necessárias estiverem concluídas e o conteúdo aprovado, seu perfil poderá aparecer na descoberta da Velvet. Quem se interessar poderá entrar em contato diretamente com você.' },
          ],
      ctaText: en ? 'View the complete guide' : 'Ver o guia completo',
    },
    offers: {
      overline: en ? 'YOUR PROFILE ON VELVET' : 'SEU PERFIL NA VELVET',
      title: en ? 'A space to show who you are' : 'Um espaço para mostrar quem você é',
      subtitle: en
        ? 'Your profile gathers the information you choose to share so people can get to know you better before getting in touch.'
        : 'Seu perfil reúne as informações que você escolhe compartilhar para que as pessoas possam conhecer melhor você antes de entrar em contato.',
      items: en
        ? [
            { title: 'Your presentation', desc: 'Show your stage name, biography, languages, and other details that feel right to you.' },
            { title: 'Photos and videos', desc: 'Create a visual presentation with the photos and videos you select for your profile.' },
            { title: 'Where you are available', desc: 'Indicate the areas of São Paulo where you are available and where you want to be discovered.' },
            { title: 'About your services', desc: 'Share details and preferences that help people better understand your profile before reaching out.' },
            { title: 'Reviews', desc: 'When available, reviews help share experiences within Velvet guidelines and undergo our moderation processes.' },
            { title: 'Direct contact', desc: 'You choose which contact channels you want to provide. Conversations happen directly between you and the other person.' },
            { title: 'Who can see your profile', desc: 'Choose the available visibility option that makes the most sense for you.' },
            { title: 'Update whenever you like', desc: 'Update details and media or pause your profile whenever you need to, right from your space on Velvet.' },
          ]
        : [
            { title: 'Sua apresentação', desc: 'Mostre seu nome artístico, sua descrição, idiomas e outras informações que façam sentido para você.' },
            { title: 'Fotos e vídeos', desc: 'Crie uma apresentação visual com as fotos e vídeos que escolher para o seu perfil.' },
            { title: 'Onde você atende', desc: 'Informe as regiões de São Paulo onde costuma atender e onde deseja ser encontrada.' },
            { title: 'Sobre o seu atendimento', desc: 'Compartilhe as informações e preferências que ajudam as pessoas a entender melhor o seu perfil antes do contato.' },
            { title: 'Avaliações', desc: 'Quando disponíveis, avaliações ajudam a compartilhar experiências dentro das regras da Velvet e passam pelos nossos processos de moderação.' },
            { title: 'Contato direto', desc: 'Você escolhe quais canais de contato quer disponibilizar. A conversa acontece diretamente entre você e a outra pessoa.' },
            { title: 'Quem pode ver seu perfil', desc: 'Escolha a forma de visibilidade disponível que fizer mais sentido para você.' },
            { title: 'Atualize quando quiser', desc: 'Troque informações e conteúdos ou pause seu perfil quando precisar, usando sua área na Velvet.' },
          ],
    },
    privacy: {
      overline: en ? 'PRIVACY & VERIFICATION' : 'PRIVACIDADE E VERIFICAÇÃO',
      title: en
        ? 'Your identity is confirmed. Your stage name is what remains visible.'
        : 'Sua identidade é confirmada. Seu nome artístico continua sendo o que aparece.',
      cards: en
        ? [
            {
              title: 'Verification of identity and legal age',
              paragraphs: [
                'To publish on Velvet, every professional must confirm her identity and prove she is 18 or older.',
                'This verification exists to help keep the platform strictly adult and reduce fake profiles.',
                'It confirms identity and legal age. It is not an evaluation of your work and does not represent a guarantee regarding services, payments, or meetings.',
              ],
            },
            {
              title: 'Your private information remains off your profile',
              paragraphs: [
                'The public sees your stage name and the details you chose to present.',
                'Verification records and other private account details are never part of your public profile.',
              ],
            },
          ]
        : [
            {
              title: 'Verificação de identidade e maioridade',
              paragraphs: [
                'Para publicar na Velvet, toda profissional precisa confirmar sua identidade e comprovar que tem 18 anos ou mais.',
                'Essa verificação existe para ajudar a manter a plataforma exclusivamente adulta e reduzir o uso de perfis falsos.',
                'Ela confirma identidade e maioridade. Não é uma avaliação do seu trabalho e não representa garantia sobre serviços, pagamentos ou encontros.',
              ],
            },
            {
              title: 'Suas informações privadas continuam fora do perfil',
              paragraphs: [
                'O público vê seu nome artístico e as informações que você escolheu apresentar.',
                'Dados usados na verificação e outras informações privadas da sua conta não fazem parte do seu perfil público.',
              ],
            },
          ],
    },
    independence: {
      overline: en ? 'YOUR AUTONOMY' : 'SUA AUTONOMIA',
      title: en ? 'Your decisions remain your own' : 'Suas decisões continuam sendo suas',
      items: en
        ? [
            {
              title: 'Velvet helps your profile be discovered',
              desc: 'We provide the space for you to present yourself and for interested people to discover your profile. Velvet is not an agency, employer, or representative of the professional.',
            },
            {
              title: 'You organize your routine',
              desc: 'You decide your schedule, availability, boundaries, and how you conduct your work.',
            },
            {
              title: 'You choose how you want to be reached',
              desc: 'When you share WhatsApp, phone, or another channel, conversations happen directly between you. Velvet does not take part in or monitor private conversations.',
            },
            {
              title: 'What you arrange stays between you',
              desc: 'Velvet does not negotiate on your behalf and does not take part in payments, bookings, or meetings arranged inside or outside the platform.',
            },
          ]
        : [
            {
              title: 'A Velvet ajuda seu perfil a ser encontrado',
              desc: 'Criamos o espaço para você se apresentar e para que pessoas interessadas possam conhecer seu perfil. A Velvet não é agência, empregadora ou representante da profissional.',
            },
            {
              title: 'Você organiza sua rotina',
              desc: 'Você decide seus horários, disponibilidade, limites e como deseja conduzir seu trabalho.',
            },
            {
              title: 'Você escolhe como quer ser contatada',
              desc: 'Quando você disponibiliza WhatsApp, telefone ou outro canal, a conversa acontece diretamente entre vocês. A Velvet não participa nem acompanha conversas privadas.',
            },
            {
              title: 'O que vocês combinam fica entre vocês',
              desc: 'A Velvet não negocia em seu nome e não participa de pagamentos, contratações ou encontros combinados dentro ou fora da plataforma.',
            },
          ],
      safetyNote: en
        ? 'Protect your personal information. Never share your password, access codes, or banking details with unknown people.'
        : 'Cuide das suas informações pessoais. Nunca compartilhe sua senha, códigos de acesso ou dados bancários com desconhecidos.',
    },
    plans: {
      overline: en ? 'FOUNDER' : 'FOUNDER',
      title: en
        ? 'Start with Velvet with no monthly fee during the launch phase'
        : 'Comece com a Velvet sem mensalidade na fase de lançamento',
      planOverline: en ? 'FOUNDER · LAUNCH' : 'FOUNDER · LANÇAMENTO',
      planTitle: en ? 'Founder Plan' : 'Plano Founder',
      price: en ? 'No monthly fee' : 'Sem mensalidade',
      priceSub: en ? 'during the launch phase' : 'durante a fase de lançamento',
      intro: en
        ? 'Founder is the program for the first professionals on Velvet in São Paulo. During this phase, you can create and maintain your profile under program conditions without paying a monthly fee.'
        : 'O Founder é o programa das primeiras profissionais da Velvet em São Paulo. Durante essa fase, você pode criar e manter seu perfil dentro das condições do programa sem pagar mensalidade.',
      perks: en
        ? [
            'Professional profile with 18+ verification',
            'Up to 10 photos',
            'Up to 3 videos',
            'Up to 5 service areas in São Paulo',
            'Review features available for your profile',
            'Options to control who can view your profile',
            'No monthly fee during the Founder phase',
            'Zero Velvet commission on arrangements made directly between you and another person',
          ]
        : [
            'Perfil profissional com verificação 18+',
            'Até 10 fotos',
            'Até 3 vídeos',
            'Até 5 regiões de atendimento em São Paulo',
            'Recursos de avaliações disponíveis para o perfil',
            'Opções para controlar quem pode visualizar seu perfil',
            'Sem mensalidade durante a fase Founder',
            'Sem comissão da Velvet sobre o que for combinado diretamente entre você e outra pessoa',
          ],
      note: en
        ? 'During the Founder phase, you do not need to register a credit card for recurring charges.'
        : 'Durante a fase Founder, você não precisa cadastrar cartão para cobranças automáticas.',
    },
    safety: {
      overline: en ? 'YOU IN CONTROL' : 'VOCÊ NO CONTROLE',
      title: en ? 'Your profile moves with your pace' : 'Seu perfil acompanha o seu momento',
      items: en
        ? [
            {
              title: 'Choose how you want to appear',
              desc: 'Use the available visibility options to decide how your profile can be found.',
            },
            {
              title: 'Pause whenever you need to',
              desc: 'Taking some time off? You can pause your profile and return later without starting over.',
            },
            {
              title: 'Content reviewed before going live',
              desc: 'Photos, videos, and other updates requiring moderation are reviewed before becoming visible.',
            },
            {
              title: 'If you need help',
              desc: 'Our Help Center brings together guidance on account, profile, photos, verification, safety, and other important topics.',
            },
          ]
        : [
            {
              title: 'Escolha como quer aparecer',
              desc: 'Use as opções de visibilidade disponíveis para decidir como seu perfil pode ser encontrado.',
            },
            {
              title: 'Pause quando precisar',
              desc: 'Vai ficar um tempo fora? Você pode pausar seu perfil e voltar depois sem precisar começar tudo novamente.',
            },
            {
              title: 'Conteúdo revisado antes de aparecer',
              desc: 'Fotos, vídeos e outras alterações que precisam de moderação são analisados antes de ficarem visíveis.',
            },
            {
              title: 'Se precisar de ajuda',
              desc: 'Nossa Central de Ajuda reúne orientações sobre conta, perfil, fotos, verificação, segurança e outros assuntos importantes.',
            },
          ],
    },
    finalCta: {
      overline: en ? 'START YOUR PROFILE' : 'COMECE SEU PERFIL',
      headline: en ? 'How about starting your space on Velvet?' : 'Que tal começar seu espaço na Velvet?',
      desc: en
        ? 'You can create your account now and complete your profile at your own pace. We show you every step — from your bio and photos to the required verification before publication.'
        : 'Você pode criar sua conta agora e completar seu perfil com calma. Vamos mostrar cada etapa — desde sua apresentação e fotos até a verificação necessária antes da publicação.',
      button: en ? 'Create my profile' : 'Criar meu perfil',
    },
  }

  return (
    <article className="velvet-anuncie">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: en ? 'Advertise on Velvet.' : 'Anuncie na Velvet.',
          description: en
            ? 'Create your space, present your profile with care, and manage your choices with autonomy on Velvet.'
            : 'Crie seu espaço, apresente seu perfil com cuidado e gerencie suas escolhas com autonomia na Velvet.',
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
              <h1>
                {content.hero.headline.split('\n').map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </h1>
              <div className="velvet-anuncie-hero-body">
                {content.hero.paragraphs.map((pt, idx) => (
                  <p key={idx} className="velvet-anuncie-hero-desc">
                    {pt}
                  </p>
                ))}
              </div>
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
                  <VelvetVerifiedChip label={content.hero.preview.badge} size="sm" />
                </div>
                <div className="velvet-anuncie-card-mockup">
                  <div className="velvet-anuncie-card-avatar">
                    <span className="velvet-brand-monogram">v</span>
                  </div>
                  <div className="velvet-anuncie-card-info">
                    <h3>{content.hero.preview.name}</h3>
                    <p>{content.hero.preview.location}</p>
                  </div>
                </div>
                <div className="velvet-anuncie-card-footer">
                  <span>{content.hero.preview.footer}</span>
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
          <div style={{ marginTop: '28px', textAlign: 'center' }}>
            <Link
              href={localizePathname('/como-comecar', locale)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--public-aubergine)',
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
              }}
            >
              {content.howItWorks.ctaText} <span aria-hidden="true">→</span>
            </Link>
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

      {/* 5. INDEPENDENCE / AUTONOMY */}
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
          <div className="velvet-anuncie-safety-note" role="note">
            <p>{content.independence.safetyNote}</p>
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
                <p className="velvet-overline">{content.plans.planOverline}</p>
                <h3>{content.plans.planTitle}</h3>
              </div>
              <div className="velvet-anuncie-founder-price">
                {content.plans.price}
                <small>{content.plans.priceSub}</small>
              </div>
            </div>
            <p className="velvet-anuncie-founder-intro">{content.plans.intro}</p>
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
              <span className="velvet-brand-monogram">v</span>
            </span>
          </div>
        </div>
      </section>
    </article>
  )
}
