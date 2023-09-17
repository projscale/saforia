import React from 'react'
import { invoke } from '../../bridge'
import { useI18n } from '../i18n'

export function Preferences({ methods, defaultMethod, autoClearSeconds, maskSensitive, autosaveQuick, setDefaultMethod, setAutoClearSeconds, setMaskSensitive, setAutosaveQuick, onToast }: {
  methods: { id: string; name: string }[],
  defaultMethod: string,
  autoClearSeconds: number,
  maskSensitive: boolean,
  autosaveQuick: boolean,
  setDefaultMethod: (v: string) => void,
  setAutoClearSeconds: (n: number) => void,
  setMaskSensitive: (v: boolean) => void,
  setAutosaveQuick: (v: boolean) => void,
  onToast: (text: string, kind?: 'info'|'success'|'error') => void,
}) {
  const { lang, setLang, t } = useI18n()
  const [blockWhileCaptured, setBlockWhileCaptured] = React.useState(true)
  const [showPostfix, setShowPostfix] = React.useState(false)
  const [viewerPromptTimeoutSeconds, setViewerPromptTimeoutSeconds] = React.useState(30)
  const [outputClearSeconds, setOutputClearSeconds] = React.useState(60)
  const [copyOnConsoleGenerate, setCopyOnConsoleGenerate] = React.useState(false)
  const [holdOnlyReveal, setHoldOnlyReveal] = React.useState(false)
  const [clearClipboardOnBlur, setClearClipboardOnBlur] = React.useState(false)
  const defaultHelpId = React.useId()
  const maskHelpId = React.useId()
  const autoHelpId = React.useId()
  const autosaveHelpId = React.useId()
  React.useEffect(() => {
    (async () => {
      try {
        const p = await invoke<any>('get_prefs')
        if (typeof p?.block_while_captured === 'boolean') setBlockWhileCaptured(!!p.block_while_captured)
        if (typeof p?.show_postfix_in_list === 'boolean') setShowPostfix(!!p.show_postfix_in_list)
        if (typeof p?.viewer_prompt_timeout_seconds === 'number') setViewerPromptTimeoutSeconds(p.viewer_prompt_timeout_seconds)
        if (typeof p?.output_clear_seconds === 'number') setOutputClearSeconds(p.output_clear_seconds)
        if (typeof p?.copy_on_console_generate === 'boolean') setCopyOnConsoleGenerate(!!p.copy_on_console_generate)
        if (typeof p?.hold_only_reveal === 'boolean') setHoldOnlyReveal(!!p.hold_only_reveal)
        if (typeof p?.clear_clipboard_on_blur === 'boolean') setClearClipboardOnBlur(!!p.clear_clipboard_on_blur)
      } catch {}
    })()
  }, [])
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>{t('tabPreferences')}</h3>
      <div className="row">
        <label>{t('language')}</label>
        <select value={lang} onChange={async (e) => {
          const l = (e.target.value as any)
          setLang(l)
          try { await invoke('set_prefs', { lang: l }) } catch {}
        }}>
          <option value='en'>English</option>
          <option value='ru'>Русский</option>
          <option value='zh'>中文</option>
        </select>
      </div>
      <div className="row">
        <label>{t('defaultMethod')}</label>
        <select aria-describedby={defaultHelpId} value={defaultMethod} onChange={async (e) => {
          const m = e.target.value
          setDefaultMethod(m)
          try { await invoke('set_prefs', { defaultMethod: m }) } catch (err: any) { onToast(String(err), 'error') }
        }}>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <p className="muted" id={defaultHelpId}>{t('helpDefault')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('maskSensitive')}</label>
        <select aria-describedby={maskHelpId} value={maskSensitive ? 'yes' : 'no'} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setMaskSensitive(v)
          try { await invoke('set_prefs', { maskSensitive: v }) } catch (err: any) { onToast(String(err), 'error') }
        }}>
          <option value='no'>No</option>
          <option value='yes'>Yes</option>
        </select>
      </div>
      <p className="muted" id={maskHelpId}>{t('helpMask')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('blockWhileCaptured')}</label>
        <select aria-describedby={maskHelpId} value={blockWhileCaptured ? 'yes' : 'no'} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setBlockWhileCaptured(v)
          try { await invoke('set_prefs', { blockWhileCaptured: v }) } catch (err: any) { onToast(String(err), 'error') }
        }}>
          <option value='yes'>{t('yes')}</option>
          <option value='no'>{t('no')}</option>
        </select>
      </div>
      <p className="muted">{t('helpBlockWhileCaptured')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('showPostfixInList')}</label>
        <select value={showPostfix ? 'yes' : 'no'} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setShowPostfix(v)
          try { await invoke('set_prefs', { showPostfixInList: v }) } catch (err:any) { onToast(String(err), 'error') }
        }}>
          <option value='no'>{t('no')}</option>
          <option value='yes'>{t('yes')}</option>
        </select>
      </div>
      <p className="muted">{t('helpShowPostfixInList')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('autosaveQuick')}</label>
        <select aria-describedby={autosaveHelpId} value={autosaveQuick ? 'yes' : 'no'} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setAutosaveQuick(v)
          try { await invoke('set_prefs', { autosaveQuick: v }) } catch (err: any) { onToast(String(err), 'error') }
        }}>
          <option value='no'>No</option>
          <option value='yes'>Yes</option>
        </select>
      </div>
      <p className="muted" id={autosaveHelpId}>{t('helpAutosave')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('autoClearClipboard')}</label>
        <input aria-describedby={autoHelpId} type="number" min={0} step={5} value={autoClearSeconds} onChange={async (e) => {
          const v = Math.max(0, parseInt(e.target.value || '0', 10))
          setAutoClearSeconds(v)
          try { await invoke('set_prefs', { autoClearSeconds: v }) } catch (err: any) { onToast(String(err), 'error') }
        }} />
      </div>
      <p className="muted" id={autoHelpId}>{t('helpAutoClear')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('outputClearSecondsLabel')}</label>
        <input type="number" min={0} step={5} value={outputClearSeconds} onChange={async (e) => {
          const v = Math.max(0, parseInt(e.target.value || '0', 10))
          setOutputClearSeconds(v)
          try { await invoke('set_prefs', { outputClearSeconds: v }) } catch (err:any) { onToast(String(err), 'error') }
        }} />
      </div>
      <p className="muted">{t('helpOutputClear')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('viewerPromptTimeoutSeconds')}</label>
        <input type="number" min={5} step={5} value={viewerPromptTimeoutSeconds} onChange={async (e) => {
          const v = Math.max(5, parseInt(e.target.value || '0', 10))
          setViewerPromptTimeoutSeconds(v)
          try { await invoke('set_prefs', { viewerPromptTimeoutSeconds: v }) } catch (err:any) { onToast(String(err), 'error') }
        }} />
      </div>
      <p className="muted">{t('helpViewerPrompt')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('copyOnConsoleGenerate')}</label>
        <select value={copyOnConsoleGenerate ? 'yes' : 'no'} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setCopyOnConsoleGenerate(v)
          try { await invoke('set_prefs', { copyOnConsoleGenerate: v }) } catch (err:any) { onToast(String(err), 'error') }
        }}>
          <option value='no'>{t('no')}</option>
          <option value='yes'>{t('yes')}</option>
        </select>
      </div>
      <p className="muted">{t('helpCopyOnConsole')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('holdOnlyReveal')}</label>
        <select value={holdOnlyReveal ? 'yes' : 'no'} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setHoldOnlyReveal(v)
          try { await invoke('set_prefs', { holdOnlyReveal: v }) } catch (err:any) { onToast(String(err), 'error') }
        }}>
          <option value='no'>{t('no')}</option>
          <option value='yes'>{t('yes')}</option>
        </select>
      </div>
      <p className="muted">{t('helpHoldOnlyReveal')}</p>
      <div className="row" style={{ marginTop: 8 }}>
        <label>{t('clearClipboardOnBlur')}</label>
        <select value={proxyValue(clearClipboardOnBlur)} onChange={async (e) => {
          const v = e.target.value === 'yes'
          setClearClipboardOnBlur(v)
          try { await invoke('set_prefs', { clearClipboardOnBlur: v }) } catch (err:any) { onToast(String(err), 'error') }
        }}>
          <option value='no'>{t('no')}</option>
          <option value='yes'>{t('yes')}</option>
        </select>
      </div>
      <p className="muted">{t('helpClearOnBlur')}</p>
    </div>
  )
}

function proxyValue(v: boolean) { return v ? 'yes' : 'no' }
