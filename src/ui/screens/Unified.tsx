import React from 'react'
import { invoke } from '../../bridge'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { emit, on } from '../events'
import { useI18n } from '../i18n'
import { useIsMobile } from '../hooks/useIsMobile'

type Entry = { id: string; label: string; postfix: string; method_id: string; created_at: number; order?: number }

export function Unified({ methods, defaultMethod, autosaveQuick, blocked, autoClearSeconds, outputClearSeconds = 60, viewerPromptTimeoutSeconds = 30, copyOnConsoleGenerate = false, showPostfix = false, holdOnlyReveal = false, clearClipboardOnBlur = false, extendSeconds = 30, onToast }: {
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
  const [resultOpen, setResultOpen] = React.useState(false)
  const [revealed, setRevealed] = React.useState(false)
  const [outPct, setOutPct] = React.useState(0)
  const [outSecsLeft, setOutSecsLeft] = React.useState<number | null>(null)
  const outIvRef = React.useRef<number | null>(null)
  const outputTimer = React.useRef<number | null>(null)
  const outputExpiryRef = React.useRef<number | null>(null)
  const clipboardTimerRef = React.useRef<number | null>(null)
  const clipboardExpiryRef = React.useRef<number | null>(null)
  const viewerHelpId = React.useId()
  const [pwModal, setPwModal] = React.useState<{ id: string, open: boolean }>({ id: '', open: false })
  const [consoleModal, setConsoleModal] = React.useState(false)
  const { t } = useI18n()
  const [draggingId, setDraggingId] = React.useState<string | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const entriesRef = React.useRef<Entry[]>([])
  const draggingIdRef = React.useRef<string | null>(null)
  const dragPointerOffset = React.useRef(0)
  const [dragCursorY, setDragCursorY] = React.useState<number | null>(null)
  const [dragRect, setDragRect] = React.useState<{ left: number, width: number } | null>(null)
  const isNarrow = useIsMobile(1024)
  const colTemplate = showPostfix ? '1fr minmax(68px,90px) minmax(0,1fr) 118px' : '1fr minmax(68px,90px) 118px'

  function sanitizeInput(s: string): string {
    if (!s) return ''
    // remove zero-width characters and control chars; keep spaces
    // Zero-width: U+200B..U+200D, U+FEFF
    const noZW = s.replace(/[\u200B-\u200D\uFEFF]/g, '')
    // C0 controls + DEL
    const noCtl = noZW.replace(/[\u0000-\u001F\u007F]/g, '')
    return noCtl.trim()
  }

  function startOutputCountdown(ms: number) {
    if (outputTimer.current) { clearTimeout(outputTimer.current); outputTimer.current = null }
    if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null }
    if (!ms) { outputExpiryRef.current = null; setOutPct(0); setOutSecsLeft(null); setResultOpen(false); return }
    outputExpiryRef.current = Date.now() + ms
    setOutPct(0); setOutSecsLeft(Math.ceil(ms/1000))
    const start = Date.now()
    outputTimer.current = window.setTimeout(() => { setOutput(null); setRevealed(false); setResultOpen(false); if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null } }, ms)
    const iv = window.setInterval(() => {
      const elapsed = Date.now() - start
      setOutPct(Math.min(100, (elapsed / ms) * 100))
      setOutSecsLeft(Math.max(0, Math.ceil((ms - elapsed)/1000)))
    }, 100)
    outIvRef.current = iv
    window.setTimeout(() => { try { clearInterval(iv) } catch {} }, ms + 120)
  }

  function setOutputWithAutoClear(value: string) {
    setOutput(value)
    setRevealed(false)
    setResultOpen(true)
    const ms = Math.max(0, (outputClearSeconds || 0) * 1000)
    startOutputCountdown(ms)
  }
  
  function extendOutput() {
    if (!output) return
    const extendMs = Math.max(1000, (extendSeconds || 30) * 1000)
    const remainingMs = outputExpiryRef.current ? Math.max(0, outputExpiryRef.current - Date.now()) : Math.max(0, (outSecsLeft || 0) * 1000)
    startOutputCountdown(remainingMs + extendMs)
    extendClipboardTimer(extendMs)
  }

  function scheduleClipboardClear() {
    const ms = Math.max(0, (autoClearSeconds || 0) * 1000)
    if (!ms) {
      clipboardExpiryRef.current = null
      if (clipboardTimerRef.current) { clearTimeout(clipboardTimerRef.current); clipboardTimerRef.current = null }
      return
    }
    setClipboardTimer(ms)
  }

  function setClipboardTimer(ms: number) {
    if (clipboardTimerRef.current) { clearTimeout(clipboardTimerRef.current); clipboardTimerRef.current = null }
    clipboardExpiryRef.current = Date.now() + ms
    try { (emit as any)('clipboard:start', ms) } catch {}
    clipboardTimerRef.current = window.setTimeout(async () => {
      try { await invoke('clear_clipboard_native') } catch {}
      try { await (navigator as any).clipboard?.writeText?.('') } catch {}
      try { (emit as any)('clipboard:stop') } catch {}
    }, ms)
  }

  function extendClipboardTimer(extraMs: number) {
    if (!clipboardExpiryRef.current) return
    const remaining = Math.max(0, clipboardExpiryRef.current - Date.now())
    const next = remaining + extraMs
    setClipboardTimer(next)
  }

  React.useEffect(() => { setMethod(defaultMethod) }, [defaultMethod])
  React.useEffect(() => { setSave(autosaveQuick) }, [autosaveQuick])

  async function load() { try { setEntries(await invoke<Entry[]>('list_entries')) } catch {} }
  React.useEffect(() => { load() }, [])
  React.useEffect(() => on('entries:changed', () => { load() }), [])
  React.useEffect(() => { entriesRef.current = entries }, [entries])

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
      <div className="scroll-outer adjust-wide" style={{ height: '100%', minHeight: 0 }}>
        <div className="list list-scroll" style={{ maxHeight: isNarrow ? '50vh' : '60vh', overflow: 'auto', rowGap: 4, alignContent: 'start' }}>
          <div className="list-item list-header" style={{ fontSize: 12, fontWeight: 600, padding: '5px 8px', gridTemplateColumns: colTemplate, lineHeight: 1.1 }}>
            <div className="label-col">{t('label')}</div>
            <div className="method-col" style={{ textAlign: 'center' }}>{t('method')}</div>
            {showPostfix && <div style={{ textAlign: 'center' }}>{t('postfix')}</div>}
            <div style={{ justifySelf: 'end' }}>{t('actions')}</div>
          </div>
          {entries.filter(e => {
            const q = search.trim().toLowerCase();
            if (!q) return true; return e.label.toLowerCase().includes(q) || e.postfix.toLowerCase().includes(q)
          }).map(e => (
            <div
              key={e.id}
              ref={node => {
                if (node) { rowRefs.current[e.id] = node }
                else { delete rowRefs.current[e.id] }
              }}
              className={`list-item${draggingId === e.id ? ' drag-placeholder' : ''}${dragOverId === e.id ? ' drag-over' : ''}`}
              style={{
                padding: '3px 6px',
                minHeight: 28,
                fontSize: 11,
                rowGap: 2,
                gridTemplateColumns: colTemplate,
              }}
              onDoubleClick={() => setPwModal({ id: e.id, open: true })}
            >
              <div className="label-col" style={{ fontWeight: 600, lineHeight: 1.05, fontSize: 12 }}>{e.label}</div>
              <div className="method-col" style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.1, padding: '1px 6px', borderRadius: 2, border: '1px solid rgba(148,163,184,0.35)', background: 'rgba(11,15,25,0.95)' }}>{shortMethod(e.method_id)}</div>
              {showPostfix && <div className="muted" style={{ fontSize: 10.5, lineHeight: 1.1 }}>{e.postfix}</div>}
              <div className="row actions-col" style={{ gap: 3, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('dragToReorder')}
                  title={t('dragToReorder')}
                  onPointerDown={ev => beginDrag(ev, e.id)}
                  onClick={ev => ev.preventDefault()}
                  style={{ cursor: 'grab', width: 24, height: 24 }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M9 5h2v2H9V5Zm4 0h2v2h-2V5ZM9 11h2v2H9v-2Zm4 0h2v2h-2v-2ZM9 17h2v2H9v-2Zm4 0h2v2h-2v-2Z"/>
                  </svg>
                </button>
                <button className="icon-btn" aria-label={t('generate')} title={t('generate')} onClick={() => setPwModal({ id: e.id, open: true })} disabled={blocked} style={{ width: 24, height: 24 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 5l7 7l-7 7v-4H4v-6h9V5z"/></svg>
                </button>
                <button className="icon-btn danger" aria-label={t('deleteEntry')} title={t('deleteEntry')} onClick={async () => { setBusy(true); try { await invoke('delete_entry', { id: e.id }); emit('entries:changed'); onToast(t('toastEntryDeleted'), 'success') } catch (err: any) { onToast(t('toastEntryDeleteFailed') + ': ' + String(err), 'error') } finally { setBusy(false) } }} style={{ width: 24, height: 24 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29l-1.41 1.42L10.59 13.4L4.29 19.71L2.88 18.3L9.17 12L2.88 5.71L4.29 4.3l6.3 6.3l6.3-6.3z"/></svg>
                </button>
              </div>
            </div>
          ))}
          {entries.length === 0 && (<div className="muted" style={{ padding: 8 }}>{t('emptyListHelp')}</div>)}
        </div>
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

        <div className="output-row" style={{ alignItems: 'center' }}>
          <div style={{ width: '100%' }}></div>
        </div>
      </div>

      {resultOpen && output && (
        <div className="modal-backdrop" onClick={() => { setResultOpen(false); setOutput(null) }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="result-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3 id="result-title" className="card-title" style={{ marginBottom: 6 }}>{t('generate')}</h3>
            <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
              <span className="badge" style={{ marginRight: 6 }}>{(methods.find(m => m.id === method)?.name) || method}</span>
              {postfix && <span style={{ marginLeft: 6 }}>{t('postfix')}: <span className="password">{postfix}</span></span>}
            </p>
            <div className="col" style={{ gap: 10 }}>
              <div className="password" style={{ fontSize: 18, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', wordBreak: 'break-word' }}>
                {revealed ? output : '•'.repeat(Math.min(24, output.length))}
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => setRevealed(r => !r)} aria-label={revealed ? t('hide') : t('reveal')} title={revealed ? t('hide') : t('reveal')}>
                  {revealed ? t('hide') : t('reveal')}
                </button>
                <button className="btn" onClick={() => copy(output)}>{t('copy')}</button>
                <button className="btn" onClick={extendOutput}>{t('extend')}</button>
                <button className="btn" onClick={() => { setResultOpen(false); setOutput(null) }}>{t('close')}</button>
              </div>
              <div className={`progress thin ${outPct >= 80 ? 'danger' : (outPct >= 60 ? 'warn' : '')}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(outPct)}>
                <div className="bar" style={{ width: `${outPct}%` }}></div>
              </div>
              {outSecsLeft !== null && (
                <div className="muted" style={{ fontSize: 12 }}>{t('autoCloseIn')} {outSecsLeft}s</div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Drag ghost overlay (desktop) */}
      {draggingId && dragRect && dragCursorY != null && (() => {
        const ghostEntry = entries.find(e => e.id === draggingId)
        if (!ghostEntry) return null
        const top = dragCursorY - dragPointerOffset.current
        return (
          <div
            className="list drag-ghost"
            style={{
              position: 'fixed',
              left: dragRect.left,
              top,
              width: dragRect.width,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <div
              className="list-item dragging"
              style={{
                gridTemplateColumns: showPostfix ? '1fr minmax(72px,100px) minmax(0,1fr) 132px' : '1fr minmax(72px,100px) 132px',
              }}
            >
              <div className="label-col">{ghostEntry.label}</div>
              <div className="method-col">{shortMethod(ghostEntry.method_id)}</div>
              {showPostfix && <div className="muted">{ghostEntry.postfix}</div>}
              <div className="row actions-col" style={{ gap: 6 }}>
                <button className="icon-btn" aria-hidden="true" style={{ cursor: 'grab' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M9 5h2v2H9V5Zm4 0h2v2h-2V5ZM9 11h2v2H9v-2Zm4 0h2v2h-2v-2ZM9 17h2v2H9v-2Zm4 0h2v2h-2v-2Z"/>
                  </svg>
                </button>
                <button className="icon-btn" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 5l7 7l-7 7v-4H4v-6h9V5z"/></svg>
                </button>
                <button className="icon-btn danger" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29l-1.41 1.42L10.59 13.4L4.29 19.71L2.88 18.3L9.17 12L2.88 5.71L4.29 4.3l6.3 6.3l6.3-6.3z"/></svg>
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )

	function beginDrag(ev: React.PointerEvent, id: string) {
    if (ev.button !== 0) return
    ev.preventDefault()
    const row = rowRefs.current[id]
    if (!row) return
    const rect = row.getBoundingClientRect()
    draggingIdRef.current = id
    setDraggingId(id)
    setDragOverId(id)
    dragPointerOffset.current = ev.clientY - rect.top
    setDragCursorY(ev.clientY)
    setDragRect({ left: rect.left, width: rect.width })
    const handle = ev.currentTarget as HTMLElement
    handle.setPointerCapture?.(ev.pointerId)

    const move = (pev: PointerEvent) => {
      if (!draggingIdRef.current) return
      pev.preventDefault()
      const pointerY = pev.clientY
      const currentId = draggingIdRef.current

      // Determine target index based on row midpoints under the pointer
      const ids = entriesRef.current.map(e => e.id)
      let targetIndex = ids.length - 1
      const prevPositions: Record<string, number> = {}
      for (let i = 0; i < ids.length; i++) {
        const nodeForId = rowRefs.current[ids[i]]
        if (!nodeForId) continue
        const r = nodeForId.getBoundingClientRect()
        prevPositions[ids[i]] = r.top
        const mid = r.top + r.height / 2
        if (pointerY < mid) {
          targetIndex = i
          break
        }
      }

      setEntries(prev => {
        const list = prev.slice()
        const from = list.findIndex(x => x.id === currentId)
        if (from === -1) { entriesRef.current = list; return prev }
        if (targetIndex !== from) {
          const [item] = list.splice(from, 1)
          list.splice(targetIndex, 0, item)
          entriesRef.current = list
          setDragOverId(list[targetIndex]?.id || null)

          // FLIP animation for non-dragged rows
          window.requestAnimationFrame(() => {
            const afterIds = entriesRef.current.map(e => e.id)
            const deltas: { id: string, dy: number }[] = []
            for (const id of afterIds) {
              if (id === currentId) continue
              const node = rowRefs.current[id]
              const prevTop = prevPositions[id]
              if (!node || prevTop == null) continue
              const rect = node.getBoundingClientRect()
              const dy = prevTop - rect.top
              if (Math.abs(dy) > 1) {
                deltas.push({ id, dy })
              }
            }
            if (!deltas.length) return
            // Apply initial transform
            for (const { id, dy } of deltas) {
              const node = rowRefs.current[id]
              if (node) {
                node.style.transform = `translateY(${dy}px)`
              }
            }
            // Next frame, reset transform to let CSS transition animate
            window.requestAnimationFrame(() => {
              for (const { id } of deltas) {
                const node = rowRefs.current[id]
                if (node) {
                  node.style.transform = ''
                }
              }
            })
          })

          return list
        }
        entriesRef.current = list
        return prev
      })
      setDragCursorY(pointerY)
    }

    const end = (pev: PointerEvent) => {
      pev.preventDefault()
      handle.releasePointerCapture?.(ev.pointerId)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      const idNow = draggingIdRef.current
      draggingIdRef.current = null
      setDraggingId(null)
      setDragOverId(null)
      setDragCursorY(null)
      setDragRect(null)
      if (!idNow) return
      const ids = entriesRef.current.map(e => e.id)
      invoke('reorder_entries', { ids }).catch(err => {
        onToast((t('failedPrefix') || 'Failed: ') + String(err), 'error')
      })
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

}

function shortMethod(id: string): string {
  if (id.startsWith('legacy')) return 'legacy'
  const m = id.match(/^len(\d+)_(alnum|strong)$/)
  if (m) return `${m[1]}${m[2] === 'strong' ? '+' : ''}`
  return id
}
