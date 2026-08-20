import Link from 'next/link'
import { getMarketplaceName } from '@/lib/brand'

/**
 * PublicFooter — canonical footer for all public marketplace pages.
 *
 * Server Component. Renders brand name from server env var.
 * Contains only routes that actually exist in the application.
 *
 * Visual contract (FASE 12.1C):
 * - Restrained, 4-column desktop / stacked mobile
 * - Warm muted background (--color-surface-muted)
 * - +18 notice required
 * - No dead links — only existing routes
 *
 * Routes available at FASE 12.2A:
 * - / (Home)
 * - /sao-paulo (City search)
 * - /login, /signup (Auth)
 * - /anuncie (placeholder — will be full page in FASE 12.2F)
 *
 * Legal routes (termos, privacidade) not yet created — rendered
 * as non-linked text to avoid dead links.
 */
export async function PublicFooter() {
  const brandName = getMarketplaceName()
  const currentYear = new Date().getFullYear()

  return (
    <footer
      role="contentinfo"
      style={{
        background: 'var(--color-surface-muted)',
        borderTop: '1px solid var(--color-border)',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-xl)',
          margin: '0 auto',
          padding: '48px 16px 32px',
        }}
      >
        {/* Footer grid */}
        <div className="public-footer-grid">
          {/* Brand column */}
          <div>
            <Link
              href="/"
              aria-label={`${brandName} — página inicial`}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--color-foreground)',
                textDecoration: 'none',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              {brandName}
            </Link>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '12px',
                color: 'var(--color-foreground-muted)',
                lineHeight: 1.5,
              }}
            >
              São Paulo, SP — Brasil
            </p>
          </div>

          {/* Explorar column */}
          <div>
            <FooterColumnHeading>Explorar</FooterColumnHeading>
            <FooterLink href="/sao-paulo">São Paulo</FooterLink>
          </div>

          {/* Para profissionais column */}
          <div>
            <FooterColumnHeading>Para profissionais</FooterColumnHeading>
            <FooterLink href="/anuncie">Anuncie seu perfil</FooterLink>
            <FooterLink href="/login">Entrar</FooterLink>
            <FooterLink href="/signup">Criar conta</FooterLink>
          </div>

          {/* Informações column */}
          <div>
            <FooterColumnHeading>Informações</FooterColumnHeading>
            {/* Legal routes not yet created — non-linked placeholders */}
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--color-foreground-muted)',
                marginBottom: '6px',
              }}
            >
              Termos de Uso
            </p>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--color-foreground-muted)',
                marginBottom: '6px',
              }}
            >
              Privacidade
            </p>
          </div>
        </div>

        {/* Footer bottom */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            marginTop: '32px',
            paddingTop: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: 'var(--color-foreground-muted)',
            }}
          >
            © {currentYear} {brandName}. Todos os direitos reservados.
          </p>
          {/* +18 compliance notice — required */}
          <p
            role="note"
            aria-label="Conteúdo restrito a maiores de 18 anos"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-foreground-muted)',
              padding: '3px 8px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            +18 somente
          </p>
        </div>
      </div>

      {/* Responsive grid styles */}
      <style>{`
        .public-footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        @media (min-width: 768px) {
          .public-footer-grid {
            grid-template-columns: 1.5fr 1fr 1fr 1fr;
            gap: 40px;
          }
        }
      `}</style>
    </footer>
  )
}

function FooterColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'var(--font-body)',
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--color-foreground)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '12px',
      }}
    >
      {children}
    </p>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        color: 'var(--color-foreground-muted)',
        textDecoration: 'none',
        marginBottom: '6px',
        transition: 'color 120ms ease-out',
      }}
    >
      {children}
    </Link>
  )
}
