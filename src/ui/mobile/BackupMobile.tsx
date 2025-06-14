import React from 'react'
import { invoke } from '../../bridge'
import { useI18n } from '../i18n'
import { buildBackupFile, countFingerprints, parseBackupBytes, BackupEntry } from '../backupCrypto'
import { FingerprintMapper, Mapping } from '../components/FingerprintMapper'

type PickedFile = { name: string, bytes: Uint8Array }

export function BackupMobile({ onToast, onImported, section, onBack }: {
  onToast: (t: string, k?: 'info'|'success'|'error') => void
  onImported: () => void
  section?: 'export' | 'import' | 'csv'
  onBack?: () => void
}) {
  const { t } = useI18n()
  const [exportBusy, setExportBusy] = React.useState(false)
  const [importBusy, setImportBusy] = React.useState(false)
  const [exportPass, setExportPass] = React.useState('')
  const [importPass, setImportPass] = React.useState('')
  const [importOverwrite, setImportOverwrite] = React.useState(false)
  const [importFile, setImportFile] = React.useState<PickedFile | null>(null)
  const [importPreview, setImportPreview] = React.useState<{ entries: BackupEntry[], counts: { fingerprint: string, count: number }[] } | null>(null)
  const [mapping, setMapping] = React.useState<Mapping>({})
  const [localMasters, setLocalMasters] = React.useState<string[]>([])
  const [mappingModal, setMappingModal] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const [csvExportPath, setCsvExportPath] = React.useState('')
  const [csvImportPath, setCsvImportPath] = React.useState('')
  const [csvPreview, setCsvPreview] = React.useState<{ fingerprints: [string, number][] } | null>(null)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!section) return
    const root = scrollRef.current
    if (!root) return
    const el = root.querySelector(`#backup-${section}`) as HTMLElement | null
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' })
  }, [section])

  React.useEffect(() => { (async () => { try { setLocalMasters(await invoke<string[]>('list_masters')) } catch {} })() }, [])

  function normalizeFp(fp: string | null | undefined) { return fp && fp.length ? fp : '' }

  async function handleExport() {
    if (exportBusy) return
    const filename = `saforia-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.safe`
    setExportBusy(true)
    try {
      const dump = await invoke<{ entries: BackupEntry[] }>('dump_entries')
      const bytes = await buildBackupFile(dump.entries, exportPass || '')
      const blob = new Blob([bytes], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
      onToast(t('exportedSuccessfully'), 'success')
      setExportPass('')
    } catch (err: any) { onToast(t('exportFailedPrefix') + String(err), 'error') } finally { setExportBusy(false) }
  }

  async function readPickedFile(list: FileList | null) {
    if (!list || !list.length) return
    const file = list[0]
    const buf = await file.arrayBuffer()
    setImportFile({ name: file.name, bytes: new Uint8Array(buf) })
    setImportPreview(null)
  }

  async function previewImport() {
    if (!importFile) return
    setImportBusy(true)
    try {
      const entries = await parseBackupBytes(importFile.bytes, importPass)
      const counts = countFingerprints(entries)
      const defaults: Mapping = {}
      counts.forEach(c => { if (localMasters.includes(c.fingerprint)) defaults[c.fingerprint] = c.fingerprint })
      if (counts.length === 1 && localMasters.length === 1) defaults[counts[0].fingerprint] = localMasters[0]
      setMapping(defaults)
      setImportPreview({ entries, counts })
      setMappingModal(true)
    } catch (err: any) { onToast(t('importFailedPrefix') + String(err), 'error') } finally { setImportBusy(false) }
  }

  async function applyImport() {
    if (!importPreview) return
    const mapped: BackupEntry[] = []
    for (const e of importPreview.entries) {
      const key = normalizeFp(e.fingerprint)
      const target = mapping[key]
      if (target && target !== 'ignore') {
        if (!localMasters.includes(target)) continue
        mapped.push({ ...e, fingerprint: target })
      }
    }
    if (!mapped.length) { onToast(t('nothingMapped') || 'Nothing mapped', 'error'); return }
    try {
      setImportBusy(true)
      const count = await invoke<number>('import_entries_payload', { entries: mapped, overwrite: importOverwrite })
      onImported()
      onToast(`${t('importedCountPrefix')}${count}${t('importedCountSuffix')}`, 'success')
      setImportPreview(null); setImportFile(null); setImportPass(''); setMappingModal(false)
    } catch (err: any) { onToast(t('importFailedPrefix') + String(err), 'error') } finally { setImportBusy(false) }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn" onClick={onBack}>{t('back') || 'Back'}</button>
        <h3 className="card-title">{t('tabBackup')}</h3>
        <div style={{ width: 56 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} ref={scrollRef}>
        <section className="section" id="backup-export">
          <h4 className="section-title">{t('export')}</h4>
          <p className="muted" style={{ margin: 0 }}>{t('helpExport')}</p>
          <div className="col" style={{ gap: 8 }}>
            <label>{t('passphraseOptional')}</label>
            <input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" />
            <button className="btn primary" disabled={exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={handleExport}>
              {exportBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner"></span> {t('exporting')}</span>) : t('downloadBackup')}
            </button>
          </div>
        </section>

        <section className="section" id="backup-import">
          <h4 className="section-title">{t('import')}</h4>
          <p className="muted" style={{ margin: 0 }}>{t('importHelpWithMapping')}</p>
          <div className="col" style={{ gap: 8 }}>
            <div className="row" style={{ alignItems: 'center', gap: 8 }}>
              <div className="col" style={{ flex: 1 }}>
                <label>{t('importFromPath')}</label>
                <div className="muted">{importFile ? importFile.name : t('dropOrPickFile')}</div>
              </div>
              <button className="btn" onClick={() => fileInputRef.current?.click()}>{t('chooseFile')}</button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".safe,.json,application/json" onChange={async e => { await readPickedFile(e.target.files); if (fileInputRef.current) fileInputRef.current.value = '' }} />
            </div>
            <label>{t('passphraseIfUsed')}</label>
            <input type="password" value={importPass} onChange={e => setImportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" />
            <label>{t('overwrite')}</label>
            <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
              <option value='no'>{t('no')}</option>
              <option value='yes'>{t('yes')}</option>
            </select>
            <button className="btn primary" disabled={!importFile || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={previewImport}>
              {importBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner"></span> {t('loading')}</span>) : t('previewMapping')}
            </button>
          </div>
        </section>

        <section className="section" id="backup-csv">
          <h4 className="section-title">{t('csvBackupTitle')}</h4>
          <p className="muted" style={{ margin: 0 }}>{t('csvAppOnly')}</p>
          <div className="col" style={{ gap: 8 }}>
            <label>{t('exportCsvToPath')}</label>
            <input placeholder="/path/to/backup.csv" value={csvExportPath} disabled />
            <label>{t('csvImportPath')}</label>
            <input placeholder="/path/to/backup.csv" value={csvImportPath} disabled />
            <button className="btn" disabled>{t('apply')} ({t('desktopOnly') || 'desktop'})</button>
          </div>
          {csvPreview && (
            <div className="col" style={{ gap: 6 }}>
              <div className="muted">{t('importedFingerprints')}</div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {csvPreview.fingerprints.slice(0, 8).map(([fp, count]) => (
                  <div key={fp} className="badge" title={`${fp} (${count})`}>{shortFp(fp)} ({count})</div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {mappingModal && importPreview && (
        <div className="modal-backdrop" onClick={() => setMappingModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="map-mobile-title" onClick={e => e.stopPropagation()}>
            <h3 id="map-mobile-title">{t('mapFingerprints')}</h3>
            <FingerprintMapper mapping={mapping} setMapping={setMapping} imported={importPreview.counts} locals={localMasters} />
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <button className="btn primary" onClick={applyImport} aria-busy={importBusy ? 'true' : 'false'} disabled={importBusy}>{t('applyMapping')}</button>
              <button className="btn" onClick={() => setMappingModal(false)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function shortFp(fp: string) { return fp.length <= 12 ? fp : fp.slice(0,6) + '…' + fp.slice(-4) }
