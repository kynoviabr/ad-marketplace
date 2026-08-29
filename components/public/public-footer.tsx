import Link from 'next/link'

export async function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="velvet-public-footer">
      <Link href="/" className="velvet-public-wordmark">velvet<span>.</span></Link>
      <p>Uma plataforma independente para descobrir profissionais verificados.</p>
      <nav aria-label="Rodapé"><Link href="/#sobre">Sobre</Link><Link href="/seguranca">Segurança</Link><Link href="/termos">Termos</Link><Link href="/privacidade">Privacidade</Link></nav>
      <small>© {currentYear} Velvet · Somente para maiores de 18 anos</small>
    </footer>
  )
}
