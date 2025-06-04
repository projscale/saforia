import React from 'react'
import { PasswordInput } from '../PasswordInput'
import { useI18n } from '../i18n'
import { invoke } from '../../bridge'

export type SetupState = { master: string; master2: string; viewer: string; viewer2: string }

export function SetupScreen({ state, setState, busy, error, onSubmit }: {
  state: SetupState,
  setState: (s: SetupState) => void,
  busy: boolean,
  error?: string,
  onSubmit: () => void,
}) {
  const { t, lang, setLang } = useI18n()
  function hasInvisible(s: string): boolean {
    if (!s) return false
    return /[\u200B-\u200D\uFEFF\u0000-\u001F\u007F]/.test(s)
  }
  const masterHasInv = hasInvisible(state.master) || hasInvisible(state.master2)
  const viewerHasInv = hasInvisible(state.viewer) || hasInvisible(state.viewer2)
  const valid = !!state.master && !!state.viewer && state.master === state.master2 && state.viewer === state.viewer2 && !masterHasInv && !viewerHasInv
  const viewerHelpId = React.useId()
  const masterErrId = React.useId()
  const viewerErrId = React.useId()
  const masterMismatch = !!state.master && !!state.master2 && state.master !== state.master2
  const viewerMismatch = !!state.viewer && !!state.viewer2 && state.viewer !== state.viewer2
  return (
    <div className="card setup">
      <div className="setup-inner">
        <div className="row setup-header">
          <div className="col setup-header-main">
            <div className="setup-brand" aria-label="Saforia">
              <div className="setup-logo" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 3a5 5 0 0 0-5 5v2.1A4 4 0 0 0 5 14v4a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-4a4 4 0 0 0-2-3.464V8a5 5 0 0 0-5-5Zm-3 5a3 3 0 0 1 6 0v1.5H9Z" />
                </svg>
              </div>
              <span className="setup-brand-name">Saforia</span>
            </div>
            <div className="setup-step-pill muted">
              <span className="setup-step-dot" aria-hidden="true"></span>
              <span>{t('setupStepLabel') || 'Step 1 · Create your keys'}</span>
            </div>
            <h2 className="card-title setup-title">{t('initialSetup')}</h2>
            <p className="muted setup-tagline">{t('setupTagline') || 'Define Master and Viewer once to unlock the rest of the app.'}</p>
          </div>
          <div className="row setup-lang">
            <span className="muted setup-lang-label">{t('language')}</span>
            <select
              value={lang}
              onChange={async (e) => {
                const l = e.target.value as any
                setLang(l)
                try { await invoke('set_prefs', { lang: l }) } catch {}
              }}
              className="setup-lang-select"
            >
              <option value='en'>English</option>
              <option value='ru'>Русский</option>
              <option value='zh'>中文</option>
            </select>
          </div>
        </div>
        <div className="setup-grid">
          <form onSubmit={(e) => { e.preventDefault(); if (valid && !busy) onSubmit() }} className="col setup-form-card">
          {/* hidden username for browser heuristics */}
          <input type="text" name="username" autoComplete="username" aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }} />
          <section className="section">
            <h4 className="section-title">{t('masterPassword')}</h4>
            <p className="muted" style={{ margin: 0 }}>{t('setupMasterHelp')}</p>
            <PasswordInput label={t('masterPassword')} value={state.master} onChange={v => setState({ ...state, master: v })} placeholder={t('masterPlaceholder')} autoComplete="new-password" />
            <div className="input-group">
              <PasswordInput label={t('confirmMaster')} value={state.master2} onChange={v => setState({ ...state, master2: v })} placeholder={t('masterRepeatPlaceholder')} autoComplete="new-password" describedBy={masterMismatch ? masterErrId : undefined} />
              {masterMismatch && <span id={masterErrId} className="muted" style={{ color: 'var(--danger)' }} aria-live="polite">{t('masterMismatch') || 'Master passwords do not match'}</span>}
              {!masterMismatch && masterHasInv && <span className="muted" style={{ color: 'var(--danger)' }} aria-live="assertive">{t('warnInvisibleChars') || 'Input contains invisible/unsupported characters.'}</span>}
            </div>
          </section>
          <section className="section">
            <h4 className="section-title">{t('viewerPassword')}</h4>
            <p className="muted" style={{ margin: 0 }}>{t('setupViewerHelp')}</p>
            <PasswordInput label={t('viewerPassword')} value={state.viewer} onChange={v => setState({ ...state, viewer: v })} placeholder={t('viewerPlaceholder')} autoComplete="new-password" describedBy={viewerHelpId} />
            <div className="input-group">
              <PasswordInput label={t('confirmViewer')} value={state.viewer2} onChange={v => setState({ ...state, viewer2: v })} placeholder={t('viewerRepeatPlaceholder')} autoComplete="new-password" describedBy={viewerMismatch ? viewerErrId : undefined} />
              {viewerMismatch && <span id={viewerErrId} className="muted" style={{ color: 'var(--danger)' }} aria-live="polite">{t('viewerMismatch') || 'Viewer passwords do not match'}</span>}
              {!viewerMismatch && viewerHasInv && <span className="muted" style={{ color: 'var(--danger)' }} aria-live="assertive">{t('warnInvisibleChars') || 'Input contains invisible/unsupported characters.'}</span>}
            </div>
          </section>
          {error && <div role="alert" aria-live="assertive" className="muted" style={{ color: 'var(--danger)' }}>{error}</div>}
          <div className="row" style={{ marginTop: 12, justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div className="muted" style={{ fontSize: 11 }}>{t('setupHint') || 'You will only set these once. You can manage them later from Settings.'}</div>
            <button className="btn primary" style={{ minWidth: 140 }} disabled={busy || !valid} aria-busy={busy ? 'true' : 'false'}>
              {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> {t('saving')}</span>) : t('saveMaster')}
            </button>
          </div>
        </form>
        <aside className="setup-info setup-info-card">
          <p className="muted">{t('setupIntro')}</p>
          <ul>
            <li>{t('setupNote1')}</li>
            <li>{t('setupNote2')}</li>
            <li>{t('setupNote3')}</li>
          </ul>
          <div className="section" style={{ marginTop: 12 }}>
            <p className="muted"><strong>{t('masterPassword')}:</strong> {t('setupMasterExplain')}</p>
            <p className="muted"><strong>{t('viewerPassword')}:</strong> {t('setupViewerExplain')}</p>
          </div>
        </aside>
      </div>
      </div>
    </div>
  )
}
