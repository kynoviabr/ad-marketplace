import { VelvetBadge } from '@/components/ui/velvet-badge'
import type { PublicAvailabilitySignal } from '@/modules/agenda/types'

interface PublicAvailabilityBadgeProps {
  signal: PublicAvailabilitySignal
  locale?: string
  className?: string
}

/**
 * Renders a privacy-safe, high-level public availability badge on eligible profile detail pages.
 * Never displays raw calendar slots, UUIDs, or private schedule data.
 */
export function PublicAvailabilityBadge({
  signal,
  locale = 'pt-BR',
  className = '',
}: PublicAvailabilityBadgeProps) {
  if (signal.status === 'NO_SIGNAL') {
    return null
  }

  const isPt = locale === 'pt-BR'

  if (signal.status === 'AVAILABLE_TODAY') {
    return (
      <VelvetBadge
        variant="success"
        className={`profile-availability-badge profile-availability-badge--today ${className}`.trim()}
        icon="●"
      >
        {isPt ? signal.labelPt : signal.labelEn}
      </VelvetBadge>
    )
  }

  return (
    <VelvetBadge
      variant="neutral"
      className={`profile-availability-badge profile-availability-badge--week ${className}`.trim()}
      icon="●"
    >
      {isPt ? signal.labelPt : signal.labelEn}
    </VelvetBadge>
  )
}
