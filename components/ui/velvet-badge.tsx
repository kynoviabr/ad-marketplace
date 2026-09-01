import type { HTMLAttributes, ReactNode } from 'react'

export type VelvetBadgeVariant = 'neutral' | 'verified' | 'success' | 'warning' | 'danger'

export interface VelvetBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: VelvetBadgeVariant
  icon?: ReactNode
}

export function VelvetBadge({
  children,
  variant = 'neutral',
  icon,
  className = '',
  ...props
}: VelvetBadgeProps) {
  return (
    <span className={`velvet-badge velvet-badge--${variant} ${className}`.trim()} {...props}>
      {icon ? <span className="velvet-badge__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </span>
  )
}
