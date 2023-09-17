import React from 'react'
import { invoke } from '../../bridge'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { emit, on } from '../events'
import { useI18n } from '../i18n'

type Entry = { id: string; label: string; postfix: string; method_id: string; created_at: number }

export function Unified({ methods, defaultMethod, autosaveQuick, blocked, autoClearSeconds, outputClearSeconds = 60, viewerPromptTimeoutSeconds = 30, copyOnConsoleGenerate = false, showPostfix = false, holdOnlyReveal = false, clearClipboardOnBlur = false, onToast }: {
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
      <div className="row" style={{ marginBottom: 8 }}>
        <input style={{ flex: 1 }} placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" />
      </div>
      {/* Postfix column intentionally hidden by default; label and method remain visible */}

      {/* Table header */}
      <div className="list list-scroll">
        <div className="list-item list-header" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, gridTemplateColumns: showPostfix ? '1fr 120px 1fr auto' : '1fr 120px auto' }}>
          <div>{t('label')}</div>
          <div>{t('method')}</div>
          {showPostfix && <div>{t('postfix')}</div>}
          <div>{t('actions')}</div>
        </div>
        {entries.filter(e => {
          const q = search.trim().toLowerCase();
          if (!q) return true; return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q)
        }).map(e => (
          <div key={e.id} className="list-item" style={{ gridTemplateColumns: showPostfix ? '1fr 120px 1fr auto' : '1fr 120px auto' }} onDoubleClick={() => setPwModal({ id: e.id, open: true })}>
            <div>{e.label}</div>
            <div>{shortMethod(e.method_id)}</div>
            {showPostfix && <div className="muted">{e.postfix}</div>}
            <div className="row" style={{ gap: 6 }}>
              <button className="icon-btn" aria-label={t('generate')} title={t('generate')} onClick={() => setPwModal({ id: e.id, open: true })} disabled={blocked}>
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 5l7 7l-7 7v-4H4v-6h9V5z"/></svg>
              </button>
              <button className="icon-btn danger" aria-label={t('deleteEntry')} title={t('deleteEntry')} onClick={async () => { setBusy(true); try { await invoke('delete_entry', { id: e.id }); emit('entries:changed'); onToast(t('toastEntryDeleted'), 'success') } catch (err: any) { onToast(t('toastEntryDeleteFailed') + ': ' + String(err), 'error') } finally { setBusy(false) } }}>
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29l-1.41 1.42L10.59 13.4L4.29 19.71L2.88 18.3L9.17 12L2.88 5.71L4.29 4.3l6.3 6.3l6.3-6.3z"/></svg>
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
          <input aria-label={t('postfix')} type="text" value={postfix} onChange={e => setPostfix(e.target.value)} placeholder="example.com" spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" maxLength={256} />
          <select aria-label={t('method')} value={method} onChange={e => setMethod(e.target.value)}>
            {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="opt">
            <input id="save-postfix" type="checkbox" checked={save} onChange={e => { setSave(e.target.checked); if (e.target.checked && !label && postfix) setLabel(deriveLabelFromPostfix(postfix)) }} />
            <label htmlFor="save-postfix">{t('save')}</label>
          </div>
          {save ? (
            <input aria-label={t('label')} type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder={t('label')} spellCheck={false} autoCorrect="off" autoCapitalize="none" autoComplete="off" maxLength={128} />
          ) : (
            <div></div>
          )}
          <button className="btn primary" disabled={blocked || !postfix || busy} onClick={() => setConsoleModal(true)} title={t('generate')}>{busy ? '…' : t('generate')}</button>
        </div>

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
                >{revealed ? t('releaseToHide') : t('holdToReveal')}</button>
                {!holdOnlyReveal && <button className="btn" onClick={() => setRevealed(r => !r)} disabled={busy}>{revealed ? t('hide') : t('reveal')}</button>}
                <button className="btn" onClick={() => copy(output)} disabled={busy}>{t('copy')}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for saved generation */}
      {pwModal.open && (
        <div className="modal-backdrop" onClick={() => setPwModal({ id: '', open: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="viewer-modal-title">
            <ViewerPrompt title={t('viewerPassword')} fieldLabel={t('viewerPassword')} confirmLabel={busy ? 'Generating…' : t('generate')} cancelLabel={t('close')} autoCloseMs={viewerPromptTimeoutSeconds * 1000} busy={busy} autoFocus onConfirm={(v) => generateSaved(pwModal.id, v)} onCancel={() => setPwModal({ id: '', open: false })} />
          </div>
        </div>
      )}

      {consoleModal && (
        <div className="modal-backdrop" onClick={() => setConsoleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="viewer-modal-title">
            <ViewerPrompt title={t('viewerPassword')} fieldLabel={t('viewerPassword')} confirmLabel={busy ? 'Generating…' : t('generate')} cancelLabel={t('close')} autoCloseMs={viewerPromptTimeoutSeconds * 1000} busy={busy} autoFocus onConfirm={(v) => generateNew(v)} onCancel={() => setConsoleModal(false)} />
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
