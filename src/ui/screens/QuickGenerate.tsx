import React from 'react'
import { invoke } from '../../bridge'
import { ViewerPrompt } from '../components/ViewerPrompt'
import { emit } from '../events'
import { useI18n } from '../i18n'

export function QuickGenerate({ methods, defaultMethod, autosaveQuick, blocked, onToast }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autosaveQuick: boolean,
  blocked: boolean,
  onToast: (text: string, kind?: 'info'|'success'|'error') => void,
}) {
  const { t } = useI18n()
  const [postfix, setPostfix] = React.useState('')
  const [method, setMethod] = React.useState(defaultMethod)
  const [save, setSave] = React.useState(autosaveQuick)
  const [label, setLabel] = React.useState('')
  const [output, setOutput] = React.useState<string | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const holdTimer = React.useRef<number | null>(null)
  const viewerHelpId = React.useId()
  const outTimerRef = React.useRef<number | null>(null)
  const outIvRef = React.useRef<number | null>(null)
  const [outPct, setOutPct] = React.useState(0)
  const [outSecsLeft, setOutSecsLeft] = React.useState<number | null>(null)

  React.useEffect(() => { setMethod(defaultMethod) }, [defaultMethod])
  React.useEffect(() => { setSave(autosaveQuick) }, [autosaveQuick])

  async function copy(text: string) {
    let ok = false
    try { ok = await invoke<boolean>('write_clipboard_native', { text }) } catch {}
    if (!ok) { try { await (navigator as any).clipboard?.writeText?.(text); ok = true } catch {} }
    if (ok) {
      onToast(t('toastCopied'), 'success')
      const ms = 30000
      try { const { emit } = await import('../events'); (emit as any)('clipboard:start', ms) } catch {}
      setTimeout(async () => {
        try { await invoke('clear_clipboard_native') } catch {}
        try { await (navigator as any).clipboard?.writeText?.('') } catch {}
        try { const { emit } = await import('../events'); (emit as any)('clipboard:stop') } catch {}
      }, ms)
    } else {
      onToast(t('toastCopyFailed'), 'error')
    }
  }

  function deriveLabelFromPostfix(p: string) {
    const trimmed = (p || '').trim()
    if (!trimmed) return ''
    // simple heuristic: domain without TLD, else capitalize whole
    const parts = trimmed.split('.')
    const base = parts.length > 1 ? parts[0] : trimmed
    return base.slice(0, 1).toUpperCase() + base.slice(1)
  }

  async function generateNow(viewerPassword: string) {
    if (!viewerPassword || !postfix) return
    setBusy(true)
    try {
      const pw = await invoke<string>('generate_password', { viewerPassword, postfix, methodId: method })
      setOutput(pw); setRevealed(false)
      // auto-hide with progress after 60s
      const ms = 60000
      if (outTimerRef.current) { clearTimeout(outTimerRef.current); outTimerRef.current = null }
      if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null }
      setOutPct(0); setOutSecsLeft(Math.ceil(ms/1000))
      const start = Date.now()
      outTimerRef.current = window.setTimeout(() => { setOutput(null); setRevealed(false); if (outIvRef.current) { clearInterval(outIvRef.current); outIvRef.current = null } }, ms)
      const iv = window.setInterval(() => {
        const elapsed = Date.now() - start
        setOutPct(Math.min(100, (elapsed / ms) * 100))
        setOutSecsLeft(Math.max(0, Math.ceil((ms - elapsed)/1000)))
      }, 100)
      outIvRef.current = iv
      if (save) {
        const lbl = label.trim() || deriveLabelFromPostfix(postfix)
        if (lbl) {
          try { await invoke('add_entry', { label: lbl, postfix, methodId: method }); emit('entries:changed') } catch {}
        }
      }
    } catch (err: any) { onToast(t('toastGenerateFailed') + ': ' + String(err), 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="card" style={{ flex: 1 }}>
      <h3>{t('quickGenerate')}</h3>
      <div className="col">
        <label>{t('postfix')}</label>
        <input value={postfix} onChange={e => setPostfix(e.target.value)} placeholder={t('postfixPlaceholder')} />
        <label>{t('method')}</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="row" style={{ alignItems: 'end' }}>
          <div className="col">
            <div className="row" style={{ alignItems: 'center' }}>
              <input id="save-postfix" type="checkbox" checked={save} onChange={e => { setSave(e.target.checked); if (e.target.checked && !label && postfix) setLabel(deriveLabelFromPostfix(postfix)) }} />
              <label htmlFor="save-postfix">{t('savePostfix')}</label>
            </div>
          </div>
          {save && (
            <div className="col" style={{ flex: 1 }}>
              <label>{t('label')}</label>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder={t('labelPlaceholder')} />
            </div>
          )}
        </div>

        <ViewerPrompt
          title={undefined}
          confirmLabel={busy ? t('generating') : t('generate')}
          busy={busy}
          disabled={blocked || !postfix}
          describedBy={viewerHelpId}
          onConfirm={generateNow}
        />
      </div>
      <p className="muted" id={viewerHelpId}>{t('viewerHelp')}</p>
      {output && (
        <div style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="password">{revealed ? output : '•'.repeat(Math.min(12, output.length))}</div>
            <div className="row">
              <button className="btn" disabled={blocked}
                onPointerDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                onPointerUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                onPointerCancel={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                onMouseDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                onMouseUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
                onTouchStart={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => setRevealed(true), 120) }}
                onTouchEnd={() => { if (holdTimer.current) clearTimeout(holdTimer.current); setRevealed(false) }}
              aria-label={revealed ? t('releaseToHide') : t('holdToReveal')} title={revealed ? t('releaseToHide') : t('holdToReveal')}>{revealed ? t('releaseToHide') : t('holdToReveal')}</button>
              <button className="btn" onClick={() => setRevealed(r => !r)} disabled={blocked || busy} aria-label={revealed ? t('hide') : t('reveal')} title={revealed ? t('hide') : t('reveal')}>{revealed ? t('hide') : t('reveal')}</button>
              <button className="btn" onClick={() => copy(output)} disabled={blocked || busy} aria-label={t('copyPassword')} title={t('copyPassword')}>{t('copy')}</button>
            </div>
          </div>
          <div className={`progress thin ${outPct >= 80 ? 'danger' : (outPct >= 60 ? 'warn' : '')}`} aria-hidden="true"><div className="bar" style={{ width: `${outPct}%` }} /></div>
          {outSecsLeft !== null && (
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="muted">{t('autoCloseIn')} {outSecsLeft}s</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
