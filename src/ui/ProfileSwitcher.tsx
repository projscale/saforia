import React from 'react'
import { invoke } from '../bridge'

function shortFp(fp: string) {
  if (fp.length <= 12) return fp
  return fp.slice(0,6) + '…' + fp.slice(-4)
}

export function ProfileSwitcher({ onToast }: { onToast: (t: string, k?: 'info'|'success'|'error') => void }) {
  const [active, setActive] = React.useState<string | null>(null)
  const [list, setList] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)

  async function refresh() {
    try {
      const [a, l] = await Promise.all([
        invoke<string | null>('get_active_fingerprint'),
        invoke<string[]>('list_masters'),
      ])
      setActive(a || null)
      setList(l)
    } catch {}
  }
  React.useEffect(() => { refresh() }, [])

  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }} onMouseLeave={() => setOpen(false)}>
      <button className="btn" onMouseEnter={() => setOpen(true)} onClick={() => setOpen(o => !o)} title="Switch master profile">
        {active ? shortFp(active) : 'No master'}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, marginTop: 4, background: '#111318', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, minWidth: 220, zIndex: 10 }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'var(--muted)' }}>Masters</div>
          {list.length === 0 && (<div style={{ padding: 10 }} className="muted">None saved</div>)}
          {list.map(fp => (
            <div key={fp} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8 }}>
              <div className="password">{shortFp(fp)}</div>
              <button className="btn small" disabled={active === fp} onClick={async () => { try { await invoke('set_active_fingerprint', { fp }); setActive(fp); onToast('Active master changed', 'success'); setOpen(false) } catch (e: any) { onToast(String(e), 'error') } }}>Use</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

