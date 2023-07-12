import React, { useEffect, useMemo, useState } from 'react'
import { invoke, listen } from '../bridge'
import { ToastContainer, useToasts } from './Toast'
import { PasswordInput } from './PasswordInput'
import { SetupScreen, type SetupState } from './screens/SetupScreen'
import { QuickGenerate } from './screens/QuickGenerate'
import { SavedList } from './screens/SavedList'
import { Preferences } from './screens/Preferences'
import { Backup } from './screens/Backup'
import { Fingerprint } from './screens/Fingerprint'

const STRONG_DEFAULT = 'len36_strong'

const methods = [
  { id: 'legacy_v1', name: 'Legacy v1 (MD5 + Base64, trim =)', legacy: true },
  { id: 'legacy_v2', name: 'Legacy v2 (SHA256 + URL-Base64 .-_)', legacy: true },
  { id: 'len10_alnum', name: '10 chars (A-Za-z0-9)' },
  { id: 'len20_alnum', name: '20 chars (A-Za-z0-9)' },
  { id: 'len36_alnum', name: '36 chars (A-Za-z0-9)' },
  { id: 'len10_strong', name: '10 chars + symbols' },
  { id: 'len20_strong', name: '20 chars + symbols' },
  { id: 'len36_strong', name: '36 chars + symbols (default)' },
]

