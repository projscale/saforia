import React from 'react'
import { invoke } from '../../bridge'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { emit, on } from '../events'
import { useI18n } from '../i18n'

type Entry = { id: string; label: string; postfix: string; method_id: string; created_at: number }

export function MobileUnified({ methods, defaultMethod, autosaveQuick, blocked, autoClearSeconds, outputClearSeconds = 60, viewerPromptTimeoutSeconds = 30, copyOnConsoleGenerate = false, showPostfix = false, holdOnlyReveal = false, clearClipboardOnBlur = false, onToast, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, setAutosaveQuick, onImported }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autosaveQuick: boolean,
  blocked: boolean,
  autoClearSeconds: number,
  outputClearSeconds?: number,
  viewerPromptTimeoutSeconds?: number,
  copyOnConsoleGenerate?: boolean,
  showPostfix?: boolean,
  holdOnlyReveal?: boolean,
  clearClipboardOnBlur?: boolean,
  onToast: (t: string, k?: 'info'|'success'|'error') => void,
  setDefaultMethod: (v: string) => void,
  setAutoClearSeconds: (v: number) => void,
  setMaskSensitive: (v: boolean) => void,
  setAutosaveQuick: (v: boolean) => void,
  onImported: () => void,
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
  const outputTimer = React.useRef<number | null>(null)
  const [pwModal, setPwModal] = React.useState<{ id: string, open: boolean }>({ id: '', open: false })
  const [consoleOpen, setConsoleOpen] = React.useState(false)
  const [consoleStep, setConsoleStep] = React.useState<'form'|'viewer'>('form')
  // This screen is now the dedicated Home screen. No nested pages.
  const [touchStart, setTouchStart] = React.useState<{x:number,y:number}|null>(null)
  const { t } = useI18n()

  function sanitizeInput(s: string): string {
    if (!s) return ''
    const noZW = s.replace(/[\u200B-\u200D\uFEFF]/g, '')
    const noCtl = noZW.replace(/[\u0000-\u001F\u007F]/g, '')
    return noCtl.trim()
  }
  function setOutputWithAutoClear(value: string) {
    setOutput(value)
    setRevealed(false)
    if (outputTimer.current) { clearTimeout(outputTimer.current); outputTimer.current = null }
    const ms = Math.max(0, (outputClearSeconds || 0) * 1000)
    if (ms) {
      outputTimer.current = window.setTimeout(() => { setOutput(null); setRevealed(false) }, ms)
    }
  }
  function scheduleClipboardClear() {
    const ms = Math.max(0, (autoClearSeconds || 0) * 1000)
    if (!ms) return
    setTimeout(async () => {
      try { await invoke('clear_clipboard_native') } catch {}
      try { await (navigator as any).clipboard?.writeText?.('') } catch {}
    }, ms)
  }

  React.useEffect(() => { setMethod(defaultMethod) }, [defaultMethod])
  React.useEffect(() => { setSave(autosaveQuick) }, [autosaveQuick])
  // No embedded page switching/listeners here anymore.
  async function load() { try { setEntries(await invoke<Entry[]>('list_entries')) } catch {} }
  React.useEffect(() => { load() }, [])
  React.useEffect(() => on('entries:changed', () => { load() }), [])

  // Clear sensitive output on blur/hidden
  React.useEffect(() => {
    function onBlur() {
      setRevealed(false)
      if (clearClipboardOnBlur) { (async () => { try { await invoke('clear_clipboard_native') } catch {}; try { await (navigator as any).clipboard?.writeText?.('') } catch {} })() }
      setOutput(null)
      setConsoleOpen(false)
      setPwModal({ id: '', open: false })
    }
    function onVis() { if (document.hidden) onBlur() }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVis)
    return () => { window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVis) }
  }, [clearClipboardOnBlur])

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
      const cleanPostfix = sanitizeInput(postfix)
      const lblSan = sanitizeInput(label)
      if (cleanPostfix !== postfix || (save && lblSan !== label)) {
        onToast(t('toastSanitizedInput') || 'Removed invisible/unsupported characters.', 'info')
      }
      const pw = await invoke<string>('generate_password', { viewerPassword, postfix: cleanPostfix, methodId: method })
      setOutputWithAutoClear(pw)
      if (copyOnConsoleGenerate) { await copy(pw) }
      if (save) {
        const lbl = lblSan || deriveLabelFromPostfix(cleanPostfix)
        if (lbl) { try { await invoke('add_entry', { label: lbl, postfix: cleanPostfix, methodId: method }); emit('entries:changed') } catch {} }
      }
    } catch (err: any) { onToast(t('toastGenerateFailed') + ': ' + String(err), 'error') }
    finally {
      setBusy(false)
      setConsoleOpen(false)
      setConsoleStep('form')
      setPostfix(''); setLabel(''); setSave(autosaveQuick)
    }
  }

  async function generateSaved(id: string, viewerPassword: string) {
    if (!viewerPassword) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_saved', { id, viewerPassword })
      try { await invoke('write_clipboard_native', { text: pw }) } catch {}
      onToast(t('toastCopied'), 'success')
      scheduleClipboardClear()
    } catch (err: any) {
      const msg = String(err || '')
      if (msg.toLowerCase().includes('decryption failed')) onToast(t('toastWrongViewer'), 'error')
      else onToast(t('toastGenerateFailed') + ': ' + msg, 'error')
    } finally { setBusy(false); setPwModal({ id: '', open: false }) }
  }

  async function copy(text: string) {
    let ok = false
    try { ok = await invoke<boolean>('write_clipboard_native', { text }) } catch {}
    if (!ok) { try { await (navigator as any).clipboard?.writeText?.(text); ok = true } catch {} }
    if (ok) { onToast(t('toastCopied'), 'success'); scheduleClipboardClear() }
    else { onToast(t('toastCopyFailed'), 'error') }
  }

  function onConsoleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (!blocked && postfix && !busy) {
        e.preventDefault()
        setConsoleOpen(true); setConsoleStep('viewer')
      }
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]; setTouchStart({ x: t.clientX, y: t.clientY })
  }
  function onTouchMove(e: React.TouchEvent) {
    // no-op; we evaluate on end
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart) return
    const t = e.changedTouches[0]; const dx = t.clientX - touchStart.x; const dy = Math.abs(t.clientY - touchStart.y)
    // horizontal gesture with small vertical movement
    if (dy < 40) {
      const rightEdge = (window.innerWidth - touchStart.x) < 24
      if (!menuOpen && rightEdge && dx < -30) setMenuOpen(true) // swipe in from right edge
      if (menuOpen && dx > 30) setMenuOpen(false) // swipe right to close
    }
    setTouchStart(null)
  }

  return (
    <div className="card unified-card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', minHeight: 0 }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* No local brand bar on mobile; global app bar renders in App header */}

      {/* Secondary bar: either search or section header with back */}
      {page === 'home' ? (
        <div className="row" style={{ marginBottom: 8, justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <input style={{ flex: 1 }} placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" />
          <button className="add-btn" aria-label={t('generate')} title={t('generate')} onClick={() => { setMenuOpen(false); setConsoleOpen(true); setConsoleStep('form') }}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      ) : (
        <div className="row" style={{ marginBottom: 8, justifyContent: 'center' }}>
          <div className="password" style={{ fontWeight: 600 }}>
            {page === 'prefs' ? t('tabPreferences') : page === 'backup' ? t('tabBackup') : t('howItWorks')}
          </div>
        </div>
      )}

      {/* Mobile list: flex:1 with overflow auto */}
      {page === 'home' && (
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} className="list-scroll mobile-list">
        <div className="list-item list-header" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, gridTemplateColumns: '1fr auto' }}>
          <div>{t('label')}</div>
          <div>{t('actions')}</div>
        </div>
        {entries.filter(e => {
          const q = search.trim().toLowerCase();
          if (!q) return true; return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q)
        }).map(e => (
          <div key={e.id} className="list-item" style={{ gridTemplateColumns: '1fr auto' }} onDoubleClick={() => setPwModal({ id: e.id, open: true })}>
            <div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</div>
              {/* small method tag under label if needed */}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="icon-btn" aria-label={t('generate')} title={t('generate')} onClick={() => setPwModal({ id: e.id, open: true })} disabled={blocked}>
                <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 5l7 7l-7 7v-4H4v-6h9V5z"/></svg>
              </button>
              <button className="icon-btn danger" aria-label={t('deleteEntry')} title={t('deleteEntry')} onClick={async () => { setBusy(true); try { await invoke('delete_entry', { id: e.id }); emit('entries:changed'); onToast(t('toastEntryDeleted'), 'success') } catch (err: any) { onToast(t('toastEntryDeleteFailed') + ': ' + String(err), 'error') } finally { setBusy(false) } }}>
                <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29l-1.41 1.42L10.59 13.4L4.29 19.71L2.88 18.3L9.17 12L2.88 5.71L4.29 4.3l6.3 6.3l6.3-6.3z"/></svg>
              </button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (<div className="muted" style={{ padding: 8 }}>{t('emptyListHelp')}</div>)}
      </div>
      )}

      {/* Bottom dock: fixed-height output only on mobile */}
      <div className="dock" style={{ marginTop: 12 }}>
        <div className="output-row">
          {output ? (
            <>
              <div className="password">{revealed ? output : '•'.repeat(Math.min(12, output.length))}</div>
              <div className="actions">
                <button className="icon-btn" aria-label={t('holdToReveal')} title={t('holdToReveal')}
                  onPointerDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                  onPointerUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                  onPointerCancel={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                  onMouseDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                  onMouseUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                  onTouchStart={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                  onTouchEnd={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7s11-7 11-7s-3.367-7-11-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .002 6.002A3 3 0 0 0 12 9Z"/></svg>
                </button>
                {!holdOnlyReveal && (
                  <button className="icon-btn" aria-label={revealed ? t('hide') : t('reveal')} title={revealed ? t('hide') : t('reveal')} onClick={() => setRevealed(r => !r)} disabled={busy}>
                    {revealed ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2.81 2.81L1.39 4.22l3.2 3.2C2.64 8.74 1 12 1 12s3.37 7 11 7c2.11 0 3.89-.48 5.36-1.18l3.04 3.04l1.41-1.41L2.81 2.81ZM12 17c-2.76 0-5-2.24-5-5c0-.62.13-1.21.34-1.76l1.54 1.54A2.996 2.996 0 0 0 12 15c.55 0 1.06-.15 1.5-.41l1.58 1.58c-.78.5-1.7.83-2.68.83Zm7.08-2.24l-1.52-1.52c.27-.69.44-1.42.44-2.24c0-3.31-2.69-6-6-6c-.82 0-1.55.17-2.24.44L7.24 2.92C8.71 2.22 10.49 1.74 12.6 1.74c7.63 0 11 7 11 7s-1.64 3.26-4.52 6.02Z"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7s11-7 11-7s-3.367-7-11-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .002 6.002A3 3 0 0 0 12 9Z"/></svg>
                    )}
                  </button>
                )}
                <button className="icon-btn" aria-label={t('copy')} title={t('copy')} onClick={() => copy(output)} disabled={busy}>
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>
                </button>
              </div>
            </>
          ) : (<div style={{ width: '100%' }}></div>)}
        </div>
      </div>

      {/* Settings/About moved to dedicated mobile pages via router; no nested content here */}

      {/* Former side menu removed; navigation handled at MobileRoot level */}

      {/* Floating action button to open generate sheet */}
      {!blocked && !pwModal.open && !consoleOpen && (
        <button className="fab" aria-label={t('generate')} title={t('generate')} onClick={() => { setConsoleOpen(true); setConsoleStep('form'); setRevealed(false) }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 5v14m-7-7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      )}

      {/* Bottom sheet for generate flow (form) */}
      {consoleOpen && consoleStep === 'form' && (
        <div className="sheet-backdrop" onClick={() => setConsoleOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="gen-sheet-title" onClick={e => e.stopPropagation()}>
            <div className="handle" aria-hidden></div>
            <h3 id="gen-sheet-title" style={{ marginTop: 0 }}>{t('generate')}</h3>
            <div className="col" style={{ gap: 8 }}>
              <label>{t('postfix')}</label>
              <input aria-label={t('postfix')} type="text" value={postfix} onChange={e => setPostfix(e.target.value)} placeholder="example.com" spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" maxLength={256} />
              <label>{t('method')}</label>
              <select aria-label={t('method')} value={method} onChange={e => setMethod(e.target.value)}>
                {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="row">
                <input id="save-mb" type="checkbox" checked={save} onChange={e => { setSave(e.target.checked); if (e.target.checked && !label && postfix) setLabel(deriveLabelFromPostfix(postfix)) }} />
                <label htmlFor="save-mb">{t('save')}</label>
                {save && (
                  <input aria-label={t('label')} type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder={t('label')} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" maxLength={128} style={{ flex: 1 }} />
                )}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn primary" disabled={!postfix || busy} onClick={() => setConsoleStep('viewer')} aria-busy={busy ? 'true' : 'false'}>
                  {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner"></span> …</span>) : t('generate')}
                </button>
                <button className="btn" onClick={() => setConsoleOpen(false)}>{t('close')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom sheet (viewer) */}
      {consoleOpen && consoleStep === 'viewer' && (
        <div className="sheet-backdrop" onClick={() => setConsoleOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="viewer-sheet-title" onClick={e => e.stopPropagation()}>
            <div className="handle" aria-hidden></div>
            <h3 id="viewer-sheet-title" style={{ marginTop: 0 }}>{t('viewerPassword')}</h3>
            <ViewerPrompt confirmLabel={busy ? 'Generating…' : t('generate')} cancelLabel={t('close')} busy={busy} onConfirm={(v) => generateNew(v)} onCancel={() => setConsoleOpen(false)} />
          </div>
        </div>
      )}

      {/* Saved entry viewer uses bottom sheet to avoid nested overlays */}
      {pwModal.open && (
        <div className="sheet-backdrop" onClick={() => setPwModal({ id: '', open: false })}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="viewer-sheet-saved" onClick={e => e.stopPropagation()}>
            <div className="handle" aria-hidden></div>
            <h3 id="viewer-sheet-saved" style={{ marginTop: 0 }}>{t('viewerPassword')}</h3>
            <ViewerPrompt confirmLabel={busy ? 'Generating…' : t('generate')} cancelLabel={t('close')} busy={busy} onConfirm={(v) => generateSaved(pwModal.id, v)} onCancel={() => setPwModal({ id: '', open: false })} />
          </div>
        </div>
      )}
      
    </div>
  )
}
