import React from 'react'
import { useI18n } from '../i18n'
import { PasswordInput } from '../PasswordInput'

type Props = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  fieldLabel?: string
  busy?: boolean
  disabled?: boolean
  autoFocus?: boolean
  autoCloseMs?: number
  describedBy?: string
  onConfirm: (viewerPassword: string) => void
  onCancel?: () => void
}

export function ViewerPrompt({ title = 'Viewer password', confirmLabel = 'Confirm', cancelLabel = 'Cancel', fieldLabel = 'Viewer password', busy, disabled, autoFocus, autoCloseMs, describedBy, onConfirm, onCancel }: Props) {
  const [viewer, setViewer] = React.useState('')
  const timerRef = React.useRef<number | null>(null)
  const intervalRef = React.useRef<number | null>(null)
  const [secsLeft, setSecsLeft] = React.useState<number | null>(null)
  const { t } = useI18n()
  const progressRef = React.useRef<number>(0)
  React.useEffect(() => {
    if (!autoCloseMs || !onCancel) return
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const start = Date.now()
    setSecsLeft(Math.ceil(autoCloseMs / 1000))
    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start
      const rem = Math.max(0, autoCloseMs - elapsed)
      setSecsLeft(Math.ceil(rem / 1000))
    }, 250)
    timerRef.current = window.setTimeout(() => { setViewer(''); onCancel() }, autoCloseMs)
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [autoCloseMs, onCancel])
  return (
    <form onKeyDown={(e) => { if (e.key === 'Escape' && onCancel) { e.stopPropagation(); onCancel() } }} onSubmit={(e) => { e.preventDefault(); if (!viewer || busy) return; onConfirm(viewer); setViewer('') }}>
      {/* hidden username for browser heuristics */}
      <input type="text" name="username" autoComplete="username" aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} />
      {title && <h3>{title}</h3>}
      <PasswordInput label={fieldLabel} value={viewer} onChange={setViewer} autoComplete="current-password" describedBy={describedBy} autoFocus={autoFocus} />
      {secsLeft !== null && (
        <>
          <div className="muted" aria-live="polite">{t('autoCloseIn')} {secsLeft}s</div>
          <div className={`progress ${secsLeft <= 3 ? 'danger' : (secsLeft <= 7 ? 'warn' : '')}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, ((autoCloseMs! - Math.max(0,(secsLeft||0)*1000)) / autoCloseMs!) * 100)}>
            <div className="bar" style={{ width: `${Math.min(100, ((autoCloseMs! - Math.max(0,(secsLeft||0)*1000)) / autoCloseMs!) * 100)}%` }}></div>
          </div>
        </>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <button type="submit" className="btn primary" disabled={!viewer || !!busy || !!disabled} aria-busy={busy ? 'true' : 'false'}>
          {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> …</span>) : (confirmLabel || 'Confirm')}
        </button>
        {onCancel && <button type="button" className="btn" onClick={() => { setViewer(''); onCancel() }}>{cancelLabel}</button>}
      </div>
    </form>
  )
}
