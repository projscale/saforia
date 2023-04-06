import React, { useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '../bridge'
import { writeText as writeClipboardText } from '@tauri-apps/api/clipboard'
import { listen } from '@tauri-apps/api/event'
import { ToastContainer, useToasts } from './Toast'

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
  const [defaultMethod, setDefaultMethod] = useState(STRONG_DEFAULT)
  const [autoClearSeconds, setAutoClearSeconds] = useState(30)
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
  const [fpViewer, setFpViewer] = useState('')
  const [fingerprint, setFingerprint] = useState<string>('')
  const [captured, setCaptured] = useState(false)
  const [maskSensitive, setMaskSensitive] = useState(false)
  const blocked = captured || maskSensitive
  const [isWayland, setIsWayland] = useState(false)
  const [filter, setFilter] = useState('')

  const { toasts, push, remove } = useToasts()
  const holdTimer = useRef<number | null>(null)
  const testMode = useMemo(() => {
    try { return !!(globalThis as any).SAFORIA_MOCK || new URLSearchParams(globalThis.location?.search || '').get('test') === '1' } catch { return false }
  }, [])
  const [tMaster, setTMaster] = useState('test')
  const [tPostfix, setTPostfix] = useState('example')
  const [tV1, setTV1] = useState<string>('')
  const [tV2, setTV2] = useState<string>('')

  // Backup/import state
  const [exportPath, setExportPath] = useState('')
  const [exportPass, setExportPass] = useState('')
  const [importPath, setImportPath] = useState('')
  const [importPass, setImportPass] = useState('')
  const [importOverwrite, setImportOverwrite] = useState(false)
  const [confirmDel, setConfirmDel] = useState<{ open: boolean, id: string, label: string }>({ open: false, id: '', label: '' })

  useEffect(() => {
    refresh()
    // load preferences
    invoke<{ default_method: string, auto_clear_seconds: number, mask_sensitive: boolean }>('get_prefs').then(p => {
      if (p?.default_method) {
        setDefaultMethod(p.default_method)
        setNewMethod(p.default_method)
        setGenMethod(p.default_method)
      }
      if (typeof p?.auto_clear_seconds === 'number') {
        setAutoClearSeconds(p.auto_clear_seconds)
      }
      if (typeof (p as any)?.mask_sensitive === 'boolean') {
        setMaskSensitive((p as any).mask_sensitive)
      }
    }).catch(() => {})
    // Detect platform (Wayland)
    invoke<{ os: string, wayland: boolean }>('platform_info').then(info => {
      if (info?.wayland) {
        setIsWayland(true)
        // Enable mask by default if not already enabled
        setMaskSensitive(prev => {
          if (!prev) { try { invoke('set_prefs', { maskSensitive: true }) } catch {} }
          return prev || true
        })
      }
    }).catch(() => {})
    // try to enable content protection best-effort
    invoke('enable_content_protection').catch(() => {})
    // Initial captured state
    invoke<boolean>('is_screen_captured').then(v => setCaptured(!!v)).catch(() => {})
    // Listen for native changes (iOS only; no-op elsewhere)
    const unlistenPromise = listen<boolean>('screen_capture_changed', (e) => {
      setCaptured(!!e.payload)
    })
    return () => { unlistenPromise.then(un => un()) }
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
      push('Master password saved (encrypted by viewer password).', 'success')
    } catch (err: any) {
      push('Failed to save master: ' + String(err), 'error')
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
      push('Failed to add entry: ' + String(err), 'error')
    } finally { setBusy(false) }
  }

  async function deleteEntry(id: string) {
    setBusy(true)
    try {
      await invoke('delete_entry', { id })
      setEntries((prev) => prev.filter(e => e.id !== id))
      push('Entry deleted', 'success')
    } catch (err: any) {
      push('Failed to delete: ' + String(err), 'error')
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
      push('Failed to generate: ' + String(err), 'error')
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
      await writeClipboardText(text)
      push('Copied to clipboard', 'success')
      if (autoClearSeconds > 0) {
        setTimeout(async () => {
          try { await writeClipboardText('') } catch {}
          try { await invoke('clear_clipboard_native') } catch {}
        }, autoClearSeconds * 1000)
      }
    } catch {
      // Fallback to browser clipboard if available
      try {
        await (navigator as any).clipboard?.writeText?.(text)
        push('Copied to clipboard', 'success')
        if (autoClearSeconds > 0) {
          setTimeout(async () => {
            try { await (navigator as any).clipboard?.writeText?.('') } catch {}
            try { await invoke('clear_clipboard_native') } catch {}
          }, autoClearSeconds * 1000)
        }
      } catch {
        push('Copy failed. Please copy manually.', 'error')
      }
    }
  }

  async function generateFor(id: string, viewerPassword: string) {
    if (!viewerPassword) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_saved', { id, viewerPassword })
      await copy(pw)
    } catch (err: any) {
      push('Failed: ' + String(err), 'error')
    } finally {
      setBusy(false)
      setPwModal({ id: '', open: false })
      setPwModalViewer('')
    }
  }

  return (
    <div className="container">
      <ToastContainer toasts={toasts} onClose={remove} />
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
                push('Failed: ' + String(err), 'error')
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
              <button className="btn primary" disabled={busy || !genPostfix || !viewerForGen || blocked}>Generate</button>
            </div>
          </form>
          {genOutput && (
            <div style={{ marginTop: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="password">
                  {revealed ? genOutput : '•'.repeat(Math.min(12, genOutput.length))}
                </div>
                <div className="row">
                  <button className="btn" disabled={blocked}
                    onPointerDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 150) }}
                    onPointerUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                    onPointerLeave={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                  >{revealed ? 'Release to hide' : 'Hold to reveal'}</button>
                  <button className="btn" onClick={() => copy(genOutput)} disabled={blocked}>Copy</button>
                </div>
              </div>
              <p className="muted">Cleared automatically after ~30 seconds.</p>
            </div>
          )}
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3>Saved postfixes</h3>
          <div className="row" style={{ marginBottom: 8 }}>
            <input placeholder="Search..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
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
            {entries.filter(e => {
              const q = filter.trim().toLowerCase();
              if (!q) return true;
              return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q);
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
        </div>
      </div>

      {testMode && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>E2E Smoke (Mock/UI)</h3>
          <div className="row">
            <input placeholder="Master (mock)" value={tMaster} onChange={e => setTMaster(e.target.value)} />
            <input placeholder="Postfix" value={tPostfix} onChange={e => setTPostfix(e.target.value)} />
            <button className="btn" onClick={async () => {
              try {
                const v1 = await invoke<string>('generate_password', { viewerPassword: 'x', postfix: tPostfix, methodId: 'legacy_v1' })
                const v2 = await invoke<string>('generate_password', { viewerPassword: 'x', postfix: tPostfix, methodId: 'legacy_v2' })
                setTV1(v1); setTV2(v2)
              } catch (err: any) {
                push('E2E smoke failed: ' + String(err), 'error')
              }
            }}>Run legacy v1/v2</button>
          </div>
          {(tV1 || tV2) && (
            <div className="col" style={{ marginTop: 8 }}>
              <div>v1: <span className="password">{tV1}</span></div>
              <div>v2: <span className="password">{tV2}</span></div>
            </div>
          )}
          <p className="muted">Set window.SAFORIA_MOCK = true in dev to run without Tauri backend.</p>
        </div>
      )}

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

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Preferences</h3>
        <div className="row">
          <label>Default method</label>
          <select value={defaultMethod} onChange={async (e) => {
            const m = e.target.value
            setDefaultMethod(m)
            setNewMethod(m)
            setGenMethod(m)
            try { await invoke('set_prefs', { defaultMethod: m }) } catch {}
          }}>
            {methods.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label>Mask sensitive content (Linux/Wayland)</label>
          <select value={maskSensitive ? 'yes' : 'no'} onChange={async (e) => {
            const v = e.target.value === 'yes'
            setMaskSensitive(v)
            try { await invoke('set_prefs', { maskSensitive: v }) } catch {}
          }}>
            <option value='no'>No</option>
            <option value='yes'>Yes</option>
          </select>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <label>Auto-clear clipboard (seconds, 0 = off)</label>
          <input type="number" min={0} step={5} value={autoClearSeconds} onChange={async (e) => {
            const v = Math.max(0, parseInt(e.target.value || '0', 10))
            setAutoClearSeconds(v)
            try { await invoke('set_prefs', { autoClearSeconds: v }) } catch {}
          }} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Backup</h3>
        <div className="row" style={{ alignItems: 'end', marginBottom: 8 }}>
          <div className="col" style={{ flex: 1 }}>
            <label>Export to path</label>
            <input placeholder="/path/to/backup.safe" value={exportPath} onChange={e => setExportPath(e.target.value)} />
          </div>
          <div className="col">
            <label>Passphrase (optional)</label>
            <input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)} />
          </div>
          <button className="btn" disabled={!exportPath || busy} onClick={async () => {
            setBusy(true)
            try {
              await invoke('export_entries', { path: exportPath, passphrase: exportPass || null })
              push('Exported successfully', 'success')
              setExportPass('')
            } catch (err: any) {
              alert('Export failed: ' + String(err))
            } finally { setBusy(false) }
          }}>Export</button>
        </div>

        <div className="row" style={{ alignItems: 'end' }}>
          <div className="col" style={{ flex: 1 }}>
            <label>Import from path</label>
            <input placeholder="/path/to/backup.safe" value={importPath} onChange={e => setImportPath(e.target.value)} />
          </div>
          <div className="col">
            <label>Passphrase (if used)</label>
            <input type="password" value={importPass} onChange={e => setImportPass(e.target.value)} />
          </div>
          <div className="col" style={{ minWidth: 120 }}>
            <label>Overwrite</label>
            <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
              <option value='no'>No</option>
              <option value='yes'>Yes</option>
            </select>
          </div>
          <button className="btn" disabled={!importPath || busy} onClick={async () => {
            setBusy(true)
            try {
              const count = await invoke<number>('import_entries', { path: importPath, passphrase: importPass || null, overwrite: importOverwrite })
              await refresh()
              push(`Imported ${count} entries`, 'success')
              setImportPass('')
            } catch (err: any) {
              alert('Import failed: ' + String(err))
            } finally { setBusy(false) }
          }}>Import</button>
        </div>
        <p className="muted">Export can be plain JSON or encrypted with a passphrase (Argon2id + ChaCha20-Poly1305).</p>
      </div>

      {(captured || maskSensitive) && (
        <div className="capture-overlay">
          <div className="box">
            <h2>{captured ? 'Screen capture detected' : 'Sensitive content masked'}</h2>
            <p>
              {captured
                ? 'For your security, sensitive content is hidden while recording or mirroring is active.'
                : (isWayland ? 'On Linux/Wayland, capture blocking is not guaranteed. Mask mode is enabled.' : 'Mask mode is enabled by preferences.')}
            </p>
          </div>
        </div>
      )}

      {confirmDel.open && (
        <div className="modal-backdrop" onClick={() => setConfirmDel({ open: false, id: '', label: '' })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Delete entry</h3>
            <p className="muted">Are you sure you want to delete “{confirmDel.label}”?</p>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn danger" disabled={busy} onClick={async () => {
                const id = confirmDel.id
                setConfirmDel({ open: false, id: '', label: '' })
                await deleteEntry(id)
              }}>Delete</button>
              <button className="btn" onClick={() => setConfirmDel({ open: false, id: '', label: '' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
