import React from 'react'
import { invoke } from '../bridge'
import { Preferences } from './screens/Preferences'
import { Backup } from './screens/Backup'
import { on, emit } from './events'
import { useI18n } from './i18n'
import { useFocusTrap } from './a11y'

function shortFp(fp: string) {
  if (fp.length <= 12) return fp
  return fp.slice(0,6) + '…' + fp.slice(-4)
}

export function ProfileSwitcher({ onToast, methods, defaultMethod, autoClearSeconds, maskSensitive, autosaveQuick, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, setAutosaveQuick, onImported }: {
  onToast: (t: string, k?: 'info'|'success'|'error') => void,
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autoClearSeconds: number,
  maskSensitive: boolean,
  autosaveQuick: boolean,
  setDefaultMethod: (v: string) => void,
  setAutoClearSeconds: (v: number) => void,
  setMaskSensitive: (v: boolean) => void,
  setAutosaveQuick: (v: boolean) => void,
  onImported: () => void,
}) {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return false
    return window.matchMedia('(max-width: 600px)').matches
  })
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return
    const mq = window.matchMedia('(max-width: 600px)') as any
    const onChange = (e: any) => setIsMobile(!!(e.matches))
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else if (mq.addListener) mq.addListener(onChange)
    return () => { if (mq.removeEventListener) mq.removeEventListener('change', onChange); else if (mq.removeListener) mq.removeListener(onChange) }
  }, [])
  const [active, setActive] = React.useState<string | null>(null)
  const [list, setList] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [settingsTab, setSettingsTab] = React.useState<'prefs'|'backup'|'about'>('prefs')
  const [addOpen, setAddOpen] = React.useState(false)
  const [m1, setM1] = React.useState('')
  const [m2, setM2] = React.useState('')
  const [v1, setV1] = React.useState('')
  const [v2, setV2] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const { t } = useI18n()

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

  const rootRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  // trap focus in dropdown when open
  useFocusTrap(menuRef as any, open)
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return; if (!rootRef.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  React.useEffect(() => {
    const off = on('settings:open', (e) => {
      setSettingsTab((e.detail as any) || 'about')
      if (!isMobile) setSettingsOpen(true)
      // on mobile, MobileUnified will handle this event to navigate internally
    })
    return off
  }, [isMobile])

  function closeSettings() { setSettingsOpen(false); try { emit('settings:close') } catch {} }

  return (
    <div ref={rootRef} style={{ position: 'relative', marginLeft: 'auto' }}>
      <button className="btn" onClick={() => setOpen(o => !o)} title={t('switchProfile')} aria-haspopup="menu" aria-expanded={open ? 'true' : 'false'}>
        {active ? shortFp(active) : t('noMaster')}
      </button>
      {open && (
        <div role="menu" aria-label={t('masters')} ref={menuRef as any} style={{ position: 'absolute', right: 0, marginTop: 4, background: '#111318', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, minWidth: 260, zIndex: 10 }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t('masters')}</span>
            <button className="btn small" onClick={() => setAddOpen(true)}>{t('addMaster')}</button>
          </div>
          {list.length === 0 && (<div style={{ padding: 10 }} className="muted">{t('noneSaved')}</div>)}
          {list.map(fp => (
            <div key={fp} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: 8, background: active===fp ? 'rgba(59,130,246,0.1)' : undefined }}>
              <div className="password" title={fp}>{shortFp(fp)} {active===fp && <span className="badge" title={t('active')}>{t('active')}</span>}</div>
              <button className="btn small" disabled={active === fp} aria-label={t('use')} title={t('use')} onClick={async () => { try { await invoke('set_active_fingerprint', { fp }); setActive(fp); onToast(t('toastActiveChanged'), 'success'); setOpen(false) } catch (e: any) { onToast(String(e), 'error') } }}>{t('use')}</button>
              <button className="btn small danger" aria-label={t('deleteMaster')} title={t('deleteMaster')} onClick={async () => { if (!confirm(t('confirmDeleteMaster'))) return; try { const ok = await invoke<boolean>('delete_master', { fp }); if (ok) { onToast(t('toastMasterDeleted'), 'success'); refresh() } else { onToast(t('toastMasterDeleteFailed'), 'error') } } catch (e:any) { onToast(String(e), 'error') } }}>{t('del')}</button>
            </div>
          ))}
          <div style={{ display: 'grid', gap: 6, padding: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button className="btn" onClick={() => setAddOpen(true)}>{t('addMaster')}</button>
            <button className="btn" title="Bind entries without fingerprint to active master" onClick={async () => {
              try { const n = await invoke<number>('bind_unbound_entries'); onToast(`${t('toastBoundEntriesPrefix')}${n}${t('toastBoundEntriesSuffix')}`, 'success'); setOpen(false) } catch (e:any) { onToast(String(e), 'error') }
            }}>{t('bindLegacy')}</button>
            <button className="btn" onClick={() => { emit('settings:open','prefs'); setOpen(false); if (!isMobile) setSettingsOpen(true) }}>{t('settings')}</button>
          </div>
        </div>
      )}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <AddMasterModal busy={busy} setBusy={setBusy} onClose={() => setAddOpen(false)} onToast={onToast} m1={m1} m2={m2} v1={v1} v2={v2} setM1={setM1} setM2={setM2} setV1={setV1} setV2={setV2} onCreated={(fp)=>{ setActive(fp); refresh() }} />
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" onClick={closeSettings}>
          <SettingsDrawer
            methods={methods}
            defaultMethod={defaultMethod}
            autoClearSeconds={autoClearSeconds}
            maskSensitive={maskSensitive}
            autosaveQuick={autosaveQuick}
            setDefaultMethod={setDefaultMethod}
            setAutoClearSeconds={setAutoClearSeconds}
            setMaskSensitive={setMaskSensitive}
            setAutosaveQuick={setAutosaveQuick}
            onToast={onToast}
            onImported={onImported}
            onClose={closeSettings}
            tab={settingsTab}
            setTab={setSettingsTab}
          />
        </div>
      )}
    </div>
  )
}

