import React from 'react'
import { on } from '../events'
import { useI18n } from '../i18n'
import { useFocusTrap } from '../a11y'
import { MobileUnified } from '../screens/MobileUnified'
import { PreferencesMobile } from './PreferencesMobile'
import { BackupMobile } from './BackupMobile'

type Route =
  | 'home'
  | 'prefs.general'
  | 'prefs.security'
  | 'prefs.output'
  | 'backup.export'
  | 'backup.import'
  | 'backup.csv'
  | 'about'

export function MobileRoot({
  methods,
  defaultMethod,
  autosaveQuick,
  blocked,
  autoClearSeconds,
  outputClearSeconds,
  viewerPromptTimeoutSeconds,
  copyOnConsoleGenerate,
  showPostfix,
  holdOnlyReveal,
  clearClipboardOnBlur,
  onToast,
  setDefaultMethod,
  setAutoClearSeconds,
  setMaskSensitive,
  setAutosaveQuick,
  setShowPostfix,
  setViewerPromptTimeoutSeconds,
  setOutputClearSeconds,
  setOutputExtendSeconds,
  setCopyOnConsoleGenerate,
  setHoldOnlyReveal,
  setClearClipboardOnBlur,
  onImported,
  extendSeconds,
}: any) {
  const [route, setRoute] = React.useState<Route>('home')
  const { t } = useI18n()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLElement>(null)
  useFocusTrap(panelRef, menuOpen)

  React.useEffect(() => {
    const off = on('settings:open', (e) => {
      const dest = (e.detail || 'prefs') as any
      if (dest === 'backup') setRoute('backup.export')
      else if (dest === 'about') setRoute('about')
      else setRoute('prefs.general')
    })
    const offOpen = on('mobilemenu:open', () => setMenuOpen(true))
    const offClose = on('mobilemenu:close', () => setMenuOpen(false))
    const offToggle = on('mobilemenu:toggle', () => setMenuOpen(v => !v))
    return () => { off(); offOpen(); offClose(); offToggle() }
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Full-size right sliding navigation for the 3-dots button */}
      {menuOpen && (
        <div className="side-backdrop" onClick={() => setMenuOpen(false)}>
          <nav className="side-panel" role="menu" aria-label="Mobile navigation" aria-labelledby="nav-title" onClick={e => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') setMenuOpen(false) }} ref={panelRef as any}>
            <div className="menu-header">
              <div id="nav-title" className="muted" style={{ fontSize: 12 }}>{t('navigation')}</div>
              <button className="btn small" aria-label={t('close')} onClick={() => setMenuOpen(false)}>{t('close')}</button>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="col" style={{ gap: 6 }}>
                <button className={`btn menu-item ${route==='home'?'active':''}`} autoFocus role="menuitem" aria-current={route==='home' ? 'page' : undefined} onClick={() => { setRoute('home'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z"/></svg>
                  {t('home')}
                </button>
              </div>
              <div className="col" style={{ gap: 6 }}>
                <div className="muted" style={{ fontSize: 11 }}>{t('tabPreferences')}</div>
                <button className={`btn menu-item ${route==='prefs.general'?'active':''}`} role="menuitem" aria-current={route==='prefs.general' ? 'page' : undefined} onClick={() => { setRoute('prefs.general'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm8.94 3.34l-1.71-.99l.01-2.01l-2-3.46l-2.01.01l-1-1.74h-4l-1 1.73l-2.01-.01l-2 3.47l.01 2.01l-1.71 1l-.01 3.99l1.71.99l-.01 2.01l2 3.46l2.01-.01l1 1.74h4l1-1.73l2.01.01l2-3.47l-.01-2.01l1.71-1l.01-3.99Z"/></svg>
                  {t('general')}
                </button>
                <button className={`btn menu-item ${route==='prefs.security'?'active':''}`} role="menuitem" aria-current={route==='prefs.security' ? 'page' : undefined} onClick={() => { setRoute('prefs.security'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l7 3v6c0 5-3.5 9.5-7 11c-3.5-1.5-7-6-7-11V5l7-3Zm0 6a3 3 0 1 0 0 6a3 3 0 0 0 0-6Z"/></svg>
                  {t('security')}
                </button>
                <button className={`btn menu-item ${route==='prefs.output'?'active':''}`} role="menuitem" aria-current={route==='prefs.output' ? 'page' : undefined} onClick={() => { setRoute('prefs.output'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7.6 0-11 7-11 7s3.4 7 11 7s11-7 11-7s-3.4-7-11-7Zm0 12a5 5 0 1 1 0-10a5 5 0 0 1 0 10Z"/></svg>
                  {t('output')}
                </button>
              </div>
              <div className="col" style={{ gap: 6 }}>
                <div className="muted" style={{ fontSize: 11 }}>{t('tabBackup')}</div>
                <button className={`btn menu-item ${route==='backup.export'?'active':''}`} role="menuitem" aria-current={route==='backup.export' ? 'page' : undefined} onClick={() => { setRoute('backup.export'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10l4-4l1.4 1.4L12 17.8L6.6 10.4L8 9l4 4V3h0ZM5 19h14v2H5z"/></svg>
                  {t('export')}
                </button>
                <button className={`btn menu-item ${route==='backup.import'?'active':''}`} role="menuitem" aria-current={route==='backup.import' ? 'page' : undefined} onClick={() => { setRoute('backup.import'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 21V11l-4 4L6.6 13.6L12 8.2l5.4 5.4L16 15l-4-4v10h0ZM5 5h14V3H5z"/></svg>
                  {t('import')}
                </button>
                <button className={`btn menu-item ${route==='backup.csv'?'active':''}`} role="menuitem" aria-current={route==='backup.csv' ? 'page' : undefined} onClick={() => { setRoute('backup.csv'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 3h16v18H4V3Zm4 4H6v2h2V7Zm0 4H6v2h2v-2Zm0 4H6v2h2v-2Zm8-8H10v2h6V7Zm0 4H10v2h6v-2Zm0 4H10v2h6v-2Z"/></svg>
                  {t('csvBackupTitle')}
                </button>
              </div>
              <div className="col" style={{ gap: 6 }}>
                <button className={`btn menu-item ${route==='about'?'active':''}`} role="menuitem" aria-current={route==='about' ? 'page' : undefined} onClick={() => { setRoute('about'); setMenuOpen(false) }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17h2v-6h-2v6Zm0-8h2V7h-2v2Zm1-7C6.5 2 2 6.5 2 12s4.5 10 10 10s10-4.5 10-10S17.5 2 12 2Z"/></svg>
                  {t('howItWorks')}
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
      {route === 'home' && (
        <MobileUnified
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
          extendSeconds={extendSeconds}
          onToast={onToast}
          setDefaultMethod={setDefaultMethod}
          setAutoClearSeconds={setAutoClearSeconds}
          setMaskSensitive={setMaskSensitive}
          setAutosaveQuick={setAutosaveQuick}
          onImported={onImported}
        />
      )}
      {route.startsWith('prefs') && (
        <PreferencesMobile
          onBack={() => setRoute('home')}
          methods={methods}
          defaultMethod={defaultMethod}
          autoClearSeconds={autoClearSeconds}
          maskSensitive={false}
          autosaveQuick={autosaveQuick}
          showPostfix={showPostfix}
          viewerPromptTimeoutSeconds={viewerPromptTimeoutSeconds}
          outputClearSeconds={outputClearSeconds}
          copyOnConsoleGenerate={copyOnConsoleGenerate}
          holdOnlyReveal={holdOnlyReveal}
          clearClipboardOnBlur={clearClipboardOnBlur}
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
          onToast={onToast}
          section={(route.split('.')[1] as any)}
        />
      )}
      {route.startsWith('backup') && (
        <BackupMobile
          onBack={() => setRoute('home')}
          onToast={onToast}
          onImported={onImported}
          section={(route.split('.')[1] as any)}
        />
      )}
      {route === 'about' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn" onClick={() => setRoute('home')}>{t('back') || 'Back'}</button>
            <h3 className="card-title" style={{ margin: 0 }}>{t('howItWorks')}</h3>
            <div style={{ width: 56 }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <section className="section">
              <p className="muted">{t('aboutIntro')}</p>
            </section>
            <section className="section">
              <h4 className="section-title">{t('aboutSecurityTitle')}</h4>
              <ul>
                <li>{t('aboutSec1')}</li>
                <li>{t('aboutSec2')}</li>
                <li>{t('aboutSec3')}</li>
              </ul>
            </section>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={() => setRoute('home')}>{t('close')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
