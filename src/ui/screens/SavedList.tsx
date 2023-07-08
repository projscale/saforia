import React from 'react'
import { PasswordInput } from '../PasswordInput'
import { invoke } from '../../bridge'
import { useFocusTrap } from '../a11y'
import { on } from '../events'

type Entry = {
  id: string
  label: string
  postfix: string
  method_id: string
  created_at: number
}

export function SavedList({ methods, defaultMethod, blocked, onToast }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  blocked: boolean,
  onToast: (text: string, kind?: 'info'|'success'|'error') => void,
}) {
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [filter, setFilter] = React.useState('')
  const [newLabel, setNewLabel] = React.useState('')
  const [newPostfix, setNewPostfix] = React.useState('')
  const [newMethod, setNewMethod] = React.useState(defaultMethod)
  const [busy, setBusy] = React.useState(false)
  const [pwModal, setPwModal] = React.useState<{ id: string, open: boolean }>({ id: '', open: false })
  const [pwModalViewer, setPwModalViewer] = React.useState('')
  const [confirmDel, setConfirmDel] = React.useState<{ open: boolean, id: string, label: string }>({ open: false, id: '', label: '' })

  React.useEffect(() => { setNewMethod(defaultMethod) }, [defaultMethod])
  async function load() { try { setEntries(await invoke<Entry[]>('list_entries')) } catch {} }
  React.useEffect(() => { load() }, [])
  React.useEffect(() => {
    return on('entries:changed', () => { load() })
  }, [])

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel || !newPostfix) return
    setBusy(true)
    try {
      const created = await invoke<Entry>('add_entry', { label: newLabel, postfix: newPostfix, methodId: newMethod })
      setEntries(prev => [created, ...prev]); setNewLabel(''); setNewPostfix('')
    } catch (err: any) { onToast('Failed to add entry: ' + String(err), 'error') }
    finally { setBusy(false) }
  }

  async function deleteEntry(id: string) {
    setBusy(true)
    try {
      await invoke('delete_entry', { id }); setEntries(prev => prev.filter(e => e.id !== id)); onToast('Entry deleted', 'success')
    } catch (err: any) { onToast('Failed to delete: ' + String(err), 'error') }
    finally { setBusy(false) }
  }

  async function generateFor(id: string, viewerPassword: string) {
    if (!viewerPassword) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_saved', { id, viewerPassword })
      try { await invoke('write_clipboard_native', { text: pw }) } catch {}
      onToast('Copied to clipboard', 'success')
    } catch (err: any) { onToast('Failed: ' + String(err), 'error') }
    finally { setBusy(false); setPwModal({ id: '', open: false }); setPwModalViewer('') }
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (pwModal.open) { setPwModal({ id: '', open: false }); setPwModalViewer('') }
        if (confirmDel.open) { setConfirmDel({ open: false, id: '', label: '' }) }
      }
    }
    if (pwModal.open || confirmDel.open) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
  }, [pwModal.open, confirmDel.open])

  return (
    <div className="card" style={{ flex: 1 }}>
      <h3>Saved postfixes</h3>
      <div className="row" style={{ marginBottom: 8 }}>
        <input placeholder="Search..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <form onSubmit={addEntry} className="row">
        <input placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
        <input placeholder="Postfix" value={newPostfix} onChange={e => setNewPostfix(e.target.value)} />
        <select value={newMethod} onChange={e => setNewMethod(e.target.value)}>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button className="btn primary" disabled={busy || !newLabel || !newPostfix}>Add</button>
      </form>
      <div className="list" style={{ marginTop: 12 }}>
        {entries.filter(e => {
          const q = filter.trim().toLowerCase();
          if (!q) return true; return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q);
        }).map(e => (
          <div key={e.id} className="list-item" onDoubleClick={() => setPwModal({ id: e.id, open: true })}>
            <div>
              <div>{e.label}</div>
              <div className="muted">{e.postfix} • {methods.find(m => m.id === e.method_id)?.name || e.method_id}</div>
            </div>
            <div className="row">
              <button className="btn" title="Generate and copy password" aria-label="Generate and copy password" onClick={() => setPwModal({ id: e.id, open: true })} disabled={blocked}>Generate</button>
              <button className="btn danger" title="Delete entry" aria-label="Delete entry" onClick={() => setConfirmDel({ open: true, id: e.id, label: e.label })}>Delete</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="muted">No saved postfixes yet. Use the form above to add your first site or import from Backup below.</div>
        )}
      </div>

      {pwModal.open && (
        <div className="modal-backdrop" onClick={() => { setPwModal({ id: '', open: false }); setPwModalViewer('') }}>
          <ModalCard ariaLabelledBy="viewer-modal-title">
            <form onSubmit={(e) => { e.preventDefault(); generateFor(pwModal.id, pwModalViewer) }}>
              {/* hidden username for browser heuristics */}
              <input type="text" name="username" autoComplete="username" aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} />
              <h3 id="viewer-modal-title">Viewer password</h3>
              <PasswordInput label="Viewer password" value={pwModalViewer} onChange={v => setPwModalViewer(v)} autoFocus autoComplete="current-password" />
              <div className="row" style={{ marginTop: 8 }}>
                <button type="submit" className="btn primary" disabled={!pwModalViewer || busy} aria-busy={busy ? 'true' : 'false'}>
                  {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Generating…</span>) : 'Generate'}
                </button>
                <button type="button" className="btn" onClick={() => { setPwModal({ id: '', open: false }); setPwModalViewer('') }}>Cancel</button>
              </div>
              <p className="muted">Will copy to clipboard on success. Viewer password is not stored.</p>
            </form>
          </ModalCard>
        </div>
      )}

      {confirmDel.open && (
        <div className="modal-backdrop" onClick={() => setConfirmDel({ open: false, id: '', label: '' })}>
          <ModalCard ariaLabelledBy="confirm-del-title">
            <h3 id="confirm-del-title">Delete entry</h3>
            <p className="muted">Are you sure you want to delete “{confirmDel.label}”?</p>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn danger" disabled={busy} aria-busy={busy ? 'true' : 'false'} onClick={async () => { const id = confirmDel.id; setConfirmDel({ open: false, id: '', label: '' }); await deleteEntry(id) }}>
                {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> Deleting…</span>) : 'Delete'}
              </button>
              <button className="btn" onClick={() => setConfirmDel({ open: false, id: '', label: '' })}>Cancel</button>
            </div>
          </ModalCard>
        </div>
      )}
    </div>
  )
}

function ModalCard({ children, ariaLabelledBy }: { children: React.ReactNode, ariaLabelledBy: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)
  return (
    <div ref={ref} className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={ariaLabelledBy}>
      {children}
    </div>
  )
}
