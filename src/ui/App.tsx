import React, { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

type Entry = {
  id: string
  label: string
  postfix: string
  method_id: string
  created_at: number
}

const STRONG_DEFAULT = 'len36_strong'

const methods = [
  { id: 'legacy_v1', name: 'Legacy v1 (MD5 + Base64, trim =)', legacy: true },
  { id: 'legacy_v2', name: 'Legacy v2 (SHA256 + URL-Base64 .-_)', legacy: true },
  { id: 'len10_alnum', name: '10 chars (A-Za-z0-9)' },
  { id: 'len20_alnum', name: '20 chars (A-Za-z0-9)' },
  { id: 'len36_alnum', name: '36 chars (A-Za-z0-9)' },
  { id: 'len10_strong', name: '10 chars + symbols' },
  { id: 'len20_strong', name: '20 chars + symbols' },
  { id: 'len36_strong', name: '36 chars + symbols (default)' },
]

export function App() {
  const [hasMaster, setHasMaster] = useState<boolean>(false)
  const [entries, setEntries] = useState<Entry[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newPostfix, setNewPostfix] = useState('')
  const [newMethod, setNewMethod] = useState(STRONG_DEFAULT)
  const [setupMaster, setSetupMaster] = useState({ master: '', viewer: '' })

  const [genPostfix, setGenPostfix] = useState('')
  const [genMethod, setGenMethod] = useState(STRONG_DEFAULT)
  const [viewerForGen, setViewerForGen] = useState('')
  const [genOutput, setGenOutput] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)

  const [pwModal, setPwModal] = useState<{ id: string, open: boolean }>({ id: '', open: false })
  const [pwModalViewer, setPwModalViewer] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [fpViewer, setFpViewer] = useState('')
  const [fingerprint, setFingerprint] = useState<string>('')

  useEffect(() => {
    refresh()
    // try to enable content protection best-effort
    invoke('enable_content_protection').catch(() => {})
  }, [])

  async function refresh() {
    const [h, es] = await Promise.all([
      invoke<boolean>('has_master'),
      invoke<Entry[]>('list_entries')
    ])
    setHasMaster(h)
    setEntries(es)
  }

  async function doSetupMaster(e: React.FormEvent) {
    e.preventDefault()
    if (!setupMaster.master || !setupMaster.viewer) return
    setBusy(true)
    try {
      await invoke('setup_set_master', { viewerPassword: setupMaster.viewer, masterPassword: setupMaster.master })
      setSetupMaster({ master: '', viewer: '' })
      await refresh()
      alert('Master password saved (encrypted by viewer password).')
    } catch (err: any) {
      alert('Failed to save master: ' + String(err))
    } finally {
      setBusy(false)
    }
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel || !newPostfix) return
    setBusy(true)
    try {
      const created = await invoke<Entry>('add_entry', { label: newLabel, postfix: newPostfix, methodId: newMethod })
      setEntries((prev) => [created, ...prev])
      setNewLabel(''); setNewPostfix('')
    } catch (err: any) {
      alert('Failed to add entry: ' + String(err))
    } finally { setBusy(false) }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this entry?')) return
    setBusy(true)
    try {
      await invoke('delete_entry', { id })
      setEntries((prev) => prev.filter(e => e.id !== id))
    } catch (err: any) {
      alert('Failed to delete: ' + String(err))
    } finally { setBusy(false) }
  }

  async function generateDefault(e: React.FormEvent) {
    e.preventDefault()
    if (!viewerForGen || !genPostfix) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_password', {
        viewerPassword: viewerForGen,
        postfix: genPostfix,
        methodId: genMethod
      })
      setGenOutput(pw)
      setRevealed(false)
      setViewerForGen('')
    } catch (err: any) {
      alert('Failed to generate: ' + String(err))
    } finally { setBusy(false) }
  }

  useEffect(() => {
    let t: any
    if (genOutput) {
      // auto-clear clipboard in ~25s if copied
      t = setTimeout(() => setGenOutput(null), 30000)
    }
    return () => t && clearTimeout(t)
  }, [genOutput])

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard')
    } catch {
      alert('Copy failed. Please copy manually.')
    }
  }

  async function generateFor(id: string, viewerPassword: string) {
    if (!viewerPassword) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_saved', { id, viewerPassword })
      await copy(pw)
    } catch (err: any) {
      alert('Failed: ' + String(err))
    } finally {
      setBusy(false)
      setPwModal({ id: '', open: false })
      setPwModalViewer('')
    }
  }

  return (
    <div className="container">
      <h1>Saforia</h1>
      <p className="muted">Deterministic passwords. One master, viewer-protected.</p>

      {!hasMaster && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Initial setup</h3>
          <form onSubmit={doSetupMaster} className="col">
            <label>Master password</label>
            <input type="password" autoComplete="new-password" value={setupMaster.master} onChange={e => setSetupMaster(s => ({ ...s, master: e.target.value }))} />
            <label>Viewer password (used to encrypt master)</label>
            <input type="password" autoComplete="new-password" value={setupMaster.viewer} onChange={e => setSetupMaster(s => ({ ...s, viewer: e.target.value }))} />
            <div className="row">
              <button className="btn primary" disabled={busy || !setupMaster.master || !setupMaster.viewer}>Save master</button>
            </div>
            <p className="muted">Viewer password is never stored; it only decrypts the master on demand.</p>
          </form>
        </div>
      )}

      {hasMaster && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>Master fingerprint</h3>
          <div className="row">
            <input type="password" placeholder="Viewer password" value={fpViewer} onChange={e => setFpViewer(e.target.value)} />
            <button className="btn" disabled={!fpViewer || busy} onClick={async () => {
              setBusy(true)
              try {
                const fp = await invoke<string>('master_fingerprint', { viewerPassword: fpViewer })
                setFingerprint(fp)
                setFpViewer('')
              } catch (err: any) {
                alert('Failed: ' + String(err))
              } finally { setBusy(false) }
            }}>Show</button>
          </div>
          {fingerprint && (
            <div className="row" style={{ marginTop: 8, alignItems: 'center' }}>
              <span className="muted">Fingerprint (MD5 of master):</span>
              <span className="password">{fingerprint}</span>
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ alignItems: 'stretch' }}>
        <div className="card" style={{ flex: 1 }}>
          <h3>Quick generate</h3>
          <form onSubmit={generateDefault} className="col">
            <label>Postfix</label>
            <input value={genPostfix} onChange={e => setGenPostfix(e.target.value)} placeholder="example.com" />
            <label>Method</label>
            <select value={genMethod} onChange={e => setGenMethod(e.target.value)}>
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <label>Viewer password (required each time)</label>
            <input type="password" value={viewerForGen} onChange={e => setViewerForGen(e.target.value)} />
            <div className="row">
              <button className="btn primary" disabled={busy || !genPostfix || !viewerForGen}>Generate</button>
            </div>
          </form>
          {genOutput && (
            <div style={{ marginTop: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="password" onMouseEnter={() => setHovered('gen')} onMouseLeave={() => setHovered(null)}>
                  {revealed || hovered === 'gen' ? genOutput : '•'.repeat(Math.min(12, genOutput.length))}
                </div>
                <div className="row">
                  <button className="btn" onClick={() => setRevealed(r => !r)}>{revealed ? 'Hide' : 'Reveal'}</button>
                  <button className="btn" onClick={() => copy(genOutput)}>Copy</button>
                </div>
              </div>
              <p className="muted">Cleared automatically after ~30 seconds.</p>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3>Saved postfixes</h3>
          <form onSubmit={addEntry} className="row">
            <input placeholder="Label" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <input placeholder="Postfix" value={newPostfix} onChange={e => setNewPostfix(e.target.value)} />
            <select value={newMethod} onChange={e => setNewMethod(e.target.value)}>
              {methods.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button className="btn primary" disabled={busy || !newLabel || !newPostfix}>Add</button>
          </form>
          <div className="list" style={{ marginTop: 12 }}>
            {entries.map(e => (
              <div key={e.id} className="list-item" onDoubleClick={() => setPwModal({ id: e.id, open: true })}>
                <div>
                  <div>{e.label}</div>
                  <div className="muted">{e.postfix} • {methods.find(m => m.id === e.method_id)?.name || e.method_id}</div>
                </div>
                <div className="row">
                  <button className="btn" onClick={() => setPwModal({ id: e.id, open: true })}>Generate</button>
                  <button className="btn danger" onClick={() => deleteEntry(e.id)}>Delete</button>
                </div>
              </div>
            ))}
            {entries.length === 0 && (<div className="muted">No saved postfixes yet.</div>)}
          </div>
        </div>
      </div>

      {pwModal.open && (
        <div className="modal-backdrop" onClick={() => { setPwModal({ id: '', open: false }); setPwModalViewer('') }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Viewer password</h3>
            <input type="password" autoFocus value={pwModalViewer} onChange={e => setPwModalViewer(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') generateFor(pwModal.id, pwModalViewer) }} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={() => generateFor(pwModal.id, pwModalViewer)} disabled={!pwModalViewer || busy}>Generate</button>
              <button className="btn" onClick={() => { setPwModal({ id: '', open: false }); setPwModalViewer('') }}>Cancel</button>
            </div>
            <p className="muted">Will copy to clipboard on success. Viewer password is not stored.</p>
          </div>
        </div>
      )}
    </div>
  )
}
