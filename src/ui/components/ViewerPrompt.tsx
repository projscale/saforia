import React from 'react'
import { PasswordInput } from '../PasswordInput'

type Props = {
  title?: string
  confirmLabel?: string
  busy?: boolean
  disabled?: boolean
  autoFocus?: boolean
  describedBy?: string
  onConfirm: (viewerPassword: string) => void
  onCancel?: () => void
}

export function ViewerPrompt({ title = 'Viewer password', confirmLabel = 'Confirm', busy, disabled, autoFocus, describedBy, onConfirm, onCancel }: Props) {
  const [viewer, setViewer] = React.useState('')
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!viewer || busy) return; onConfirm(viewer); setViewer('') }}>
      {/* hidden username for browser heuristics */}
      <input type="text" name="username" autoComplete="username" aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} />
      {title && <h3>{title}</h3>}
      <PasswordInput label="Viewer password" value={viewer} onChange={setViewer} autoComplete="current-password" describedBy={describedBy} autoFocus={autoFocus} />
      <div className="row" style={{ marginTop: 8 }}>
        <button type="submit" className="btn primary" disabled={!viewer || !!busy || !!disabled} aria-busy={busy ? 'true' : 'false'}>
          {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> …</span>) : (confirmLabel || 'Confirm')}
        </button>
        {onCancel && <button type="button" className="btn" onClick={() => { setViewer(''); onCancel() }}>Cancel</button>}
      </div>
    </form>
  )
}
