import React from 'react'
import { VelvetAppTopBar } from './velvet-app-top-bar'
import { VelvetAppBottomNav } from './velvet-app-bottom-nav'

export interface VelvetAppShellProps {
  children?: React.ReactNode
  role?: 'ADVERTISER' | 'CLIENT' | 'ADMIN' | null
}

export function VelvetAppShell({ children, role = 'ADVERTISER' }: VelvetAppShellProps) {
  return (
    <div className="velvet-app-shell-root">
      {/* 1. App Top Bar (standalone only) */}
      <VelvetAppTopBar role={role} />

      {/* 2. Main content with standalone bottom-nav padding */}
      <div className="velvet-app-main-content">
        {children}
      </div>

      {/* 3. App Bottom Navigation (standalone mobile/tablet only) */}
      <VelvetAppBottomNav role={role} />
    </div>
  )
}
