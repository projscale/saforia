import React from 'react'
import { invoke } from '../../bridge'
import { PasswordInput } from '../PasswordInput'
import { ViewerPrompt } from '../components/ViewerPrompt'

export function Fingerprint({ onToast }: { onToast: (t: string, k?: 'info'|'success'|'error') => void }) {
  const [viewer, setViewer] = React.useState('')
  const [fp, setFp] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const helpId = React.useId()
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Master fingerprint</h3>
      <ViewerPrompt title={undefined} confirmLabel={busy ? '…' : 'Show'} busy={busy} onConfirm={async (v) => {
        setBusy(true)
        try { const r = await invoke<string>('master_fingerprint', { viewerPassword: v }); setFp(r) }
        catch (err: any) { onToast('Failed: ' + String(err), 'error') }
        finally { setBusy(false) }
      }} />
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
