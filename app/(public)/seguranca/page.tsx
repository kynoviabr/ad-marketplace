import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalDocument, type LegalSection } from '@/components/public/legal-document'
import { buildCanonicalUrl } from '@/modules/seo/canonical'
import { getRequestLocale } from '@/lib/i18n/server'
import { localizePathname } from '@/lib/i18n/routing'
import type { Locale } from '@/lib/i18n/config'

export const metadata: Metadata = {
  title: { absolute: 'Segurança | Velvet' },
  description: 'Conheça os princípios e controles de segurança da Velvet.',
  alternates: { canonical: buildCanonicalUrl('/seguranca') },
}

function SecurityClosing({ locale, en }: { locale: Locale; en: boolean }) {
  return (
    <div className="velvet-security-closing">
      <div className="velvet-trust-v-mark velvet-trust-v-mark--small" aria-hidden="true">
        <span className="velvet-brand-monogram">v</span>
      </div>
      <h2>{en ? 'Want to learn more?' : 'Quer saber mais?'}</h2>
      <p>
        {en
          ? 'Learn more about how verification works, our privacy policy, and platform terms.'
          : 'Conheça também como funciona a verificação, nossa política de privacidade e os termos da plataforma.'}
      </p>
      <div className="velvet-security-links">
        <Link href={localizePathname('/como-funciona', locale)} className="velvet-security-link">
          {en ? 'Understand how we verify profiles →' : 'Entenda como verificamos os perfis →'}
        </Link>
        <Link href={localizePathname('/privacidade', locale)} className="velvet-security-link">
          {en ? 'Privacy Policy →' : 'Política de Privacidade →'}
        </Link>
        <Link href={localizePathname('/termos', locale)} className="velvet-security-link">
          {en ? 'Terms of Use →' : 'Termos de Uso →'}
        </Link>
      </div>
    </div>
  )
}

