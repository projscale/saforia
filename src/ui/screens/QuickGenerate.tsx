import React from 'react'
import { invoke } from '../../bridge'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { emit } from '../events'

export function QuickGenerate({ methods, defaultMethod, autosaveQuick, blocked, onToast }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autosaveQuick: boolean,
  blocked: boolean,
  onToast: (text: string, kind?: 'info'|'success'|'error') => void,
}) {
  const [postfix, setPostfix] = React.useState('')
  const [method, setMethod] = React.useState(defaultMethod)
  const [save, setSave] = React.useState(autosaveQuick)
  const [label, setLabel] = React.useState('')
  const [output, setOutput] = React.useState<string | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const holdTimer = React.useRef<number | null>(null)
  const viewerHelpId = React.useId()

  React.useEffect(() => { setMethod(defaultMethod) }, [defaultMethod])
  React.useEffect(() => { setSave(autosaveQuick) }, [autosaveQuick])

  async function copy(text: string) {
    let ok = false
    try { ok = await invoke<boolean>('write_clipboard_native', { text }) } catch {}
    if (!ok) { try { await (navigator as any).clipboard?.writeText?.(text); ok = true } catch {} }
    if (ok) {
      onToast('Copied to clipboard', 'success')
      const ms = 30000
      try { const { emit } = await import('../events'); (emit as any)('clipboard:start', ms) } catch {}
      setTimeout(async () => {
        try { await invoke('clear_clipboard_native') } catch {}
        try { await (navigator as any).clipboard?.writeText?.('') } catch {}
        try { const { emit } = await import('../events'); (emit as any)('clipboard:stop') } catch {}
      }, ms)
    } else {
      onToast('Copy failed. Please copy manually.', 'error')
    }
  }

  function deriveLabelFromPostfix(p: string) {
    const trimmed = (p || '').trim()
    if (!trimmed) return ''
    // simple heuristic: domain without TLD, else capitalize whole
    const parts = trimmed.split('.')
    const base = parts.length > 1 ? parts[0] : trimmed
    return base.slice(0, 1).toUpperCase() + base.slice(1)
  }

  async function generateNow(viewerPassword: string) {
    if (!viewerPassword || !postfix) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_password', { viewerPassword, postfix, methodId: method })
      setOutput(pw); setRevealed(false)
      if (save) {
        const lbl = label.trim() || deriveLabelFromPostfix(postfix)
        if (lbl) {
          try { await invoke('add_entry', { label: lbl, postfix, methodId: method }); emit('entries:changed') } catch {}
        }
      }
    } catch (err: any) { onToast('Failed to generate: ' + String(err), 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="card" style={{ flex: 1 }}>
      <h3>Quick generate</h3>
      <div className="col">
        <label>Postfix</label>
        <input value={postfix} onChange={e => setPostfix(e.target.value)} placeholder="example.com" />
        <label>Method</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="row" style={{ alignItems: 'end' }}>
          <div className="col">
            <div className="row" style={{ alignItems: 'center' }}>
              <input id="save-postfix" type="checkbox" checked={save} onChange={e => { setSave(e.target.checked); if (e.target.checked && !label && postfix) setLabel(deriveLabelFromPostfix(postfix)) }} />
              <label htmlFor="save-postfix">Save this postfix</label>
            </div>
          </div>
          {save && (
            <div className="col" style={{ flex: 1 }}>
              <label>Label</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., Example" />
            </div>
          )}
        </div>

        <ViewerPrompt
          title={undefined}
          confirmLabel={busy ? 'Generating…' : 'Generate'}
          busy={busy}
          disabled={blocked || !postfix}
          describedBy={viewerHelpId}
          onConfirm={generateNow}
        />
      </div>
      <p className="muted" id={viewerHelpId}>Viewer password is required on each generation and is never stored.</p>
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
              aria-label={revealed ? 'Release to hide password' : 'Hold to reveal password'} title={revealed ? 'Release to hide' : 'Hold to reveal'}>{revealed ? 'Release to hide' : 'Hold to reveal'}</button>
              <button className="btn" onClick={() => setRevealed(r => !r)} disabled={blocked || busy} aria-label={revealed ? 'Hide generated password' : 'Reveal generated password'} title={revealed ? 'Hide password' : 'Reveal password'}>{revealed ? 'Hide' : 'Reveal'}</button>
              <button className="btn" onClick={() => copy(output)} disabled={blocked || busy} aria-label="Copy generated password" title="Copy password">Copy</button>
            </div>
          </div>
          <p className="muted">Cleared automatically after ~30 seconds.</p>
        </div>
      )}
    </div>
  )
}
