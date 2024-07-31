import React from 'react'
import { invoke } from '../../bridge'
import { PasswordInput } from '../PasswordInput'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { useI18n } from '../i18n'

export function Fingerprint({ onToast }: { onToast: (t: string, k?: 'info'|'success'|'error') => void }) {
  const { t } = useI18n()
  const [viewer, setViewer] = React.useState('')
  const [fp, setFp] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const helpId = React.useId()
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>{t('fingerprintTitle')}</h3>
      <ViewerPrompt title={undefined} confirmLabel={t('reveal')} busy={busy} onConfirm={async (v) => {
        setBusy(true)
        try { const r = await invoke<string>('master_fingerprint', { viewerPassword: v }); setFp(r) }
        catch (err: any) { onToast(t('failedPrefix') + String(err), 'error') }
        finally { setBusy(false) }
      }} />
      <p className="muted" id={helpId}>{t('fingerprintHelp')}</p>
      {fp && (
        <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
          <span className="muted">{t('fingerprintLabel')}</span>
          <span className="password">{fp}</span>
        </div>
      )}
    </div>
  )
}
