import Link from 'next/link'

export function HomeTrustSection() {
  return (
    <section className="velvet-home-trust">
      <p className="velvet-overline">CONFIANÇA E TRANSPARÊNCIA</p>
      <span aria-hidden="true">V</span>
      <h2>Identidade confirmada.<br />Conexões diretas.</h2>
      <div><strong>IDENTIDADE VERIFICADA</strong><i>·</i><strong>MAIORIDADE CONFIRMADA</strong><i>·</i><strong>CONTATO DIRETO</strong></div>
      <p>Verificamos identidade e maioridade para que cada encontro comece com mais clareza. O contato acontece diretamente entre vocês.</p>
      <Link href="/anuncie">Como funciona a verificação <span>→</span></Link>
    </section>
  )
}
