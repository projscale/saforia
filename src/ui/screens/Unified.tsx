import React from 'react'
import { invoke } from '../../bridge'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { emit, on } from '../events'
import { useI18n } from '../i18n'

type Entry = { id: string; label: string; postfix: string; method_id: string; created_at: number }

export function Unified({ methods, defaultMethod, autosaveQuick, blocked, autoClearSeconds, outputClearSeconds = 60, viewerPromptTimeoutSeconds = 30, copyOnConsoleGenerate = false, showPostfix = false, holdOnlyReveal = false, clearClipboardOnBlur = false, extendSeconds = 10, onToast }: {
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
  extendSeconds?: number,
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
  const [outPct, setOutPct] = React.useState(0)
  const [outSecsLeft, setOutSecsLeft] = React.useState<number | null>(null)
  const outIvRef = React.useRef<number | null>(null)
  const holdTimer = React.useRef<number | null>(null)
  const outputTimer = React.useRef<number | null>(null)
  const viewerHelpId = React.useId()
  const [pwModal, setPwModal] = React.useState<{ id: string, open: boolean }>({ id: '', open: false })
  const [consoleModal, setConsoleModal] = React.useState(false)
  const { t } = useI18n()

  function sanitizeInput(s: string): string {
    if (!s) return ''
    // remove zero-width characters and control chars; keep spaces
    // Zero-width: U+200B..U+200D, U+FEFF
    const noZW = s.replace(/[\u200B-\u200D\uFEFF]/g, '')
    // C0 controls + DEL
    const noCtl = noZW.replace(/[\u0000-\u001F\u007F]/g, '')
    return noCtl.trim()
  }

  function setOutputWithAutoClear(value: string) {
    setOutput(value)
    setRevealed(false)
    if (outputTimer.current) { clearTimeout(outputTimer.current); outputTimer.current = null }
    const ms = Math.max(0, (outputClearSeconds || 0) * 1000)
    if (ms) {
      setOutPct(0); setOutSecsLeft(Math.ceil(ms/1000))
      const start = Date.now()
      if (outputTimer.current) { clearTimeout(outputTimer.current); outputTimer.current = null }
      if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null }
      outputTimer.current = window.setTimeout(() => { setOutput(null); setRevealed(false); if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null } }, ms)
      const iv = window.setInterval(() => {
        const elapsed = Date.now() - start
        setOutPct(Math.min(100, (elapsed / ms) * 100))
        setOutSecsLeft(Math.max(0, Math.ceil((ms - elapsed)/1000)))
      }, 100)
      outIvRef.current = iv
      window.setTimeout(() => { try { clearInterval(iv) } catch {} }, ms + 120)
    }
  }
  
  function extendOutput() {
    if (!output) return
    const ms = Math.max(0, ((outSecsLeft || 0) * 1000)) + Math.max(1000, (extendSeconds||10)*1000)
    setOutPct(0); setOutSecsLeft(Math.ceil(ms/1000))
    const start = Date.now()
    if (outputTimer.current) { clearTimeout(outputTimer.current); outputTimer.current = null }
    if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null }
    outputTimer.current = window.setTimeout(() => { setOutput(null); setRevealed(false); if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null } }, ms)
    const iv = window.setInterval(() => {
      const elapsed = Date.now() - start
      setOutPct(Math.min(100, (elapsed / ms) * 100))
      setOutSecsLeft(Math.max(0, Math.ceil((ms - elapsed)/1000)))
    }, 100)
    outIvRef.current = iv
  }

  function scheduleClipboardClear() {
    const ms = Math.max(0, (autoClearSeconds || 0) * 1000)
    if (!ms) return
    try { (emit as any)('clipboard:start', ms) } catch {}
    setTimeout(async () => {
      try { await invoke('clear_clipboard_native') } catch {}
      try { await (navigator as any).clipboard?.writeText?.('') } catch {}
      try { (emit as any)('clipboard:stop') } catch {}
    }, ms)
  }

  React.useEffect(() => { setMethod(defaultMethod) }, [defaultMethod])
  React.useEffect(() => { setSave(autosaveQuick) }, [autosaveQuick])

  async function load() { try { setEntries(await invoke<Entry[]>('list_entries')) } catch {} }
  React.useEffect(() => { load() }, [])
  React.useEffect(() => on('entries:changed', () => { load() }), [])

  // Clear sensitive output on window blur/visibility change
  React.useEffect(() => {
    function onBlur() {
      setRevealed(false)
      if (clearClipboardOnBlur) { (async () => { try { await invoke('clear_clipboard_native') } catch {}; try { await (navigator as any).clipboard?.writeText?.('') } catch {} })() }
      setOutput(null)
      setConsoleModal(false)
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
      setConsoleModal(false)
      // clear console inputs after generate for safety
      setPostfix('')
      setLabel('')
      setSave(autosaveQuick)
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
    }
    finally { setBusy(false); setPwModal({ id: '', open: false }) }
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
        setConsoleModal(true)
      }
    }
  }

  return (
    <div className="card unified-card" style={{ gridColumn: '1 / -1' }}>
      {/* Top: search full width */}
      <div className="row" style={{ marginBottom: 12 }}>
        <input style={{ flex: 1 }} placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" />
      </div>
      {/* Postfix column intentionally hidden by default; label and method remain visible */}

      {/* Table header */}
      <div className="list list-scroll">
        <div className="list-item list-header" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, gridTemplateColumns: showPostfix ? '1fr 80px 1fr auto' : '1fr 80px auto' }}>
          <div>{t('label')}</div>
          <div>{t('method')}</div>
          {showPostfix && <div>{t('postfix')}</div>}
          <div>{t('actions')}</div>
        </div>
        {entries.filter(e => {
          const q = search.trim().toLowerCase();
          if (!q) return true; return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q)
        }).map(e => (
          <div key={e.id} className="list-item" style={{ gridTemplateColumns: showPostfix ? '1fr 80px 1fr auto' : '1fr 80px auto' }} onDoubleClick={() => setPwModal({ id: e.id, open: true })}>
            <div>{e.label}</div>
            <div>{shortMethod(e.method_id)}</div>
            {showPostfix && <div className="muted">{e.postfix}</div>}
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

      {/* Bottom: full-width console dock */}
      <div className="dock" style={{ marginTop: 12 }}>
        <div className="console-line" onKeyDown={onConsoleKey}>
          <div className="console-prompt">&gt;</div>
        <input aria-label={t('postfix')} type="text" value={postfix} onChange={e => setPostfix(e.target.value)} placeholder={t('postfixPlaceholder')} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" maxLength={256} />
          <select aria-label={t('method')} value={method} onChange={e => setMethod(e.target.value)}>
            {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="opt">
            <input id="save-postfix" type="checkbox" checked={save} onChange={e => { setSave(e.target.checked); if (e.target.checked && !label && postfix) setLabel(deriveLabelFromPostfix(postfix)) }} />
            <label htmlFor="save-postfix">{t('save')}</label>
          </div>
          {save ? (
            <input aria-label={t('label')} type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder={t('labelPlaceholder')} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" maxLength={128} />
          ) : (
            <div></div>
          )}
          <button className="btn primary" disabled={blocked || !postfix || busy} onClick={() => setConsoleModal(true)} title={t('generate')}>{busy ? '…' : t('generate')}</button>
        </div>

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
                  {/* Eye icon */}
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7s11-7 11-7s-3.367-7-11-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .002 6.002A3 3 0 0 0 12 9Z"/></svg>
                </button>
                {!holdOnlyReveal && (
                  <button className="icon-btn" aria-label={revealed ? t('hide') : t('reveal')} title={revealed ? t('hide') : t('reveal')} onClick={() => setRevealed(r => !r)} disabled={busy}>
                    {/* Toggle eye */}
                    {revealed ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M2.81 2.81L1.39 4.22l3.2 3.2C2.64 8.74 1 12 1 12s3.37 7 11 7c2.11 0 3.89-.48 5.36-1.18l3.04 3.04l1.41-1.41L2.81 2.81ZM12 17c-2.76 0-5-2.24-5-5c0-.62.13-1.21.34-1.76l1.54 1.54A2.996 2.996 0 0 0 12 15c.55 0 1.06-.15 1.5-.41l1.58 1.58c-.78.5-1.7.83-2.68.83Zm7.08-2.24l-1.52-1.52c.27-.69.44-1.42.44-2.24c0-3.31-2.69-6-6-6c-.82 0-1.55.17-2.24.44L7.24 2.92C8.71 2.22 10.49 1.74 12.6 1.74c7.63 0 11 7 11 7s-1.64 3.26-4.52 6.02Z"/></svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7s11-7 11-7s-3.367-7-11-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 .002 6.002A3 3 0 0 0 12 9Z"/></svg>
                    )}
                  </button>
                )}
                <button className="icon-btn" aria-label={t('copy')} title={t('copy')} onClick={() => copy(output)} disabled={busy}>
                  {/* Copy icon */}
                  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"/></svg>
                </button>
              </div>
            </>
          ) : (
            <div style={{ width: '100%' }}></div>
          )}
        </div>
        {output && (
          <div className={`progress thin ${outPct >= 80 ? 'danger' : (outPct >= 60 ? 'warn' : '')}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(outPct)}>
            <div className="bar" style={{ width: `${outPct}%` }}></div>
          </div>
        )}
        {output && outSecsLeft !== null && (
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="muted" style={{ fontSize: 11 }}>{t('autoCloseIn')} {outSecsLeft}s</div>
            <button className="btn small" onClick={extendOutput}>{t('extend')}</button>
          </div>
        )}
      </div>

      {/* Modal for saved generation */}
      {pwModal.open && (
        <div className="modal-backdrop" onClick={() => setPwModal({ id: '', open: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="viewer-modal-title">
            <ViewerPrompt title={t('viewerPassword')} fieldLabel={t('viewerPassword')} confirmLabel={busy ? t('generating') : t('generate')} cancelLabel={t('close')} autoCloseMs={viewerPromptTimeoutSeconds * 1000} busy={busy} autoFocus onConfirm={(v) => generateSaved(pwModal.id, v)} onCancel={() => setPwModal({ id: '', open: false })} />
          </div>
        </div>
      )}

      {consoleModal && (
        <div className="modal-backdrop" onClick={() => setConsoleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="viewer-modal-title">
            <ViewerPrompt title={t('viewerPassword')} fieldLabel={t('viewerPassword')} confirmLabel={busy ? t('generating') : t('generate')} cancelLabel={t('close')} autoCloseMs={viewerPromptTimeoutSeconds * 1000} busy={busy} autoFocus onConfirm={(v) => generateNew(v)} onCancel={() => setConsoleModal(false)} />
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
