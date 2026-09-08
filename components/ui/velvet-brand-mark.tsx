import React from 'react'

export interface VelvetBrandMarkProps {
  size?: 'chip' | 'small' | 'large' | 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Canonical Velvet circular 'v' brand mark.
 * Renders the approved lowercase editorial serif "v" inside the signature
 * thin circular aubergine outline with cream/off-white interior.
 *
 * Semantic usage: Velvet brand identity, identity/adult verification.
 */
export function VelvetBrandMark({
  size = 'chip',
  className = '',
}: VelvetBrandMarkProps) {
  const sizeClass = size === 'chip' ? 'velvet-brand-mark--chip' : `velvet-brand-mark--${size}`

  return (
    <span
      className={`velvet-brand-mark ${sizeClass} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="velvet-brand-monogram">v</span>
    </span>
  )
}
