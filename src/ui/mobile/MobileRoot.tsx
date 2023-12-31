import React from 'react'
import { on } from '../events'
import { useI18n } from '../i18n'
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

  React.useEffect(() => {
    const off = on('settings:open', (e) => {
      const dest = (e.detail || 'prefs') as any
      if (dest === 'backup') setRoute('backup.export')
      else if (dest === 'about') setRoute('about')
      else setRoute('prefs.general')
    })
    return () => off()
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr', height: '100%', minHeight: 0, overflow: 'hidden' }}>
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
          section={route.split('.')[1] as any}
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
          onBack={() => setRoute('home')}
          onNext={() => setRoute(route === 'prefs.general' ? 'prefs.security' : (route === 'prefs.security' ? 'prefs.output' : 'home'))}
        />
      )}
      {route.startsWith('backup') && (
        <BackupMobile
          section={route.split('.')[1] as any}
          onToast={onToast}
          onImported={onImported}
          onBack={() => setRoute('home')}
          onNext={() => setRoute(route === 'backup.export' ? 'backup.import' : (route === 'backup.import' ? 'backup.csv' : 'home'))}
        />
      )}
      {route === 'about' && (
        <div className="card" style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0, overflow: 'hidden' }}>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn" onClick={() => setRoute('home')}>{t('back') || 'Back'}</button>
            <h3 style={{ margin: 0 }}>{t('howItWorks')}</h3>
            <div style={{ width: 56 }} />
          </div>
          <div className="col" style={{ gap: 8, minHeight: 0, overflow: 'hidden' }}>
            <p className="muted">Saforia — детерминированный генератор паролей. Он соединяет мастер‑пароль и постфикс сервиса и по хэш‑алгоритму получает конечный пароль.</p>
            <ul>
              <li>Мастер хранится только зашифрованно.</li>
              <li>Viewer не сохраняется; вводится для расшифровки мастера.</li>
              <li>Копирование — вручную, опциональная авто‑очистка буфера.</li>
            </ul>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={() => setRoute('home')}>{t('close')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