export default async function SecurityPage() {
  const locale = await getRequestLocale()
  const en = locale === 'en'

  if (en) {
    const enSections: LegalSection[] = [
      {
        id: 'identity',
        title: 'Identity and legal age verified',
        content: (
          <ul className="velvet-security-list">
            <li>To advertise on Velvet, professionals must confirm their identity and prove they are 18 or older.</li>
            <li>This step occurs before the profile can be published.</li>
            <li>This helps reduce fake profiles and platform misuse.</li>
            <li>Verification confirms the identity and legal age of the advertiser. It is not a guarantee of conduct, service, payment, or meetings.</li>
          </ul>
        ),
      },
      {
        id: 'review',
        title: 'Photos and content undergo review',
        content: (
          <ul className="velvet-security-list">
            <li>Content is not published automatically.</li>
            <li>Photos and media are reviewed before appearing on the profile.</li>
            <li>Pending, unapproved, or re-examined items do not remain public.</li>
            <li>This helps keep the platform consistent and compliant with rules.</li>
          </ul>
        ),
      },
      {
        id: 'account',
        title: 'Your account and information are protected',
        content: (
          <ul className="velvet-security-list">
            <li>Each person only accesses what belongs to their own account.</li>
            <li>Private details and verification data never appear on public profiles.</li>
            <li>Velvet employs controls to safeguard restricted areas of the platform.</li>
          </ul>
        ),
      },
      {
        id: 'moderation',
        title: 'Moderation when something is wrong',
        content: (
          <ul className="velvet-security-list">
            <li>Profiles and content may be reviewed whenever necessary.</li>
            <li>When something violates rules or presents risk, Velvet may review, restrict, suspend, or remove publication.</li>
            <li>The goal is to act with consistency and responsibility.</li>
          </ul>
        ),
      },
      {
        id: 'contact',
        title: 'Contact takes place directly',
        content: (
          <ul className="velvet-security-list">
            <li>Velvet helps you discover profiles and understand who is advertising.</li>
            <li>When a professional shares a contact channel, communication happens directly between you.</li>
            <li>Velvet does not participate in negotiations, payments, hiring, or meetings, inside or outside the platform.</li>
            <li>Never share passwords, access codes, documents, or banking details with unknown parties. If anything feels off, discontinue contact.</li>
          </ul>
        ),
      },
      {
        id: 'privacy',
        title: 'Privacy comes before exposure',
        content: (
          <ul className="velvet-security-list">
            <li>Not everything submitted to Velvet is published.</li>
            <li>Verification details, internal account information, and private data remain outside public profiles.</li>
            <li>Professionals choose which information they wish to feature.</li>
          </ul>
        ),
      },
      {
        id: 'choices',
        title: 'Safety also relies on smart choices',
        content: (
          <ul className="velvet-security-list">
            <li>No platform eliminates all risks.</li>
            <li>Use a unique password.</li>
            <li>Keep your devices secure.</li>
            <li>Check that you are actually on velvetgirls.club before signing in.</li>
            <li>Never share access codes.</li>
            <li>If something feels off, do not proceed.</li>
          </ul>
        ),
      },
    ]

    return (
      <LegalDocument
        eyebrow="TRUST AND PROTECTION"
        title="Safety at Velvet"
        introduction={
          <div className="velvet-security-intro">
            <p>
              Velvet was created so adults can discover and showcase profiles with
              greater clarity, privacy, and control.
            </p>
            <p>
              We verify the identity and legal age of those who advertise, review
              content before publication, and protect information that should not be
              public.
            </p>
            <p>
              At the same time, we want to be transparent: Velvet helps people find
              each other, but does not participate in contacts, agreements, or meetings
              held inside or outside the platform.
            </p>
          </div>
        }
        sections={enSections}
        showContents={false}
        closing={<SecurityClosing locale={locale} en={true} />}
      />
    )
  }

  const sections: LegalSection[] = [
    {
      id: 'identidade',
      title: 'Identidade e maioridade verificadas',
      content: (
        <ul className="velvet-security-list">
          <li>Para anunciar na Velvet, a profissional precisa confirmar sua identidade e comprovar que tem 18 anos ou mais.</li>
          <li>Essa etapa acontece antes da publicação do perfil.</li>
          <li>Isso ajuda a reduzir perfis falsos e o uso indevido da plataforma.</li>
          <li>A verificação confirma a identidade e a maioridade de quem anuncia. Ela não é uma garantia de comportamento, serviço, pagamento ou encontro.</li>
        </ul>
      ),
    },
    {
      id: 'revisao',
      title: 'Fotos e conteúdos passam por revisão',
      content: (
        <ul className="velvet-security-list">
          <li>Conteúdos não são publicados automaticamente.</li>
          <li>Fotos e mídias passam por revisão antes de aparecer no perfil.</li>
          <li>Itens pendentes, não aprovados ou em nova análise não ficam públicos.</li>
          <li>Isso ajuda a manter a plataforma mais consistente e dentro das regras.</li>
        </ul>
      ),
    },
    {
      id: 'protecao',
      title: 'Sua conta e suas informações são protegidas',
      content: (
        <ul className="velvet-security-list">
          <li>Cada pessoa acessa apenas o que pertence à sua própria conta.</li>
          <li>Informações privadas e dados de verificação não aparecem no perfil público.</li>
          <li>A Velvet adota controles para proteger áreas reservadas da plataforma.</li>
        </ul>
      ),
    },
    {
      id: 'moderacao',
      title: 'Moderação quando algo não está certo',
      content: (
        <ul className="velvet-security-list">
          <li>Perfis e conteúdos podem ser analisados sempre que necessário.</li>
          <li>Quando algo viola regras ou apresenta risco, a Velvet pode revisar, restringir, suspender ou remover a exibição.</li>
          <li>O objetivo é agir com consistência e responsabilidade.</li>
        </ul>
      ),
    },
    {
      id: 'contato',
      title: 'O contato acontece diretamente',
      content: (
        <ul className="velvet-security-list">
          <li>A Velvet ajuda você a descobrir perfis e entender melhor quem está anunciando.</li>
          <li>Quando a profissional publica um canal de contato, a conversa acontece diretamente entre vocês.</li>
          <li>A Velvet não participa da negociação, do pagamento, da contratação ou do encontro, dentro ou fora da plataforma.</li>
          <li>Nunca compartilhe senhas, códigos de acesso, documentos ou dados bancários com desconhecidos. Se algo parecer estranho, interrompa o contato.</li>
        </ul>
      ),
    },
    {
      id: 'privacidade',
      title: 'Privacidade vem antes da exposição',
      content: (
        <ul className="velvet-security-list">
          <li>Nem tudo o que é informado à Velvet deve aparecer publicamente.</li>
          <li>Dados de verificação, informações internas da conta e dados privados ficam fora do perfil público.</li>
          <li>A profissional também escolhe quais informações poderá apresentar no perfil.</li>
        </ul>
      ),
    },
    {
      id: 'escolhas',
      title: 'Segurança também depende de boas escolhas',
      content: (
        <ul className="velvet-security-list">
          <li>Nenhuma plataforma elimina todos os riscos.</li>
          <li>Use senha exclusiva.</li>
          <li>Mantenha seus dispositivos protegidos.</li>
          <li>Confira se está realmente em velvetgirls.club antes de entrar.</li>
          <li>Nunca compartilhe códigos de acesso.</li>
          <li>Se algo parecer errado, não prossiga.</li>
        </ul>
      ),
    },
  ]

  return (
    <LegalDocument
      eyebrow="Confiança e proteção"
      title="Segurança na Velvet"
      introduction={
        <div className="velvet-security-intro">
          <p>
            A Velvet foi criada para que adultos possam descobrir e apresentar perfis
            com mais clareza, privacidade e controle.
          </p>
          <p>
            Verificamos a identidade e a maioridade de quem anuncia, revisamos
            conteúdos antes da publicação e protegemos informações que não devem ficar
            públicas.
          </p>
          <p>
            Ao mesmo tempo, queremos ser transparentes: a Velvet ajuda pessoas a se
            encontrarem, mas não participa dos contatos, acordos ou encontros
            realizados dentro ou fora da plataforma.
          </p>
        </div>
      }
      sections={sections}
      showContents={false}
      closing={<SecurityClosing locale={locale} en={false} />}
    />
  )
}