export function App() {
  const [hasMaster, setHasMaster] = useState<boolean>(false)
  const [defaultMethod, setDefaultMethod] = useState(STRONG_DEFAULT)
  const [autoClearSeconds, setAutoClearSeconds] = useState(30)
  const [autosaveQuick, setAutosaveQuick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [setupErr, setSetupErr] = useState('')
  const [setupMaster, setSetupMaster] = useState<SetupState>({ master: '', master2: '', viewer: '', viewer2: '' })
  const [captured, setCaptured] = useState(false)
  const [maskSensitive, setMaskSensitive] = useState(false)
  const blocked = captured || maskSensitive
  const [isWayland, setIsWayland] = useState(false)

  const { toasts, push, remove } = useToasts()
  const testMode = useMemo(() => {
    try { return !!(globalThis as any).SAFORIA_MOCK || new URLSearchParams(globalThis.location?.search || '').get('test') === '1' } catch { return false }
  }, [])
  const [tMaster, setTMaster] = useState('test')
  const [tPostfix, setTPostfix] = useState('example')
  const [tV1, setTV1] = useState<string>('')
  const [tV2, setTV2] = useState<string>('')

  useEffect(() => {
    refresh()
    // load preferences
    invoke<{ default_method: string, auto_clear_seconds: number, mask_sensitive: boolean, autosave_quick?: boolean }>('get_prefs').then(p => {
      if (p?.default_method) setDefaultMethod(p.default_method)
      if (typeof p?.auto_clear_seconds === 'number') {
        setAutoClearSeconds(p.auto_clear_seconds)
      }
      if (typeof (p as any)?.mask_sensitive === 'boolean') {
        setMaskSensitive((p as any).mask_sensitive)
      }
      if (typeof (p as any)?.autosave_quick === 'boolean') {
        setAutosaveQuick(!!(p as any).autosave_quick)
      }
    }).catch(() => {})
    // Detect platform (Wayland)
    invoke<{ os: string, wayland: boolean }>('platform_info').then(info => {
      if (info?.wayland) {
        setIsWayland(true)
        // Enable mask by default if not already enabled
        setMaskSensitive(prev => {
          if (!prev) { try { invoke('set_prefs', { maskSensitive: true }) } catch {} }
          return prev || true
        })
      }
    }).catch(() => {})
    // try to enable content protection best-effort
    invoke('enable_content_protection').catch(() => {})
    // Initial captured state
    invoke<boolean>('is_screen_captured').then(v => setCaptured(!!v)).catch(() => {})
    // Listen for native changes (iOS only; no-op elsewhere)
    const unlistenPromise = listen<boolean>('screen_capture_changed', (e) => {
      setCaptured(!!e.payload)
    })
    return () => { unlistenPromise.then(un => un()) }
  }, [])

  async function refresh() {
    try { setHasMaster(await invoke<boolean>('has_master')) } catch {}
  }

  async function doSetupMaster(e?: React.FormEvent) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault()
    setSetupErr('')
    if (!setupMaster.master || !setupMaster.viewer) { setSetupErr('Enter both master and viewer passwords'); return }
    if (setupMaster.master !== setupMaster.master2) { setSetupErr('Master passwords do not match'); return }
    if (setupMaster.viewer !== setupMaster.viewer2) { setSetupErr('Viewer passwords do not match'); return }
    setBusy(true)
    try {
      await invoke('setup_set_master', { viewerPassword: setupMaster.viewer, masterPassword: setupMaster.master })
      setSetupMaster({ master: '', master2: '', viewer: '', viewer2: '' })
      await refresh()
      push('Master password saved (encrypted by viewer password).', 'success')
    } catch (err: any) {
      const msg = 'Failed to save master: ' + String(err)
      setSetupErr(msg)
      push(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  // App-level add/delete/generate/copy moved to child components

  return (
    <div className="container">
      <ToastContainer toasts={toasts} onClose={remove} />
      <h1>Saforia</h1>
      <p className="muted">Deterministic passwords. One master, viewer-protected.</p>

      {!hasMaster && (
        <SetupScreen state={setupMaster} setState={setSetupMaster} busy={busy} error={setupErr} onSubmit={doSetupMaster} />
      )}

      {hasMaster && (
        <div className="row" style={{ alignItems: 'stretch' }}>
          <QuickGenerate methods={methods} defaultMethod={defaultMethod} autosaveQuick={autosaveQuick} blocked={blocked} onToast={(t,k)=>push(t,k as any)} />
          <SavedList methods={methods} defaultMethod={defaultMethod} blocked={blocked} onToast={(t,k)=>push(t,k as any)} />
        </div>
      )}

      {testMode && hasMaster && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>E2E Smoke (Mock/UI)</h3>
          <div className="row">
            <input placeholder="Master (mock)" value={tMaster} onChange={e => setTMaster(e.target.value)} />
            <input placeholder="Postfix" value={tPostfix} onChange={e => setTPostfix(e.target.value)} />
            <button className="btn" onClick={async () => {
              try {
                const v1 = await invoke<string>('generate_password', { viewerPassword: 'x', postfix: tPostfix, methodId: 'legacy_v1' })
                const v2 = await invoke<string>('generate_password', { viewerPassword: 'x', postfix: tPostfix, methodId: 'legacy_v2' })
                setTV1(v1); setTV2(v2)
              } catch (err: any) {
                push('E2E smoke failed: ' + String(err), 'error')
              }
            }}>Run legacy v1/v2</button>
          </div>
          {(tV1 || tV2) && (
            <div className="col" style={{ marginTop: 8 }}>
              <div>v1: <span className="password">{tV1}</span></div>
              <div>v2: <span className="password">{tV2}</span></div>
            </div>
          )}
          <p className="muted">Set window.SAFORIA_MOCK = true in dev to run without Tauri backend.</p>
        </div>
      )}

      {/* SavedList manages its own modal now */}

      {hasMaster && (
        <Preferences
          methods={methods}
          defaultMethod={defaultMethod}
          autoClearSeconds={autoClearSeconds}
          maskSensitive={maskSensitive}
          autosaveQuick={autosaveQuick}
          setDefaultMethod={(m)=>{ setDefaultMethod(m) }}
          setAutoClearSeconds={setAutoClearSeconds}
          setMaskSensitive={setMaskSensitive}
          setAutosaveQuick={setAutosaveQuick}
          onToast={(t,k)=>push(t,k as any)}
        />
      )}

      {hasMaster && (<Backup onToast={(t,k)=>push(t,k as any)} onImported={refresh} />)}

      {hasMaster && (<Fingerprint onToast={(t,k)=>push(t,k as any)} />)}

      {(captured || maskSensitive) && (
        <div className="capture-overlay">
          <div className="box">
            <h2>{captured ? 'Screen capture detected' : 'Sensitive content masked'}</h2>
            <p>
              {captured
                ? 'For your security, sensitive content is hidden while recording or mirroring is active.'
                : (isWayland ? 'On Linux/Wayland, capture blocking is not guaranteed. Mask mode is enabled.' : 'Mask mode is enabled by preferences.')}
            </p>
          </div>
        </div>
      )}

      {/* confirm delete handled inside SavedList */}
    </div>
  )
}
