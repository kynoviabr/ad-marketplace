import type { HTMLAttributes, ReactNode } from 'react'

export type VelvetEyebrowVariant = 'default' | 'inverse' | 'compact'

export interface VelvetEyebrowProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
  variant?: VelvetEyebrowVariant
  as?: 'p' | 'span' | 'div'
}

export function VelvetEyebrow({
  children,
  variant = 'default',
  as: Component = 'p',
  className = '',
  ...props
}: VelvetEyebrowProps) {
  const variantClass = variant === 'inverse' ? ' velvet-overline--inverse' : variant === 'compact' ? ' velvet-overline--compact' : ''
  return (
    <Component className={`velvet-overline${variantClass} ${className}`.trim()} {...props}>
      {children}
    </Component>
  )
}
