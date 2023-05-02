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
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3>Initial setup</h3>
      <form onSubmit={(e) => { e.preventDefault(); if (valid && !busy) onSubmit() }} className="col">
        <PasswordInput label="Master password" value={state.master} onChange={v => setState({ ...state, master: v })} placeholder="Strong master" autoComplete="new-password" />
        <PasswordInput label="Confirm master password" value={state.master2} onChange={v => setState({ ...state, master2: v })} placeholder="Repeat master" autoComplete="new-password" />
        <PasswordInput label="Viewer password (used to encrypt master)" value={state.viewer} onChange={v => setState({ ...state, viewer: v })} placeholder="Device-only viewer" autoComplete="new-password" describedBy={viewerHelpId} />
        <PasswordInput label="Confirm viewer password" value={state.viewer2} onChange={v => setState({ ...state, viewer2: v })} placeholder="Repeat viewer" autoComplete="new-password" />
        {error && <div className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
        <div className="row">
          <button className="btn primary" disabled={busy || !valid}>Save master</button>
        </div>
        <p className="muted" id={viewerHelpId}>Viewer password is never stored; it only decrypts the master on demand. You can choose a different viewer password per device.</p>
      </form>
    </div>
  )
}
