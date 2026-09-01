import type { ReactNode } from 'react'

export interface VelvetSectionHeaderProps {
  title: string
  eyebrow?: string
  description?: string
  action?: ReactNode
  headingLevel?: 1 | 2 | 3
  className?: string
}

export function VelvetSectionHeader({
  title,
  eyebrow,
  description,
  action,
  headingLevel = 2,
  className = '',
}: VelvetSectionHeaderProps) {
  const headingClass = 'velvet-section-header__title'
  const heading = headingLevel === 1
    ? <h1 className={headingClass}>{title}</h1>
    : headingLevel === 3
      ? <h3 className={headingClass}>{title}</h3>
      : <h2 className={headingClass}>{title}</h2>

  return (
    <header className={`velvet-section-header ${className}`.trim()}>
      {eyebrow ? <p className="velvet-section-header__eyebrow">{eyebrow}</p> : null}
      {heading}
      {description ? <p className="velvet-section-header__description">{description}</p> : null}
      {action ? <div className="velvet-section-header__action">{action}</div> : null}
    </header>
  )
}
