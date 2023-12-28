import React from 'react'
import { on } from '../events'
import { useI18n } from '../i18n'
import { MobileUnified } from '../screens/MobileUnified'
import { PreferencesMobile } from './PreferencesMobile'

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
    </div>
  )
}
