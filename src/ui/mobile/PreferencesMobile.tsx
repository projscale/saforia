import React from 'react'
import { invoke } from '../../bridge'
import { useI18n } from '../i18n'

type Section = 'general' | 'security' | 'output'

export function PreferencesMobile({
  section,
  methods,
  defaultMethod,
  autoClearSeconds,
  maskSensitive,
  autosaveQuick,
  showPostfix,
  viewerPromptTimeoutSeconds,
  outputClearSeconds,
  copyOnConsoleGenerate,
  holdOnlyReveal,
  clearClipboardOnBlur,
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
  onToast,
  onNext,
  onBack,
}: {
  section: Section
  methods: { id: string; name: string }[]
  defaultMethod: string
  autoClearSeconds: number
  maskSensitive: boolean
  autosaveQuick: boolean
  showPostfix: boolean
  viewerPromptTimeoutSeconds: number
  outputClearSeconds: number
  copyOnConsoleGenerate: boolean
  holdOnlyReveal: boolean
  clearClipboardOnBlur: boolean
  setDefaultMethod: (v: string) => void
  setAutoClearSeconds: (v: number) => void
  setMaskSensitive: (v: boolean) => void
  setAutosaveQuick: (v: boolean) => void
  setShowPostfix: (v: boolean) => void
  setViewerPromptTimeoutSeconds: (v: number) => void
  setOutputClearSeconds: (v: number) => void
  setCopyOnConsoleGenerate: (v: boolean) => void
  setHoldOnlyReveal: (v: boolean) => void
  setClearClipboardOnBlur: (v: boolean) => void
  onToast: (t: string, k?: 'info'|'success'|'error') => void
  onNext: () => void
  onBack: () => void
}) {
  const { t } = useI18n()

  function Row({ children }: { children: React.ReactNode }) {
    return <div className="row" style={{ marginTop: 8 }}>{children}</div>
  }

  return (
    <div className="card" style={{ display: 'grid', gridTemplateRows: '1fr auto', minHeight: 0, overflow: 'hidden' }}>
      <div className="col" style={{ gap: 8, minHeight: 0, overflow: 'hidden' }}>
        {section === 'general' && (
          <>
            <h3 style={{ marginTop: 0 }}>{t('tabPreferences') || 'Preferences'} — {t('general') || 'General'}</h3>
            <div className="row">
              <label>{t('defaultMethod')}</label>
              <select value={defaultMethod} onChange={async (e) => {
                const m = e.target.value
                setDefaultMethod(m)
                try { await invoke('set_prefs', { defaultMethod: m }) } catch (err: any) { onToast(String(err), 'error') }
              }}>
                {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <Row>
              <label>{t('autosaveQuick')}</label>
              <select value={autosaveQuick ? 'yes' : 'no'} onChange={async (e) => {
                const v = e.target.value === 'yes'
                setAutosaveQuick(v)
                try { await invoke('set_prefs', { autosave_quick: v }) } catch (err: any) { onToast(String(err), 'error') }
              }}>
                <option value='no'>{t('no')}</option>
                <option value='yes'>{t('yes')}</option>
              </select>
            </Row>
            <Row>
              <label>{t('autoClearClipboard')}</label>
              <input type="number" min={0} step={5} value={autoClearSeconds} onChange={async (e) => {
                const v = Math.max(0, parseInt(e.target.value || '0', 10))
                setAutoClearSeconds(v)
                try { await invoke('set_prefs', { auto_clear_seconds: v }) } catch (err: any) { onToast(String(err), 'error') }
              }} />
            </Row>
          </>
        )}

        {section === 'security' && (
          <>
            <h3 style={{ marginTop: 0 }}>{t('tabPreferences') || 'Preferences'} — {t('security') || 'Security'}</h3>
            <Row>
              <label>{t('maskSensitive')}</label>
              <select value={maskSensitive ? 'yes' : 'no'} onChange={async (e) => {
                const v = e.target.value === 'yes'
                setMaskSensitive(v)
                try { await invoke('set_prefs', { mask_sensitive: v }) } catch (err: any) { onToast(String(err), 'error') }
              }}>
                <option value='no'>{t('no')}</option>
                <option value='yes'>{t('yes')}</option>
              </select>
            </Row>
            <Row>
              <label>{t('blockWhileCaptured')}</label>
              <select value={holdOnlyReveal ? 'yes' : 'no'} onChange={async (e) => {
                const v = e.target.value === 'yes'
                setHoldOnlyReveal(v)
                try { await invoke('set_prefs', { hold_only_reveal: v }) } catch (err: any) { onToast(String(err), 'error') }
              }}>
                <option value='no'>{t('no')}</option>
                <option value='yes'>{t('yes')}</option>
              </select>
            </Row>
            <Row>
              <label>{t('clearClipboardOnBlur')}</label>
              <select value={clearClipboardOnBlur ? 'yes' : 'no'} onChange={async (e) => {
                const v = e.target.value === 'yes'
                setClearClipboardOnBlur(v)
                try { await invoke('set_prefs', { clear_clipboard_on_blur: v }) } catch (err:any) { onToast(String(err), 'error') }
              }}>
                <option value='no'>{t('no')}</option>
                <option value='yes'>{t('yes')}</option>
              </select>
            </Row>
            <Row>
              <label>{t('viewerPromptTimeoutSeconds')}</label>
              <input type="number" min={5} step={5} value={viewerPromptTimeoutSeconds} onChange={async (e) => {
                const v = Math.max(5, parseInt(e.target.value || '0', 10))
                setViewerPromptTimeoutSeconds(v)
                try { await invoke('set_prefs', { viewer_prompt_timeout_seconds: v }) } catch (err:any) { onToast(String(err), 'error') }
              }} />
            </Row>
          </>
        )}

        {section === 'output' && (
          <>
            <h3 style={{ marginTop: 0 }}>{t('tabPreferences') || 'Preferences'} — {t('output') || 'Output'}</h3>
            <Row>
              <label>{t('showPostfixInList')}</label>
              <select value={showPostfix ? 'yes' : 'no'} onChange={async (e) => {
                const v = e.target.value === 'yes'
                setShowPostfix(v)
                try { await invoke('set_prefs', { show_postfix_in_list: v }) } catch (err:any) { onToast(String(err), 'error') }
              }}>
                <option value='no'>{t('no')}</option>
                <option value='yes'>{t('yes')}</option>
              </select>
            </Row>
            <Row>
              <label>{t('outputClearSecondsLabel')}</label>
              <input type="number" min={0} step={5} value={outputClearSeconds} onChange={async (e) => {
                const v = Math.max(0, parseInt(e.target.value || '0', 10))
                setOutputClearSeconds(v)
                try { await invoke('set_prefs', { output_clear_seconds: v }) } catch (err:any) { onToast(String(err), 'error') }
              }} />
            </Row>
            <Row>
              <label>{t('copyOnConsoleGenerate')}</label>
              <select value={copyOnConsoleGenerate ? 'yes' : 'no'} onChange={async (e) => {
                const v = e.target.value === 'yes'
                setCopyOnConsoleGenerate(v)
                try { await invoke('set_prefs', { copy_on_console_generate: v }) } catch (err:any) { onToast(String(err), 'error') }
              }}>
                <option value='no'>{t('no')}</option>
                <option value='yes'>{t('yes')}</option>
              </select>
            </Row>
          </>
        )}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn" onClick={onBack}>{t('back') || 'Back'}</button>
        <button className="btn primary" onClick={onNext}>{t('next') || 'Next'}</button>
      </div>
    </div>
  )
}

