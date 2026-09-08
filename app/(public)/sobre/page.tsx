import type { Metadata } from 'next'
import Link from 'next/link'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import { buildCanonicalUrl, buildLanguageAlternates } from '@/modules/seo/canonical'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale()
  const en = locale === 'en'

  return {
    title: {
      absolute: en
        ? 'About Velvet | Independent Discovery Platform'
        : 'Sobre a Velvet | Plataforma Independente de Descoberta',
    },
    description: en
      ? 'Learn about Velvet: an independent platform for discovering verified professional profiles with direct contact.'
      : 'Conheça a proposta, o papel e os princípios da Velvet: plataforma independente para descoberta de perfis verificados.',
    alternates: {
      canonical: buildCanonicalUrl('/sobre', undefined, locale),
      languages: buildLanguageAlternates('/sobre'),
    },
  }
}

export default async function AboutPage() {
  const locale = await getRequestLocale()
  const en = locale === 'en'
  const href = (p: string) => localizePathname(p, locale)

  return (
    <article className="velvet-institutional-page">
      <header>
        <p className="velvet-overline">{en ? 'ABOUT VELVET' : 'SOBRE A VELVET'}</p>
        <h1>{en ? 'Discovery with clarity, autonomy and respect.' : 'Descoberta com clareza, autonomia e respeito.'}</h1>
        <p>
          {en
            ? 'Velvet exists to make discovering professional profiles clearer, more organized, and transparent. For visitors, we facilitate access to information that helps you understand each profile before reaching out. For professionals, we provide an elegant space to present your work, choose what you share, and define how you want to be contacted. Contact always happens directly between individuals.'
            : 'A Velvet existe para tornar a descoberta de perfis profissionais mais clara, organizada e transparente. Para quem procura, facilitamos o acesso a informações que ajudam a conhecer melhor cada perfil antes do contato. Para quem anuncia, oferecemos um espaço elegante para apresentar seu trabalho, escolher o que deseja mostrar e definir como quer ser encontrada. O contato acontece diretamente entre as pessoas.'}
        </p>
      </header>

      {/* 1. NOSSO PAPEL — REQUIRED CLAUSE */}
      <section>
        <h2>{en ? 'Our role' : 'Nosso papel'}</h2>
        <p>
          {en
            ? 'We organize discovery, profile presentation and safety information. Velvet is not an agency, employer, representative or party to conversations or arrangements made inside or outside the platform.'
            : 'Organizamos descoberta, apresentação de perfis e informações de segurança. A Velvet não é agência, empregadora, representante nem parte de conversas ou acordos realizados dentro ou fora da plataforma.'}
        </p>
      </section>

      {/* 2. PARA QUEM É A VELVET */}
      <section>
        <h2>{en ? 'Who Velvet is for' : 'Para quem é a Velvet'}</h2>
        <div>
          <p>
            {en
              ? 'For visitors: we present clear, verified information with authentic photos, locations, and direct contact channels, allowing you to know each professional with peace of mind before reaching out.'
              : 'Para quem procura: apresentamos informações claras e verificadas, com fotografias autênticas, regiões de atendimento e canais de contato direto, para que você conheça cada profissional com tranquilidade antes do contato.'}
          </p>
          <p style={{ marginTop: '14px' }}>
            {en
              ? 'For professionals: you maintain total autonomy over your presentation, your schedule, and your boundaries, deciding what you wish to display and how you prefer to be found.'
              : 'Para quem anuncia: você mantém total autonomia sobre sua apresentação, sua rotina e seus limites, decidindo o que deseja exibir e por quais canais prefere ser contatada.'}
          </p>
        </div>
      </section>

      {/* 3. VERIFICAÇÃO E PRIVACIDADE */}
      <section>
        <h2>{en ? 'Verification and privacy' : 'Verificação e privacidade'}</h2>
        <div>
          <p>
            {en
              ? 'Professionals must confirm their identity and adult age before their profile can be published on Velvet. Verification confirms identity and legal age within the scope of the procedure — it is not an endorsement or guarantee of behavior, services, or meetings.'
              : 'Profissionais precisam confirmar identidade e maioridade antes da publicação do perfil na Velvet. A verificação confirma identidade e maioridade dentro do escopo do procedimento — ela não é uma garantia de comportamento, serviço ou encontro.'}
          </p>
          <p style={{ marginTop: '14px' }}>
            {en
              ? 'Documents, civil identification, and private verification data are never displayed on the public profile. Your public presentation strictly features your stage name and the details you choose to share.'
              : 'Documentos, nome civil e dados privados de verificação nunca são exibidos no perfil público. Sua apresentação pública mostra exclusivamente seu nome artístico e o que você escolheu compartilhar.'}
          </p>
        </div>
      </section>

      {/* 4. CONTATO DIRETO E AUTONOMIA */}
      <section>
        <h2>{en ? 'Direct contact and autonomy' : 'Contato direto e autonomia'}</h2>
        <div>
          <p>
            {en
              ? 'Contact happens directly between visitors and professionals through the channels each professional chooses to provide (such as WhatsApp, phone, or Telegram). Velvet does not participate in, monitor, or intermediate private conversations.'
              : 'O contato acontece diretamente entre visitantes e profissionais pelos canais que cada profissional decide disponibilizar (como WhatsApp, telefone ou Telegram). A Velvet não participa, não monitora e não intermedia conversas privadas.'}
          </p>
          <p style={{ marginTop: '14px' }}>
            {en
              ? 'Professionals set their own conditions and communicate directly. Velvet does not charge commissions on appointments, does not process service payments, and does not interfere in personal agreements.'
              : 'As profissionais definem suas próprias condições e combinam detalhes diretamente. A Velvet não cobra comissões sobre atendimentos, não processa pagamentos de serviços e não interfere em acordos entre as partes.'}
          </p>
        </div>
      </section>

      {/* 5. REVISÃO E SEGURANÇA */}
      <section>
        <h2>{en ? 'Review and safety' : 'Revisão e segurança'}</h2>
        <p>
          {en
            ? 'Photos, videos, and profile updates undergo attentive review before appearing publicly, helping keep the directory authentic, safe, and respectful for everyone.'
            : 'Fotos, vídeos e edições de perfil passam por revisão atenta antes de serem exibidos, ajudando a manter o espaço autêntico, seguro e respeitoso para todos.'}
        </p>
      </section>

      {/* 6. NAVEGAÇÃO INSTITUCIONAL */}
      <nav className="velvet-institutional-actions">
        <Link href={href('/como-funciona')}>{en ? 'How it works' : 'Como funciona'}</Link>
        <Link href={href('/seguranca')}>{en ? 'Trust & Safety' : 'Segurança'}</Link>
        <Link href={href('/anuncie')}>{en ? 'For professionals' : 'Anuncie seu perfil'}</Link>
        <Link href={href('/sao-paulo')}>{en ? 'Explore São Paulo' : 'Explorar São Paulo'}</Link>
      </nav>
    </article>
  )
}
