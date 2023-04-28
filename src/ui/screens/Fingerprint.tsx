import React from 'react'
import { invoke } from '../../bridge'
import { PasswordInput } from '../PasswordInput'

export function Fingerprint({ onToast }: { onToast: (t: string, k?: 'info'|'success'|'error') => void }) {
  const [viewer, setViewer] = React.useState('')
  const [fp, setFp] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Master fingerprint</h3>
      <div className="row">
        <PasswordInput label="Viewer password" value={viewer} onChange={setViewer} autoComplete="current-password" />
        <button className="btn" disabled={!viewer || busy} onClick={async () => {
          setBusy(true)
          try { const r = await invoke<string>('master_fingerprint', { viewerPassword: viewer }); setFp(r); setViewer('') }
          catch (err: any) { onToast('Failed: ' + String(err), 'error') }
          finally { setBusy(false) }
        }}>Show</button>
      </div>
      {fp && (
        <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
          <span className="muted">Fingerprint (MD5 of master):</span>
          <span className="password">{fp}</span>
        </div>
      )}
    </div>
  )
}

