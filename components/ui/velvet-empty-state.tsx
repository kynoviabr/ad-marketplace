import type { ReactNode } from 'react'

export interface VelvetEmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function VelvetEmptyState({ title, description, action, className = '' }: VelvetEmptyStateProps) {
  return (
    <section className={`velvet-empty-state ${className}`.trim()}>
      <h2 className="velvet-empty-state__title">{title}</h2>
      {description ? <p className="velvet-empty-state__description">{description}</p> : null}
      {action ? <div className="velvet-empty-state__action">{action}</div> : null}
    </section>
  )
}
