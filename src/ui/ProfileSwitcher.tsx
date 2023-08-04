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
  const [addOpen, setAddOpen] = React.useState(false)
  const [m1, setM1] = React.useState('')
  const [m2, setM2] = React.useState('')
  const [v1, setV1] = React.useState('')
  const [v2, setV2] = React.useState('')
  const [busy, setBusy] = React.useState(false)

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
          <div style={{ padding: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="btn" onClick={() => setAddOpen(true)}>Add Master…</button>
          </div>
        </div>
      )}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-master-title" onClick={e => e.stopPropagation()}>
            <h3 id="add-master-title">Add Master</h3>
            <div className="col">
              <label>Master password</label>
              <input type="password" value={m1} onChange={e => setM1(e.target.value)} />
              <label>Confirm master password</label>
              <input type="password" value={m2} onChange={e => setM2(e.target.value)} />
              <label>Viewer password</label>
              <input type="password" value={v1} onChange={e => setV1(e.target.value)} />
              <label>Confirm viewer password</label>
              <input type="password" value={v2} onChange={e => setV2(e.target.value)} />
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" disabled={busy || !m1 || m1!==m2 || !v1 || v1!==v2} onClick={async () => {
                setBusy(true)
                try {
                  const fp = await invoke<string>('setup_set_master', { viewerPassword: v1, masterPassword: m1 })
                  onToast('Master added', 'success'); setAddOpen(false); setM1(''); setM2(''); setV1(''); setV2(''); setActive(fp); refresh()
                } catch (e:any) { onToast('Failed: ' + String(e), 'error') }
                finally { setBusy(false) }
              }}>{busy ? 'Saving…' : 'Save'}</button>
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
