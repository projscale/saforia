import React from 'react'
import { invoke } from '../../bridge'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { emit, on } from '../events'

type Entry = { id: string; label: string; postfix: string; method_id: string; created_at: number }

export function Unified({ methods, defaultMethod, autosaveQuick, blocked, onToast }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autosaveQuick: boolean,
  blocked: boolean,
  onToast: (t: string, k?: 'info'|'success'|'error') => void,
}) {
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [search, setSearch] = React.useState('')
  const [method, setMethod] = React.useState(defaultMethod)
  const [postfix, setPostfix] = React.useState('')
  const [save, setSave] = React.useState(autosaveQuick)
  const [label, setLabel] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [output, setOutput] = React.useState<string | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const holdTimer = React.useRef<number | null>(null)
  const viewerHelpId = React.useId()
  const [pwModal, setPwModal] = React.useState<{ id: string, open: boolean }>({ id: '', open: false })

  React.useEffect(() => { setMethod(defaultMethod) }, [defaultMethod])
  React.useEffect(() => { setSave(autosaveQuick) }, [autosaveQuick])

  async function load() { try { setEntries(await invoke<Entry[]>('list_entries')) } catch {} }
  React.useEffect(() => { load() }, [])
  React.useEffect(() => on('entries:changed', () => { load() }), [])

  function deriveLabelFromPostfix(p: string) {
    const trimmed = (p || '').trim(); if (!trimmed) return ''
    const parts = trimmed.split('.')
    const base = parts.length > 1 ? parts[0] : trimmed
    return base.slice(0,1).toUpperCase() + base.slice(1)
  }

  async function generateNew(viewerPassword: string) {
    if (!viewerPassword || !postfix) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_password', { viewerPassword, postfix, methodId: method })
      setOutput(pw); setRevealed(false)
      if (save) {
        const lbl = label.trim() || deriveLabelFromPostfix(postfix)
        if (lbl) { try { await invoke('add_entry', { label: lbl, postfix, methodId: method }); emit('entries:changed') } catch {} }
      }
    } catch (err: any) { onToast('Failed to generate: ' + String(err), 'error') }
    finally { setBusy(false) }
  }

  async function generateSaved(id: string, viewerPassword: string) {
    if (!viewerPassword) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_saved', { id, viewerPassword })
      try { await invoke('write_clipboard_native', { text: pw }) } catch {}
      onToast('Copied to clipboard', 'success')
    } catch (err: any) { onToast('Failed: ' + String(err), 'error') }
    finally { setBusy(false); setPwModal({ id: '', open: false }) }
  }

  async function copy(text: string) {
    let ok = false
    try { ok = await invoke<boolean>('write_clipboard_native', { text }) } catch {}
    if (!ok) { try { await (navigator as any).clipboard?.writeText?.(text); ok = true } catch {} }
    if (ok) { onToast('Copied to clipboard', 'success'); setTimeout(async () => { try { await invoke('clear_clipboard_native') } catch {}; try { await (navigator as any).clipboard?.writeText?.('') } catch {} }, 30000) }
    else { onToast('Copy failed. Please copy manually.', 'error') }
  }

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      {/* Top: search full width */}
      <div className="row" style={{ marginBottom: 8 }}>
        <input style={{ flex: 1 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Middle: scrollable list */}
      <div className="list" style={{ maxHeight: 360, overflow: 'auto' }}>
        {entries.filter(e => {
          const q = search.trim().toLowerCase();
          if (!q) return true; return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q)
        }).map(e => (
          <div key={e.id} className="list-item" onDoubleClick={() => setPwModal({ id: e.id, open: true })}>
            <div>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <div>{e.label}</div>
                <span className="badge" title={methods.find(m => m.id === e.method_id)?.name || e.method_id}>{shortMethod(e.method_id)}</span>
              </div>
              <div className="muted">{e.postfix}</div>
            </div>
            <div className="row">
              <button className="btn" onClick={() => setPwModal({ id: e.id, open: true })} disabled={blocked}>Generate</button>
              <button className="btn danger" onClick={async () => { setBusy(true); try { await invoke('delete_entry', { id: e.id }); emit('entries:changed'); onToast('Entry deleted', 'success') } catch (err: any) { onToast('Failed to delete: ' + String(err), 'error') } finally { setBusy(false) } }}>Delete</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (<div className="muted">No saved postfixes yet. Use the console below to generate and save your first site, or import from Backup.</div>)}
      </div>

      {/* Bottom: full-width console */}
      <div className="col" style={{ marginTop: 12 }}>
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

        <ViewerPrompt title={undefined} confirmLabel={busy ? 'Generating…' : 'Generate'} busy={busy} disabled={blocked || !postfix} describedBy={viewerHelpId} onConfirm={generateNew} />

        <p className="muted" id={viewerHelpId}>Viewer password is required on each generation and is never stored.</p>

        {output && (
          <div style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="password">{revealed ? output : '•'.repeat(Math.min(12, output.length))}</div>
              <div className="row">
                <button className="btn"
                  onPointerDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                  onPointerUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                  onPointerCancel={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                  onMouseDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                  onMouseUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                  onTouchStart={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                  onTouchEnd={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                >{revealed ? 'Release to hide' : 'Hold to reveal'}</button>
                <button className="btn" onClick={() => setRevealed(r => !r)} disabled={busy}>{revealed ? 'Hide' : 'Reveal'}</button>
                <button className="btn" onClick={() => copy(output)} disabled={busy}>Copy</button>
              </div>
            </div>
            <p className="muted">Cleared automatically after ~30 seconds.</p>
          </div>
        )}
      </div>

      {/* Modal for saved generation */}
      {pwModal.open && (
        <div className="modal-backdrop" onClick={() => setPwModal({ id: '', open: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="viewer-modal-title">
            <ViewerPrompt title="Viewer password" confirmLabel={busy ? 'Generating…' : 'Generate'} busy={busy} autoFocus onConfirm={(v) => generateSaved(pwModal.id, v)} onCancel={() => setPwModal({ id: '', open: false })} />
            <p className="muted">Will copy to clipboard on success. Viewer password is not stored.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function shortMethod(id: string): string {
  if (id.startsWith('legacy')) return 'legacy'
  const m = id.match(/^len(\d+)_(alnum|strong)$/)
  if (m) return `${m[1]}${m[2] === 'strong' ? '+' : ''}`
  return id
}

