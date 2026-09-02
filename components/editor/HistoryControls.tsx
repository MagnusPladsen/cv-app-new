'use client'

import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Binds Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z, except while focus is in a field.
 * Inside a text input the browser's own undo is the one the user expects.
 */
export function useHistoryShortcuts({
  onUndo,
  onRedo,
}: {
  onUndo: () => void
  onRedo: () => void
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return

      const target = event.target as HTMLElement | null
      if (target && (EDITABLE.has(target.tagName) || target.isContentEditable)) return

      event.preventDefault()
      if (event.shiftKey) onRedo()
      else onUndo()
    }

    window.document.addEventListener('keydown', onKeyDown)
    return () => window.document.removeEventListener('keydown', onKeyDown)
  }, [onUndo, onRedo])
}

export function HistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  const t = useTranslations('editor')
  useHistoryShortcuts({ onUndo, onRedo })

  const buttonClass =
    'rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium transition hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-neutral-300'

  return (
    <div className="flex gap-2">
      <button className={buttonClass} disabled={!canUndo} onClick={onUndo} type="button">
        {t('undo')}
      </button>
      <button className={buttonClass} disabled={!canRedo} onClick={onRedo} type="button">
        {t('redo')}
      </button>
    </div>
  )
}
