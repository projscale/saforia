import React from 'react'
import { on } from './events'

export function ClipboardProgress() {
  const [visible, setVisible] = React.useState(false)
  const [pct, setPct] = React.useState(0)
  const startRef = React.useRef(0)
  const durRef = React.useRef(0)
  const ivRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    const offStart = on('clipboard:start', (e) => {
      const ms = (e.detail as number) || 0
      if (!ms) return
      startRef.current = Date.now(); durRef.current = ms
      setPct(0); setVisible(true)
      if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null }
      ivRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startRef.current
        setPct(Math.min(100, (elapsed / durRef.current) * 100))
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
      <div className="progress small"><div className="bar" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

