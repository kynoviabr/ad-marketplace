import type { ReactNode } from 'react'

export interface LegalSection {
  id: string
  title: string
  content: ReactNode
}

export function LegalDocument({
  eyebrow,
  title,
  introduction,
  sections,
  showContents = true,
}: {
  eyebrow: string
  title: string
  introduction: ReactNode
  sections: LegalSection[]
  showContents?: boolean
}) {
  return (
    <article className="velvet-legal-document">
      <header className="velvet-legal-hero">
        <p className="velvet-overline">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="velvet-legal-introduction">{introduction}</div>
      </header>

      {showContents && (
        <nav className="velvet-legal-contents" aria-label={`Contents · ${title}`}>
          <p>Índice / Contents</p>
          <ol>
            {sections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ol>
        </nav>
      )}

      <div className="velvet-legal-sections">
        {sections.map((section, index) => (
          <section id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </article>
  )
}
