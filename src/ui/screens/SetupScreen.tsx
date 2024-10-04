import React from 'react'
import { PasswordInput } from '../PasswordInput'
import { useI18n } from '../i18n'

export type SetupState = { master: string; master2: string; viewer: string; viewer2: string }

export function SetupScreen({ state, setState, busy, error, onSubmit }: {
  state: SetupState,
  setState: (s: SetupState) => void,
  busy: boolean,
  error?: string,
  onSubmit: () => void,
}) {
  const { t } = useI18n()
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
    <div className="card setup" style={{ marginBottom: 16, display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0 }}>
      <h3 className="card-title" style={{ marginBottom: 8 }}>{t('initialSetup')}</h3>
      <div className="setup-grid" style={{ minHeight: 0 }}>
        <form onSubmit={(e) => { e.preventDefault(); if (valid && !busy) onSubmit() }} className="col" style={{ minHeight: 0 }}>
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
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary block" disabled={busy || !valid} aria-busy={busy ? 'true' : 'false'}>
              {busy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> {t('saving')}</span>) : t('saveMaster')}
            </button>
          </div>
        </form>
        <aside className="setup-info" style={{ minHeight: 0 }}>
          <p>{t('setupIntro')}</p>
          <ul>
            <li>{t('setupNote1')}</li>
            <li>{t('setupNote2')}</li>
            <li>{t('setupNote3')}</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
