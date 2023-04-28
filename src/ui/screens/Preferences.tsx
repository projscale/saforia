import React from 'react'
import { invoke } from '../../bridge'

export function Preferences({ methods, defaultMethod, autoClearSeconds, maskSensitive, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, onToast }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autoClearSeconds: number,
  maskSensitive: boolean,
  setDefaultMethod: (v: string) => void,
  setAutoClearSeconds: (n: number) => void,
  setMaskSensitive: (v: boolean) => void,
  onToast: (text: string, kind?: 'info'|'success'|'error') => void,
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Preferences</h3>
      <div className="row">
        <label>Default method</label>
        <select value={defaultMethod} onChange={async (e) => {
          const m = e.target.value
          setDefaultMethod(m)
          try { await invoke('set_prefs', { defaultMethod: m }) } catch (err: any) { onToast(String(err), 'error') }
        }}>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <label>Mask sensitive content (Linux/Wayland)</label>
        <select value={maskSensitive ? 'yes' : 'no'} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setMaskSensitive(v)
          try { await invoke('set_prefs', { maskSensitive: v }) } catch (err: any) { onToast(String(err), 'error') }
        }}>
          <option value='no'>No</option>
          <option value='yes'>Yes</option>
        </select>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <label>Auto-clear clipboard (seconds, 0 = off)</label>
        <input type="number" min={0} step={5} value={autoClearSeconds} onChange={async (e) => {
          const v = Math.max(0, parseInt(e.target.value || '0', 10))
          setAutoClearSeconds(v)
          try { await invoke('set_prefs', { autoClearSeconds: v }) } catch (err: any) { onToast(String(err), 'error') }
        }} />
      </div>
    </div>
  )
}

