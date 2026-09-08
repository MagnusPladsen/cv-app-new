'use client'

import { Cloud, CloudOff, HardDrive, RefreshCw, TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { useSyncStatus } from '@/lib/sync/status'

const ICONS = {
  off: HardDrive,
  idle: Cloud,
  syncing: RefreshCw,
  offline: CloudOff,
  error: TriangleAlert,
} as const

const LABEL_KEYS = {
  off: 'localOnly',
  idle: 'synced',
  syncing: 'syncing',
  offline: 'offline',
  error: 'error',
} as const

export function SyncStatusBadge() {
  const t = useTranslations('auth')
  const status = useSyncStatus((state) => state.status)
  const Icon = ICONS[status]
  const label = t(LABEL_KEYS[status])

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        status === 'error' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'
      }`}
    >
      <Icon
        aria-hidden="true"
        className={`size-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`}
      />
      <span>{label}</span>
    </span>
  )
}
