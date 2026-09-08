import React from 'react'
import { VelvetBrandMark } from './velvet-brand-mark'

export interface VelvetVerifiedChipProps {
  label?: string
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function VelvetVerifiedChip({
  label = 'VERIFICADA 18+',
  size = 'md',
  showLabel = true,
  className = '',
}: VelvetVerifiedChipProps) {
  return (
    <div
      className={`velvet-verified-chip velvet-verified-chip--${size} ${className}`.trim()}
      aria-label={label}
    >
      <i className="velvet-verified-chip-icon" aria-hidden="true">
        <VelvetBrandMark size="chip" />
      </i>
      {showLabel && <span className="velvet-verified-chip-label">{label}</span>}
    </div>
  )
}
