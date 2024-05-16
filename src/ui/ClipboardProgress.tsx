import React from 'react'
import { on } from './events'
import { useI18n } from './i18n'

export function ClipboardProgress() {
  const [visible, setVisible] = React.useState(false)
  const [pct, setPct] = React.useState(0)
  const [secsLeft, setSecsLeft] = React.useState<number | null>(null)
  const startRef = React.useRef(0)
  const durRef = React.useRef(0)
  const ivRef = React.useRef<number | null>(null)
  const { t } = useI18n()
  React.useEffect(() => {
    const offStart = on('clipboard:start', (e) => {
      const ms = (e.detail as number) || 0
      if (!ms) return
      startRef.current = Date.now(); durRef.current = ms
      setPct(0); setVisible(true); setSecsLeft(Math.ceil(ms/1000))
      if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null }
      ivRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startRef.current
        setPct(Math.min(100, (elapsed / durRef.current) * 100))
        setSecsLeft(Math.max(0, Math.ceil((durRef.current - elapsed)/1000)))
        if (elapsed >= durRef.current) {
          setVisible(false)
          if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null }
        }
      }, 100)
    })
    const offStop = on('clipboard:stop', () => { setVisible(false); if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null } })
    return () => { offStart(); offStop(); if (ivRef.current) clearInterval(ivRef.current) }
  }, [])
  if (!visible) return null
  return (
    <div style={{ position: 'fixed', right: 12, bottom: 58, zIndex: 10006, width: 220 }}>
      <div className={`progress small ${pct >= 80 ? 'danger' : (pct >= 60 ? 'warn' : '')}`} aria-live="polite">
        <div className="bar" style={{ width: `${pct}%` }} />
      </div>
      {secsLeft !== null && (
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{t('autoCloseIn')} {secsLeft}s</div>
      )}
    </div>
  )
}
