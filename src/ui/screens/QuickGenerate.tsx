import React from 'react'
import { invoke } from '../../bridge'
import { PasswordInput } from '../PasswordInput'

export function QuickGenerate({ methods, defaultMethod, blocked, onToast }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  blocked: boolean,
  onToast: (text: string, kind?: 'info'|'success'|'error') => void,
}) {
  const [postfix, setPostfix] = React.useState('')
  const [method, setMethod] = React.useState(defaultMethod)
  const [viewer, setViewer] = React.useState('')
  const [output, setOutput] = React.useState<string | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const holdTimer = React.useRef<number | null>(null)

  React.useEffect(() => { setMethod(defaultMethod) }, [defaultMethod])

  async function copy(text: string) {
    let ok = false
    try { ok = await invoke<boolean>('write_clipboard_native', { text }) } catch {}
    if (!ok) {
      try { await (navigator as any).clipboard?.writeText?.(text); ok = true } catch {}
    }
    if (ok) {
      onToast('Copied to clipboard', 'success')
      setTimeout(async () => { try { await invoke('clear_clipboard_native') } catch {}; try { await (navigator as any).clipboard?.writeText?.('') } catch {} }, 30000)
    } else {
      onToast('Copy failed. Please copy manually.', 'error')
    }
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!viewer || !postfix) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_password', { viewerPassword: viewer, postfix, methodId: method })
      setOutput(pw); setRevealed(false); setViewer('')
    } catch (err: any) { onToast('Failed to generate: ' + String(err), 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="card" style={{ flex: 1 }}>
      <h3>Quick generate</h3>
      <form onSubmit={onGenerate} className="col">
        <label>Postfix</label>
        <input value={postfix} onChange={e => setPostfix(e.target.value)} placeholder="example.com" />
        <label>Method</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <PasswordInput label="Viewer password (required each time)" value={viewer} onChange={setViewer} autoComplete="current-password" />
        <div className="row">
          <button className="btn primary" disabled={busy || !postfix || !viewer || blocked}>
            {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Generating…</span>) : 'Generate'}
          </button>
        </div>
      </form>
      {output && (
        <div style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="password">{revealed ? output : '•'.repeat(Math.min(12, output.length))}</div>
            <div className="row">
              <button className="btn" disabled={blocked}
                onPointerDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                onPointerUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                onPointerCancel={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                onMouseDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                onMouseUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                onTouchStart={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                onTouchEnd={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
              >{revealed ? 'Release to hide' : 'Hold to reveal'}</button>
              <button className="btn" onClick={() => setRevealed(r => !r)} disabled={blocked || busy}>{revealed ? 'Hide' : 'Reveal'}</button>
              <button className="btn" onClick={() => copy(output)} disabled={blocked || busy}>Copy</button>
            </div>
          </div>
          <p className="muted">Cleared automatically after ~30 seconds.</p>
        </div>
      )}
    </div>
  )
}
