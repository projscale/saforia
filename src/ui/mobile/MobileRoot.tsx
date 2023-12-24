import React from 'react'
import { on } from '../events'
import { useI18n } from '../i18n'
import { MobileUnified } from '../screens/MobileUnified'

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
      {route !== 'home' && (
        <div className="card" style={{ marginTop: 12, display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0, overflow: 'hidden' }}>
          <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <button className="btn" onClick={() => setRoute('home')} aria-label={t('back') || 'Back'}>{t('back') || 'Back'}</button>
            <h3 style={{ margin: 0 }}>
              {route.startsWith('prefs') && (t('tabPreferences') || 'Preferences')}
              {route.startsWith('backup') && (t('tabBackup') || 'Backup')}
              {route === 'about' && (t('howItWorks') || 'How it works')}
            </h3>
            <div style={{ width: 56 }}></div>
          </div>
          <div style={{ minHeight: 0, overflow: 'hidden' }}>
            {/* Placeholder content for upcoming dedicated mobile screens (no scroll) */}
            <div className="col" style={{ gap: 8 }}>
              <p className="muted">Mobile page is being refactored to full-screen sections without vertical scroll.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

