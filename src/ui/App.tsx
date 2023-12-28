import React, { useEffect, useMemo, useState } from 'react'
import { invoke, listen } from '../bridge'
import { ToastContainer, useToasts } from './Toast'
import { PasswordInput } from './PasswordInput'
import { SetupScreen, type SetupState } from './screens/SetupScreen'
import { Unified } from './screens/Unified'
import { MobileUnified } from './screens/MobileUnified'
import { MobileRoot } from './mobile/MobileRoot'
// Preferences and Backup are now accessible via the profile switcher settings modal
import { ProfileSwitcher } from './ProfileSwitcher'
import { emit } from './events'
import { useI18n } from './i18n'
import { useIsMobile } from './hooks/useIsMobile'
import { useViewportHeight } from './hooks/useViewportHeight'

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
  // Ensure CSS --vh reflects true viewport height (iOS mobile safe)
  useViewportHeight()
  const [hasMaster, setHasMaster] = useState<boolean>(false)
  const [defaultMethod, setDefaultMethod] = useState(STRONG_DEFAULT)
  const [autoClearSeconds, setAutoClearSeconds] = useState(30)
  const [outputClearSeconds, setOutputClearSeconds] = useState(60)
  const [autosaveQuick, setAutosaveQuick] = useState(false)
  const [busy, setBusy] = useState(false)
  const [setupErr, setSetupErr] = useState('')
  const [setupMaster, setSetupMaster] = useState<SetupState>({ master: '', master2: '', viewer: '', viewer2: '' })
  const [captured, setCaptured] = useState(false)
  const [maskSensitive, setMaskSensitive] = useState(false)
  const [blockWhileCaptured, setBlockWhileCaptured] = useState(true)
  const [showPostfix, setShowPostfix] = useState(false)
  const [viewerPromptTimeoutSeconds, setViewerPromptTimeoutSeconds] = useState(30)
  const [copyOnConsoleGenerate, setCopyOnConsoleGenerate] = useState(false)
  const [holdOnlyReveal, setHoldOnlyReveal] = useState(false)
  const [clearClipboardOnBlur, setClearClipboardOnBlur] = useState(false)
  const blocked = (captured && blockWhileCaptured) || maskSensitive
  const [isWayland, setIsWayland] = useState(false)
  const isMobile = useIsMobile(600)

  const { toasts, push, remove } = useToasts()
  const { t } = useI18n()
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
    invoke<{ default_method: string, auto_clear_seconds: number, mask_sensitive: boolean, autosave_quick?: boolean, block_while_captured?: boolean, show_postfix_in_list?: boolean, viewer_prompt_timeout_seconds?: number, output_clear_seconds?: number, copy_on_console_generate?: boolean, hold_only_reveal?: boolean, clear_clipboard_on_blur?: boolean }>('get_prefs').then(p => {
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
      if (typeof (p as any)?.block_while_captured === 'boolean') setBlockWhileCaptured(!!(p as any).block_while_captured)
      if (typeof (p as any)?.show_postfix_in_list === 'boolean') setShowPostfix(!!(p as any).show_postfix_in_list)
      if (typeof (p as any)?.viewer_prompt_timeout_seconds === 'number') setViewerPromptTimeoutSeconds((p as any).viewer_prompt_timeout_seconds)
      if (typeof (p as any)?.output_clear_seconds === 'number') setOutputClearSeconds((p as any).output_clear_seconds)
      if (typeof (p as any)?.copy_on_console_generate === 'boolean') setCopyOnConsoleGenerate(!!(p as any).copy_on_console_generate)
      if (typeof (p as any)?.hold_only_reveal === 'boolean') setHoldOnlyReveal(!!(p as any).hold_only_reveal)
      if (typeof (p as any)?.clear_clipboard_on_blur === 'boolean') setClearClipboardOnBlur(!!(p as any).clear_clipboard_on_blur)
    }).catch(() => {})
    // Detect platform (Wayland)
    invoke<{ os: string, wayland: boolean }>('platform_info').then(info => {
      if (info?.wayland) {
        setIsWayland(true)
        // Enable mask by default if not already enabled
        setMaskSensitive(prev => {
          if (!prev) { try { invoke('set_prefs', { mask_sensitive: true }) } catch {} }
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
    if (!setupMaster.master || !setupMaster.viewer) { setSetupErr(t('errEnterBoth') || 'Enter both master and viewer passwords'); return }
    if (setupMaster.master !== setupMaster.master2) { setSetupErr(t('masterMismatch') || 'Master passwords do not match'); return }
    if (setupMaster.viewer !== setupMaster.viewer2) { setSetupErr(t('viewerMismatch') || 'Viewer passwords do not match'); return }
    setBusy(true)
    try {
      await invoke('setup_set_master', { viewerPassword: setupMaster.viewer, masterPassword: setupMaster.master })
      setSetupMaster({ master: '', master2: '', viewer: '', viewer2: '' })
      await refresh()
      push(t('toastMasterSaved'), 'success')
    } catch (err: any) {
      const msg = (t('toastSaveMasterFailedPrefix') || 'Failed to save master: ') + String(err)
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
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <h1 className="app-title">Saforia</h1>
        {hasMaster && (
          <div className="row" style={{ marginLeft: 'auto', alignItems: 'center', flexWrap: 'nowrap' }}>
            {!isMobile && (
              <button className="btn" onClick={() => emit('settings:open', 'about')} title={t('howItWorks')}>{t('howItWorks')}</button>
            )}
            <ProfileSwitcher
              onToast={(t,k)=>push(t,k as any)}
              methods={methods}
              defaultMethod={defaultMethod}
              autoClearSeconds={autoClearSeconds}
              maskSensitive={maskSensitive}
              autosaveQuick={autosaveQuick}
              setDefaultMethod={setDefaultMethod}
              setAutoClearSeconds={setAutoClearSeconds}
              setMaskSensitive={setMaskSensitive}
              setAutosaveQuick={setAutosaveQuick}
              onImported={refresh}
            />
            {isMobile && (
              <button className="mobile-menu-btn" aria-label="Menu" title="Menu" onClick={() => emit('mobilemenu:toggle')}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 7a2 2 0 1 0 0-4a2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4a2 2 0 0 0 0 4Zm0 7a2 2 0 1 0 0-4a2 2 0 0 0 0 4Z"/></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {!hasMaster && (
        <SetupScreen state={setupMaster} setState={setSetupMaster} busy={busy} error={setupErr} onSubmit={doSetupMaster} />
      )}

      {hasMaster && (!isMobile ? (
        <Unified
          methods={methods}
          defaultMethod={defaultMethod}
          autosaveQuick={autosaveQuick}
          blocked={blocked}
          autoClearSeconds={autoClearSeconds}
          outputClearSeconds={outputClearSeconds}
          viewerPromptTimeoutSeconds={viewerPromptTimeoutSeconds}
          copyOnConsoleGenerate={copyOnConsoleGenerate}
          showPostfix={showPostfix}
          holdOnlyReveal={holdOnlyReveal}
          clearClipboardOnBlur={clearClipboardOnBlur}
          onToast={(t,k)=>push(t,k as any)}
        />
      ) : (
        <MobileRoot
          methods={methods}
          defaultMethod={defaultMethod}
          autosaveQuick={autosaveQuick}
          blocked={blocked}
          autoClearSeconds={autoClearSeconds}
          outputClearSeconds={outputClearSeconds}
          viewerPromptTimeoutSeconds={viewerPromptTimeoutSeconds}
          copyOnConsoleGenerate={copyOnConsoleGenerate}
          showPostfix={showPostfix}
          holdOnlyReveal={holdOnlyReveal}
          clearClipboardOnBlur={clearClipboardOnBlur}
          onToast={(t,k)=>push(t,k as any)}
          setDefaultMethod={setDefaultMethod}
          setAutoClearSeconds={setAutoClearSeconds}
          setMaskSensitive={setMaskSensitive}
          setAutosaveQuick={setAutosaveQuick}
          setShowPostfix={setShowPostfix}
          setViewerPromptTimeoutSeconds={setViewerPromptTimeoutSeconds}
          setOutputClearSeconds={setOutputClearSeconds}
          setCopyOnConsoleGenerate={setCopyOnConsoleGenerate}
          setHoldOnlyReveal={setHoldOnlyReveal}
          setClearClipboardOnBlur={setClearClipboardOnBlur}
          onImported={refresh}
        />
      ))}

      {testMode && hasMaster && (
        <div className="card" style={{ position: 'fixed', right: 16, bottom: 16, width: 420, maxWidth: '96vw', zIndex: 1000, pointerEvents: 'none' }}>
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

      {/* Preferences and Backup moved to Settings modal */}

      {/* Fingerprint panel removed per request; available in About/Backup */}

      {(captured || maskSensitive) && (
        <div className="capture-overlay">
          <div className="box">
            <h2>{captured ? t('overlayTitleCapture') : t('overlayTitleMasked')}</h2>
            <p>
              {captured
                ? t('overlayMsgCapture')
                : (isWayland ? t('overlayMsgWaylandMask') : t('overlayMsgMaskEnabled'))}
            </p>
          </div>
        </div>
      )}

      {/* confirm delete handled inside SavedList */}
    </div>
  )
}
