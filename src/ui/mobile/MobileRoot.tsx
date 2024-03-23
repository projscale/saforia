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
  setCopyOnConsoleGenerate,
  setHoldOnlyReveal,
  setClearClipboardOnBlur,
  onImported,
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
          <nav className="side-panel" role="menu" aria-label="Mobile navigation" onClick={e => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') setMenuOpen(false) }} ref={panelRef as any}>
            <div className="menu-header">
              <div className="muted" style={{ fontSize: 12 }}>{t('navigation')}</div>
              <button className="btn small" aria-label={t('close')} onClick={() => setMenuOpen(false)}>{t('close')}</button>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <div className="col" style={{ gap: 6 }}>
                <button className={`btn menu-item ${route==='home'?'active':''}`} autoFocus role="menuitem" onClick={() => { setRoute('home'); setMenuOpen(false) }}>{t('home')}</button>
              </div>
              <div className="col" style={{ gap: 6 }}>
                <div className="muted" style={{ fontSize: 11 }}>{t('tabPreferences')}</div>
                <button className={`btn menu-item ${route==='prefs.general'?'active':''}`} role="menuitem" onClick={() => { setRoute('prefs.general'); setMenuOpen(false) }}>{t('general')}</button>
                <button className={`btn menu-item ${route==='prefs.security'?'active':''}`} role="menuitem" onClick={() => { setRoute('prefs.security'); setMenuOpen(false) }}>{t('security')}</button>
                <button className={`btn menu-item ${route==='prefs.output'?'active':''}`} role="menuitem" onClick={() => { setRoute('prefs.output'); setMenuOpen(false) }}>{t('output')}</button>
              </div>
              <div className="col" style={{ gap: 6 }}>
                <div className="muted" style={{ fontSize: 11 }}>{t('tabBackup')}</div>
                <button className={`btn menu-item ${route==='backup.export'?'active':''}`} role="menuitem" onClick={() => { setRoute('backup.export'); setMenuOpen(false) }}>{t('export')}</button>
                <button className={`btn menu-item ${route==='backup.import'?'active':''}`} role="menuitem" onClick={() => { setRoute('backup.import'); setMenuOpen(false) }}>{t('import')}</button>
                <button className={`btn menu-item ${route==='backup.csv'?'active':''}`} role="menuitem" onClick={() => { setRoute('backup.csv'); setMenuOpen(false) }}>{t('csvBackupTitle')}</button>
              </div>
              <div className="col" style={{ gap: 6 }}>
                <button className={`btn menu-item ${route==='about'?'active':''}`} role="menuitem" onClick={() => { setRoute('about'); setMenuOpen(false) }}>{t('howItWorks')}</button>
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
              <p className="muted">Saforia — детерминированный генератор паролей. Он соединяет мастер‑пароль и постфикс сервиса и по хэш‑алгоритму получает конечный пароль.</p>
            </section>
            <section className="section">
              <h4 className="section-title">Модель безопасности</h4>
              <ul>
                <li>Мастер хранится только зашифрованно.</li>
                <li>Viewer не сохраняется; вводится для расшифровки мастера.</li>
                <li>Копирование — вручную, опциональная авто‑очистка буфера.</li>
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
