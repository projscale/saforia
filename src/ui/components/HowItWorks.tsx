import React from 'react'
import { useI18n } from '../i18n'

export function HowItWorks({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h3 className="card-title">{t('howItWorks')}</h3>
      {/* Overview */}
      <section className="section">
        <p className="muted">{t('aboutOverviewP1')}</p>
        <p className="muted">{t('aboutOverviewP2')}</p>
      </section>

      {/* Core concepts */}
      <section className="section">
        <h4 className="section-title">{t('aboutConceptsTitle')}</h4>
        <ul>
          <li><strong>{t('aboutMasterTitle')}:</strong> {t('aboutMasterBody')}</li>
          <li><strong>{t('aboutViewerTitle')}:</strong> {t('aboutViewerBody')}</li>
          <li><strong>{t('aboutPostfixTitle')}:</strong> {t('aboutPostfixBody')}</li>
          <li><strong>{t('aboutMethodTitle')}:</strong> {t('aboutMethodBody')}</li>
        </ul>
      </section>

      {/* Generation flow */}
      <section className="section">
        <h4 className="section-title">{t('aboutGenerationTitle')}</h4>
        <ol>
          <li>{t('aboutGenStep1')}</li>
          <li>{t('aboutGenStep2')}</li>
          <li>{t('aboutGenStep3')}</li>
          <li>{t('aboutGenStep4')}</li>
          <li>{t('aboutGenStep5')}</li>
          <li>{t('aboutGenStep6')}</li>
        </ol>
      </section>

      {/* Methods */}
      <section className="section">
        <h4 className="section-title">{t('aboutMethodsDetailsTitle')}</h4>
        <ul>
          <li>{t('aboutMethodsAlnum')}</li>
          <li>{t('aboutMethodsStrong')}</li>
          <li>{t('aboutMethodsLength')}</li>
          <li>{t('aboutMethodsLegacy')}</li>
        </ul>
      </section>

      {/* Using the app */}
      <section className="section">
        <h4 className="section-title">{t('aboutUsingTitle')}</h4>
        <ul>
          <li>{t('aboutUsingQuick')}</li>
          <li>{t('aboutUsingSave')}</li>
          <li>{t('aboutUsingSaved')}</li>
          <li>{t('aboutUsingReorder')}</li>
          <li>{t('aboutUsingShowPostfixWarning')}</li>
        </ul>
      </section>

      {/* Output & clipboard */}
      <section className="section">
        <h4 className="section-title">{t('aboutOutputClipboardTitle')}</h4>
        <ul>
          <li>{t('aboutOutputReveal')}</li>
          <li>{t('aboutOutputHold')}</li>
          <li>{t('aboutOutputTimer')}</li>
          <li>{t('aboutOutputExtend')}</li>
          <li>{t('aboutClipboardCopy')}</li>
          <li>{t('aboutClipboardAutoClear')}</li>
        </ul>
      </section>

      {/* Security & privacy */}
      <section className="section">
        <h4 className="section-title">{t('aboutSecurityPrivacyTitle')}</h4>
        <ul>
          <li>{t('aboutSecurityMask')}</li>
          <li>{t('aboutSecurityBlockWhileCaptured')}</li>
          <li>{t('aboutSecurityClearOnBlur')}</li>
          <li>{t('aboutSecurityWayland')}</li>
          <li>{t('aboutSecurityNoNetwork')}</li>
        </ul>
      </section>

      {/* Backup & import */}
      <section className="section">
        <h4 className="section-title">{t('aboutBackupTitle')}</h4>
        <ul>
          <li>{t('aboutBackupExport')}</li>
          <li>{t('aboutBackupImport')}</li>
        </ul>
        <h5 className="section-title">{t('aboutCsvTitle')}</h5>
        <ul>
          <li>{t('aboutCsvNotes')}</li>
        </ul>
      </section>

      {/* Links */}
      <section className="section">
        <h4 className="section-title">{t('aboutLinksTitle')}</h4>
        <ul>
          <li>
            {t('aboutLinkSite')}: <a href="https://projscale.dev" target="_blank" rel="noreferrer noopener">projscale.dev</a>
          </li>
          <li>
            {t('aboutLinkRepo')}: <a href="https://github.com/projscale/saforia" target="_blank" rel="noreferrer noopener">github.com/projscale/saforia</a>
          </li>
        </ul>
      </section>
    </div>
  )
}
