import React from 'react'
import { PasswordInput } from '../PasswordInput'

export type SetupState = { master: string; master2: string; viewer: string; viewer2: string }

export function SetupScreen({ state, setState, busy, error, onSubmit }: {
  state: SetupState,
  setState: (s: SetupState) => void,
  busy: boolean,
  error?: string,
  onSubmit: () => void,
}) {
  const valid = !!state.master && !!state.viewer && state.master === state.master2 && state.viewer === state.viewer2
  const viewerHelpId = React.useId()
  const masterErrId = React.useId()
  const viewerErrId = React.useId()
  const masterMismatch = !!state.master && !!state.master2 && state.master !== state.master2
  const viewerMismatch = !!state.viewer && !!state.viewer2 && state.viewer !== state.viewer2
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Initial setup</h3>
      <form onSubmit={(e) => { e.preventDefault(); if (valid && !busy) onSubmit() }} className="col">
        {/* hidden username for browser heuristics */}
        <input type="text" name="username" autoComplete="username" aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} />
        <PasswordInput label="Master password" value={state.master} onChange={v => setState({ ...state, master: v })} placeholder="Strong master" autoComplete="new-password" />
        <div className="input-group">
          <PasswordInput label="Confirm master password" value={state.master2} onChange={v => setState({ ...state, master2: v })} placeholder="Repeat master" autoComplete="new-password" describedBy={masterMismatch ? masterErrId : undefined} />
          {masterMismatch && <span id={masterErrId} className="muted" style={{ color: 'var(--danger)' }} aria-live="polite">Master passwords do not match</span>}
        </div>
        <PasswordInput label="Viewer password (used to encrypt master)" value={state.viewer} onChange={v => setState({ ...state, viewer: v })} placeholder="Device-only viewer" autoComplete="new-password" describedBy={viewerHelpId} />
        <div className="input-group">
          <PasswordInput label="Confirm viewer password" value={state.viewer2} onChange={v => setState({ ...state, viewer2: v })} placeholder="Repeat viewer" autoComplete="new-password" describedBy={viewerMismatch ? viewerErrId : undefined} />
          {viewerMismatch && <span id={viewerErrId} className="muted" style={{ color: 'var(--danger)' }} aria-live="polite">Viewer passwords do not match</span>}
        </div>
        {error && <div role="alert" aria-live="assertive" className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
        <div className="row">
          <button className="btn primary" disabled={busy || !valid} aria-busy={busy ? 'true' : 'false'}>
            {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Saving…</span>) : 'Save master'}
          </button>
        </div>
        <p className="muted" id={viewerHelpId}>Viewer password is never stored; it only decrypts the master on demand. You can choose a different viewer password per device.</p>
      </form>
    </div>
  )
}
