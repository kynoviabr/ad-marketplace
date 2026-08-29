import Image from 'next/image'
import Link from 'next/link'
import type { ProfileWithMedia } from './public-profile-grid'

export function HomeHero({ profiles }: { profiles: ProfileWithMedia[] }) {
  const [primary, secondary] = profiles.filter((profile) => profile.mediaUrl)
  return (
    <section className="velvet-home-hero">
      <div className="velvet-home-hero-copy">
        <p className="velvet-overline">SÃO PAULO · PERFIS VERIFICADOS</p>
        <h1>Encontre perfis<br />em São Paulo</h1>
        <p>Explore profissionais por região e entre em contato diretamente.</p>
        <form className="velvet-home-search" action="/sao-paulo">
          <span aria-hidden="true">⌕</span>
          <label><small>LOCALIZAÇÃO</small><input name="local" placeholder="Onde você quer explorar?" /></label>
          <button type="submit">Buscar</button>
        </form>
      </div>
      {primary ? <div className={`velvet-home-hero-art${secondary ? '' : ' is-single'}`} aria-label="Seleção editorial Velvet">
        <figure className="velvet-home-hero-main"><Image src={primary.mediaUrl!} alt={`Retrato editorial de ${primary.stageName}`} fill priority sizes="(max-width: 700px) 72vw, 34vw" /><figcaption><span>{primary.stageName}{primary.publicAge ? `, ${primary.publicAge}` : ''}</span><small>{primary.primaryLocation?.name ?? 'São Paulo'} · São Paulo</small></figcaption></figure>
        {secondary ? <figure className="velvet-home-hero-offset"><Image src={secondary.mediaUrl!} alt={`Retrato editorial de ${secondary.stageName}`} fill sizes="(max-width: 700px) 38vw, 17vw" /><figcaption><span>{secondary.stageName}{secondary.publicAge ? `, ${secondary.publicAge}` : ''}</span><small>{secondary.primaryLocation?.name ?? 'São Paulo'} · São Paulo</small></figcaption></figure> : null}
        <span className="velvet-home-hero-index">V / 01</span>
      </div> : <Link className="velvet-home-hero-placeholder" href="/sao-paulo"><span>V</span><small>EXPLORAR SÃO PAULO →</small></Link>}
    </section>
  )
}
