import React from 'react'
import { PasswordInput } from '../PasswordInput'
import { invoke } from '../../bridge'
import { useFocusTrap } from '../a11y'
import { on } from '../events'
import { ViewerPrompt } from '../components/ViewerPrompt'

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
  const [pinnedIds, setPinnedIds] = React.useState<string[]>([])
  const [filter, setFilter] = React.useState('')
  const [methodFilter, setMethodFilter] = React.useState<string>('all')
  const [sortOrder, setSortOrder] = React.useState<'recent'|'alpha'>('recent')
  const [newLabel, setNewLabel] = React.useState('')
  const [newPostfix, setNewPostfix] = React.useState('')
  const [newMethod, setNewMethod] = React.useState(defaultMethod)
  const [busy, setBusy] = React.useState(false)
  const [pwModal, setPwModal] = React.useState<{ id: string, open: boolean }>({ id: '', open: false })
  const [pwModalViewer, setPwModalViewer] = React.useState('')
  const [confirmDel, setConfirmDel] = React.useState<{ open: boolean, id: string, label: string }>({ open: false, id: '', label: '' })

  React.useEffect(() => { setNewMethod(defaultMethod) }, [defaultMethod])
  async function load() {
    try {
      const [list, prefs] = await Promise.all([
        invoke<Entry[]>('list_entries'),
        invoke<{ pinned_ids?: string[] }>('get_prefs')
      ])
      setEntries(list)
      setPinnedIds(Array.isArray(prefs?.pinned_ids) ? prefs.pinned_ids! : [])
    } catch {}
  }
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

  async function togglePin(id: string) {
    const next = pinnedIds.includes(id) ? pinnedIds.filter(x => x !== id) : [id, ...pinnedIds]
    setPinnedIds(next)
    try { await invoke('set_prefs', { pinnedIds: next }) } catch (err: any) { onToast('Failed to update pins: ' + String(err), 'error') }
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
        <div className="row" style={{ alignItems: 'end' }}>
          <div className="col">
            <label>Filter by method</label>
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
              <option value="all">All</option>
              {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="col">
            <label>Sort</label>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}>
              <option value='recent'>Recent</option>
              <option value='alpha'>A→Z</option>
            </select>
          </div>
        </div>
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
        {entries
        .slice()
        .sort((a,b) => {
          const ap = pinnedIds.includes(a.id) ? 1 : 0
          const bp = pinnedIds.includes(b.id) ? 1 : 0
          if (ap !== bp) return bp - ap
          if (sortOrder === 'recent') return (b.created_at - a.created_at)
          return a.label.localeCompare(b.label)
        })
        .filter(e => {
          const q = filter.trim().toLowerCase();
          if (!q) return true; return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q);
        })
        .filter(e => methodFilter === 'all' ? true : e.method_id === methodFilter)
        .map(e => (
          <div key={e.id} className="list-item" onDoubleClick={() => setPwModal({ id: e.id, open: true })}>
            <div>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <div>{e.label}</div>
                <span className="badge" title={methods.find(m => m.id === e.method_id)?.name || e.method_id}>{shortMethod(e.method_id)}</span>
              </div>
              <div className="muted">{e.postfix}</div>
            </div>
            <div className="row">
              <button className="btn small" aria-label={pinnedIds.includes(e.id) ? 'Unpin' : 'Pin'} title={pinnedIds.includes(e.id) ? 'Unpin' : 'Pin'} onClick={() => togglePin(e.id)}>
                {pinnedIds.includes(e.id) ? '★' : '☆'}
              </button>
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
            <ViewerPrompt
              title="Viewer password"
              confirmLabel={busy ? 'Generating…' : 'Generate'}
              busy={busy}
              autoFocus
              onConfirm={(v) => generateFor(pwModal.id, v)}
              onCancel={() => { setPwModal({ id: '', open: false }); setPwModalViewer('') }}
            />
            <p className="muted">Will copy to clipboard on success. Viewer password is not stored.</p>
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

function shortMethod(id: string): string {
  if (id.startsWith('legacy')) return 'legacy'
  const m = id.match(/^len(\d+)_(alnum|strong)$/)
  if (m) return `${m[1]}${m[2] === 'strong' ? '+' : ''}`
  return id
}
