import React from 'react'
import { invoke } from '../../bridge'
import { PasswordInput } from '../PasswordInput'

export function Fingerprint({ onToast }: { onToast: (t: string, k?: 'info'|'success'|'error') => void }) {
  const [viewer, setViewer] = React.useState('')
  const [fp, setFp] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const helpId = React.useId()
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Master fingerprint</h3>
      <form className="row" onSubmit={async (e) => { e.preventDefault(); if (!viewer || busy) return; setBusy(true); try { const r = await invoke<string>('master_fingerprint', { viewerPassword: viewer }); setFp(r); setViewer('') } catch (err: any) { onToast('Failed: ' + String(err), 'error') } finally { setBusy(false) } }}>
        <PasswordInput label="Viewer password" value={viewer} onChange={setViewer} autoComplete="current-password" describedBy={helpId} />
        <button type="submit" className="btn" disabled={!viewer || busy}>{busy ? '…' : 'Show'}</button>
      </form>
      <p className="muted" id={helpId}>Enter the viewer password for this device to verify the current master password identity (MD5 fingerprint).</p>
      {fp && (
        <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
          <span className="muted">Fingerprint (MD5 of master):</span>
          <span className="password">{fp}</span>
        </div>
      )}
    </div>
  )
}
