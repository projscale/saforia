import React from 'react'
import { PasswordInput } from '../PasswordInput'
import { invoke } from '../../bridge'

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
  React.useEffect(() => { (async () => { try { setEntries(await invoke<Entry[]>('list_entries')) } catch {} })() }, [])

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
              <button className="btn" onClick={() => setPwModal({ id: e.id, open: true })} disabled={blocked}>Generate</button>
              <button className="btn danger" onClick={() => setConfirmDel({ open: true, id: e.id, label: e.label })}>Delete</button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (<div className="muted">No saved postfixes yet.</div>)}
      </div>

      {pwModal.open && (
        <div className="modal-backdrop" onClick={() => { setPwModal({ id: '', open: false }); setPwModalViewer('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Viewer password</h3>
            <PasswordInput label="Viewer password" value={pwModalViewer} onChange={v => setPwModalViewer(v)} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={() => generateFor(pwModal.id, pwModalViewer)} disabled={!pwModalViewer || busy}>Generate</button>
              <button className="btn" onClick={() => { setPwModal({ id: '', open: false }); setPwModalViewer('') }}>Cancel</button>
            </div>
            <p className="muted">Will copy to clipboard on success. Viewer password is not stored.</p>
          </div>
        </div>
      )}

      {confirmDel.open && (
        <div className="modal-backdrop" onClick={() => setConfirmDel({ open: false, id: '', label: '' })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete entry</h3>
            <p className="muted">Are you sure you want to delete “{confirmDel.label}”?</p>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn danger" disabled={busy} onClick={async () => { const id = confirmDel.id; setConfirmDel({ open: false, id: '', label: '' }); await deleteEntry(id) }}>Delete</button>
              <button className="btn" onClick={() => setConfirmDel({ open: false, id: '', label: '' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
