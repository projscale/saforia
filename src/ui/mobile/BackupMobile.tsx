import React from 'react'
import { invoke } from '../../bridge'
import { useI18n } from '../i18n'

export function BackupMobile({ onToast, onImported }: {
  onToast: (t: string, k?: 'info'|'success'|'error') => void
  onImported: () => void
}) {
  const { t } = useI18n()
  const [exportBusy, setExportBusy] = React.useState(false)
  const [importBusy, setImportBusy] = React.useState(false)
  const [exportPath, setExportPath] = React.useState('')
  const [exportPass, setExportPass] = React.useState('')
  const [importPath, setImportPath] = React.useState('')
  const [importPass, setImportPass] = React.useState('')
  const [importOverwrite, setImportOverwrite] = React.useState(false)
  const [csvExportPath, setCsvExportPath] = React.useState('')
  const [csvImportPath, setCsvImportPath] = React.useState('')
  const [csvPreview, setCsvPreview] = React.useState<{ fingerprints: [string, number][] } | null>(null)

  function Row({ children }: { children: React.ReactNode }) { return <div className="row" style={{ marginTop: 8, alignItems: 'end' }}>{children}</div> }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <h3 style={{ marginTop: 0 }}>{t('tabBackup')}</h3>
      <div className="col" style={{ gap: 12, flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Export */}
        <div className="col" style={{ gap: 8 }}>
          <h4 style={{ margin: 0 }}>{t('export') || 'Export'}</h4>
            <Row>
              <div className="col" style={{ flex: 1 }}>
                <label>{t('exportToPath')}</label>
                <input placeholder="/path/to/backup.safe" value={exportPath} onChange={e => setExportPath(e.target.value)} />
              </div>
              <div className="col">
                <label>{t('passphraseOptional')}</label>
                <input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" />
              </div>
              <button className="btn" disabled={!exportPath || exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={async () => {
                setExportBusy(true)
                try { await invoke('export_entries', { path: exportPath, passphrase: exportPass || null }); onToast(t('exportedSuccessfully'), 'success'); setExportPass('') }
                catch (err: any) { onToast(t('exportFailedPrefix') + String(err), 'error') }
                finally { setExportBusy(false) }
              }}>{exportBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner"></span> {t('exporting')}</span>) : t('export')}</button>
            </Row>
        </div>

        {/* Import */}
        <div className="col" style={{ gap: 8 }}>
          <h4 style={{ margin: 0 }}>{t('import') || 'Import'}</h4>
            <Row>
              <div className="col" style={{ flex: 1 }}>
                <label>{t('importFromPath')}</label>
                <input placeholder="/path/to/backup.safe" value={importPath} onChange={e => setImportPath(e.target.value)} />
              </div>
              <div className="col">
                <label>{t('passphraseIfUsed')}</label>
                <input type="password" value={importPass} onChange={e => setImportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" />
              </div>
              <div className="col" style={{ minWidth: 120 }}>
                <label>{t('overwrite')}</label>
                <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
                  <option value='no'>{t('no')}</option>
                  <option value='yes'>{t('yes')}</option>
                </select>
              </div>
              <button className="btn" disabled={!importPath || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={async () => {
                setImportBusy(true)
                try { const count = await invoke<number>('import_entries', { path: importPath, passphrase: importPass || null, overwrite: importOverwrite }); onImported(); onToast(`${t('importedCountPrefix')}${count}${t('importedCountSuffix')}`, 'success'); setImportPass('') }
                catch (err: any) { onToast(t('importFailedPrefix') + String(err), 'error') }
                finally { setImportBusy(false) }
              }}>{importBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner"></span> {t('importing')}</span>) : t('import')}</button>
            </Row>
        </div>

        {/* CSV */}
        <div className="col" style={{ gap: 8 }}>
          <h4 style={{ margin: 0 }}>{t('csvBackupTitle')}</h4>
            <Row>
              <div className="col" style={{ flex: 1 }}>
                <label>{t('exportCsvToPath')}</label>
                <input placeholder="/path/to/backup.csv" value={csvExportPath} onChange={e => setCsvExportPath(e.target.value)} />
              </div>
              <button className="btn" disabled={!csvExportPath || exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={async () => {
                setExportBusy(true)
                try { await invoke('export_entries_csv', { path: csvExportPath }); onToast(t('exportedCsv'), 'success') } catch (err:any) { onToast(t('exportCsvFailedPrefix') + String(err), 'error') } finally { setExportBusy(false) }
              }}>{t('exportCsv')}</button>
            </Row>
            <Row>
              <div className="col" style={{ flex: 1 }}>
                <label>{t('csvImportPath')}</label>
                <input placeholder="/path/to/backup.csv" value={csvImportPath} onChange={e => setCsvImportPath(e.target.value)} />
              </div>
              <button className="btn" disabled={!csvImportPath || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={async () => {
                setImportBusy(true)
                try { const prev = await invoke<{ fingerprints: [string, number][] }>('import_entries_csv_preview', { path: csvImportPath }); setCsvPreview(prev) }
                catch (err:any) { onToast(t('importFailedPrefix') + String(err), 'error') }
                finally { setImportBusy(false) }
              }}>{t('preview')}</button>
            </Row>
            {csvPreview && (
              <div className="col" style={{ gap: 6 }}>
                <div className="muted">{t('importedFingerprints')}</div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {csvPreview.fingerprints.slice(0, 8).map(([fp, count]) => (
                    <div key={fp} className="badge" title={`${fp} (${count})`}>{shortFp(fp)} ({count})</div>
                  ))}
                </div>
                <div className="muted">{t('preview')} · {csvPreview.fingerprints.length}</div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn" onClick={() => setCsvPreview(null)}>{t('close')}</button>
                  <button className="btn primary" disabled>{t('apply')} (desktop)</button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

function shortFp(fp: string) { return fp.length <= 12 ? fp : fp.slice(0,6) + '…' + fp.slice(-4) }