function AddMasterModal({ busy, setBusy, onClose, onToast, m1, m2, v1, v2, setM1, setM2, setV1, setV2, onCreated }: { busy: boolean, setBusy: (v:boolean)=>void, onClose: ()=>void, onToast: (t:string,k?:any)=>void, m1:string, m2:string, v1:string, v2:string, setM1:(s:string)=>void, setM2:(s:string)=>void, setV1:(s:string)=>void, setV2:(s:string)=>void, onCreated:(fp:string)=>void }) {
  const { t } = useI18n()
  const ref = React.useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-master-title" onClick={e => e.stopPropagation()} ref={ref}>
      <h3 id="add-master-title" className="card-title">{t('addMaster')}</h3>
      <div className="col">
        <label>{t('masterPassword')}</label>
        <input type="password" value={m1} onChange={e => setM1(e.target.value)} />
        <label>{t('confirmMaster')}</label>
        <input type="password" value={m2} onChange={e => setM2(e.target.value)} />
        <label>{t('viewerPassword')}</label>
        <input type="password" value={v1} onChange={e => setV1(e.target.value)} />
        <label>{t('confirmViewer')}</label>
        <input type="password" value={v2} onChange={e => setV2(e.target.value)} />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn primary" disabled={busy || !m1 || m1!==m2 || !v1 || v1!==v2} onClick={async () => {
          setBusy(true)
          try {
            const fp = await invoke<string>('setup_set_master', { viewerPassword: v1, masterPassword: m1 })
            onToast(t('toastMasterSaved'), 'success'); onClose(); setM1(''); setM2(''); setV1(''); setV2(''); onCreated(fp)
          } catch (e:any) { onToast(t('failedPrefix') + String(e), 'error') }
          finally { setBusy(false) }
        }}>{busy ? t('saving') : t('save')}</button>
        <button className="btn" onClick={onClose}>{t('close')}</button>
      </div>
    </div>
  )
}

function SettingsDrawer(props: any) {
  const { t } = useI18n()
  const ref = React.useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)
  return (
    <div
      className="drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onClick={e => e.stopPropagation()}
      tabIndex={-1}
      ref={ref}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); props.onClose() } }}
    >
      <h3 id="settings-title" className="card-title">{t('settingsTitle')}</h3>
      <SettingsTabs {...props} />
    </div>
  )
}

function SettingsTabs({ methods, defaultMethod, autoClearSeconds, maskSensitive, autosaveQuick, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, setAutosaveQuick, onToast, onImported, onClose, tab, setTab }:{
  methods: { id: string; name: string }[],
  defaultMethod: string, autoClearSeconds: number, maskSensitive: boolean, autosaveQuick: boolean,
  setDefaultMethod: (v:string)=>void, setAutoClearSeconds:(v:number)=>void, setMaskSensitive:(v:boolean)=>void, setAutosaveQuick:(v:boolean)=>void,
  onToast: (t:string,k?:'info'|'success'|'error')=>void, onImported: ()=>void, onClose: ()=>void,
  tab: 'prefs'|'backup'|'about', setTab: (t:'prefs'|'backup'|'about')=>void,
}) {
  const { t } = useI18n()
  return (
    <div className="col">
      <div className="tabs" role="tablist" aria-label={t('settingsTitle')}>
        <button id="tab-prefs" role="tab" aria-controls="panel-prefs" aria-selected={tab==='prefs'} className={`tab ${tab==='prefs' ? 'active' : ''}`} onClick={() => setTab('prefs')}>
          <span className="label">{t('tabPreferences')}</span>
        </button>
        <button id="tab-backup" role="tab" aria-controls="panel-backup" aria-selected={tab==='backup'} className={`tab ${tab==='backup' ? 'active' : ''}`} onClick={() => setTab('backup')}>
          <span className="label">{t('tabBackup')}</span>
        </button>
        <button id="tab-about" role="tab" aria-controls="panel-about" aria-selected={tab==='about'} className={`tab ${tab==='about' ? 'active' : ''}`} onClick={() => setTab('about')}>
          <span className="label">{t('tabAbout')}</span>
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
      {tab==='prefs' && (
        <Preferences
          methods={methods}
          defaultMethod={defaultMethod}
          autoClearSeconds={autoClearSeconds}
          maskSensitive={maskSensitive}
          autosaveQuick={autosaveQuick}
          setDefaultMethod={setDefaultMethod}
          setAutoClearSeconds={setAutoClearSeconds}
          setMaskSensitive={setMaskSensitive}
          setAutosaveQuick={setAutosaveQuick}
          onToast={onToast}
        />
      )}
      {tab==='backup' && (
        <Backup onToast={onToast} onImported={onImported} />
      )}
      {tab==='about' && (
        <AboutDoc />
      )}
    </div>
  )
}

function AboutDoc() {
  const { t } = useI18n()
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 className="card-title">{t('howItWorks')}</h3>
      <p className="muted">{t('aboutIntro')}</p>
      <h4 className="section-title">{t('aboutSecurityTitle')}</h4>
      <ul>
        <li>{t('aboutSec1')}</li>
        <li>{t('aboutSec2')}</li>
        <li>{t('aboutSec3')}</li>
      </ul>
    </div>
  )
}
