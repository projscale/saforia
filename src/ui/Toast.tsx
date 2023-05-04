import React from 'react'

type Toast = { id: string, text: string, kind?: 'info'|'error'|'success' }

export function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const push = React.useCallback((text: string, kind: Toast['kind'] = 'info', ms = 2500) => {
    const t: Toast = { id: `${Date.now()}-${Math.random()}`, text, kind }
    setToasts(prev => [...prev, t])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), ms)
  }, [])
  const remove = React.useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])
  return { toasts, push, remove }
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[], onClose: (id: string) => void }) {
  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, display: 'grid', gap: 8, zIndex: 10000 }} aria-live="polite" role="status">
      {toasts.map(t => (
        <div key={t.id} onClick={() => onClose(t.id)} style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 8, minWidth: 200,
          color: 'var(--fg)', background: t.kind === 'error' ? 'rgba(255,0,0,0.12)' : (t.kind==='success' ? 'rgba(0,255,0,0.12)' : 'rgba(255,255,255,0.06)'),
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {t.text}
        </div>
      ))}
    </div>
  )
}
