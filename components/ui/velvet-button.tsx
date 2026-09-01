import type { ButtonHTMLAttributes } from 'react'

export type VelvetButtonVariant = 'primary' | 'secondary' | 'text' | 'danger'

export interface VelvetButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VelvetButtonVariant
  loading?: boolean
}

export function VelvetButton({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  ...props
}: VelvetButtonProps) {
  return (
    <button
      {...props}
      className={`velvet-button velvet-button--${variant} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="velvet-button__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  )
}
