import React from 'react'
import { invoke } from '../../bridge'
import { useI18n } from '../i18n'
import { buildBackupFile, buildCsv, parseBackupBytes, parseCsvEntries, BackupEntry } from '../backupCrypto'
import { FingerprintMapper, Mapping } from '../components/FingerprintMapper'

type PickedFile = { name: string, bytes: Uint8Array }

const hasTauri = () => !!(globalThis as any)?.__TAURI_INTERNALS__?.invoke

export function Backup({ onToast, onImported }: { onToast: (t: string, k?: 'info'|'success'|'error') => void, onImported: () => void }) {
  const { t } = useI18n()
  const [exportBusy, setExportBusy] = React.useState(false)
  const [importBusy, setImportBusy] = React.useState(false)
  const [mode, setMode] = React.useState<'export'|'import'>('export')
  const [exportFormat, setExportFormat] = React.useState<'safe'|'csv'>('safe')
  const [exportPass, setExportPass] = React.useState('')
  const [importPass, setImportPass] = React.useState('')
  const [importOverwrite, setImportOverwrite] = React.useState(false)
  const [importFile, setImportFile] = React.useState<PickedFile | null>(null)
  const [importPreview, setImportPreview] = React.useState<{ entries: BackupEntry[], counts: { fingerprint: string, count: number }[] } | null>(null)
  const [mapping, setMapping] = React.useState<Mapping>({})
  const [localMasters, setLocalMasters] = React.useState<string[]>([])
  const [mappingModal, setMappingModal] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const impHelpId = React.useId()

  React.useEffect(() => { (async () => { try { setLocalMasters(await invoke<string[]>('list_masters')) } catch {} })() }, [])

  function normalizeFp(fp: string | null | undefined) { return fp && fp.length ? fp : '' }
  function formatBytes(n: number) { if (!n) return '0 B'; const u = ['B','KB','MB','GB']; let v=n; let i=0; while (v>=1024&&i<u.length-1){v/=1024;i++;} return `${v.toFixed(1)} ${u[i]}` }
  function defaultFilename(ext: 'safe'|'csv') { const stamp = new Date().toISOString().replace(/[:.]/g,'-'); return `saforia-backup-${stamp}.${ext}` }
  function basename(p: string) { if (!p) return ''; const parts = p.split(/[/\\]/); return parts[parts.length - 1] || p }
  function asBytes(res: any): Uint8Array {
    if (res instanceof Uint8Array) return res
    if (Array.isArray(res)) return Uint8Array.from(res as number[])
    return new Uint8Array()
  }

  async function pickTarget(ext: 'safe'|'csv'): Promise<string | null> {
    try {
      return await invoke<string>('pick_backup_target', { ext })
    } catch (err:any) {
      return null
    }
  }

  async function pickSource(): Promise<string | null> {
    try {
      return await invoke<string>('pick_backup_source', { exts: ['safe','csv'] })
    } catch (err:any) {
      return null
    }
  }

  async function saveBlob(bytes: Uint8Array, filename: string, mime: string) {
    const blob = new Blob([bytes], { type: mime })
    const anyNav = navigator as any
    if (anyNav?.showSaveFilePicker) {
      try {
        const handle = await anyNav.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'Backup', accept: { [mime]: filename.endsWith('.csv') ? ['.csv'] : ['.safe'] } }] })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (err:any) {
        if (String(err).includes('abort')) throw err
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
  }

  async function handleExport() {
    if (exportBusy) return
    setExportBusy(true)
    try {
      if (hasTauri()) {
        const target = await pickTarget(exportFormat)
        if (!target) {
          // fallback to web download
          const filename = defaultFilename(exportFormat)
          if (exportFormat === 'csv') {
            const dump = await invoke<{ entries: BackupEntry[] }>('dump_entries')
            const csv = buildCsv(dump.entries)
            await saveBlob(new TextEncoder().encode(csv), filename, 'text/csv')
          } else {
            const dump = await invoke<{ entries: BackupEntry[] }>('dump_entries')
            const bytes = await buildBackupFile(dump.entries, exportPass || '')
            await saveBlob(bytes, filename, 'application/json')
            setExportPass('')
          }
          onToast(t('exportedSuccessfully'), 'success')
          return
        }
        if (exportFormat === 'csv') {
          await invoke('export_entries_csv', { path: target })
        } else {
          await invoke('export_entries', { path: target, passphrase: exportPass || null })
          setExportPass('')
        }
      } else {
        const filename = defaultFilename(exportFormat)
        if (exportFormat === 'csv') {
          const dump = await invoke<{ entries: BackupEntry[] }>('dump_entries')
          const csv = buildCsv(dump.entries)
          await saveBlob(new TextEncoder().encode(csv), filename, 'text/csv')
        } else {
          const dump = await invoke<{ entries: BackupEntry[] }>('dump_entries')
          const bytes = await buildBackupFile(dump.entries, exportPass || '')
          await saveBlob(bytes, filename, 'application/json')
          setExportPass('')
        }
      }
      onToast(t('exportedSuccessfully'), 'success')
    } catch (err:any) {
      onToast(t('exportFailedPrefix') + String(err), 'error')
    } finally { setExportBusy(false) }
  }

  async function readPickedFile(list: FileList | null) {
    if (!list || !list.length) return
    const f = list[0]
    const buf = await f.arrayBuffer()
    setImportFile({ name: f.name, bytes: new Uint8Array(buf) })
    setImportPreview(null)
  }

  async function readPickedPath(path: string) {
    try {
      const bytesArr = await invoke<any>('read_file_bytes', { path })
      const bytes = asBytes(bytesArr)
      setImportFile({ name: basename(path), bytes })
      setImportPreview(null)
    } catch (err:any) {
      onToast(t('importFailedPrefix') + String(err), 'error')
    }
  }

  async function previewImport() {
    if (!importFile) return
    setImportBusy(true)
    try {
      let entries: BackupEntry[] = []
      if (importFile.name.toLowerCase().endsWith('.csv')) {
        entries = parseCsvEntries(new TextDecoder().decode(importFile.bytes))
      } else {
        entries = await parseBackupBytes(importFile.bytes, importPass)
      }
      const counts: { fingerprint: string, count: number }[] = entries.reduce((acc, e) => {
        const fp = e.fingerprint || ''
        const found = acc.find(x => x.fingerprint === fp)
        if (found) found.count += 1
        else acc.push({ fingerprint: fp, count: 1 })
        return acc
      }, [] as { fingerprint: string, count: number }[])
      const defaults: Mapping = {}
      counts.forEach(c => { if (localMasters.includes(c.fingerprint)) defaults[c.fingerprint] = c.fingerprint })
      if (counts.length === 1 && localMasters.length === 1) defaults[counts[0].fingerprint] = localMasters[0]
      setMapping(defaults)
      setImportPreview({ entries, counts })
      setMappingModal(true)
    } catch (err:any) {
      onToast(t('importFailedPrefix') + String(err), 'error')
    } finally { setImportBusy(false) }
  }

  async function applyImport() {
    if (!importPreview) return
    const mapped: BackupEntry[] = []
    for (const e of importPreview.entries) {
      const key = normalizeFp(e.fingerprint)
      const target = mapping[key]
      if (target && target !== 'ignore' && localMasters.includes(target)) {
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
    } catch (err:any) {
      onToast(t('importFailedPrefix') + String(err), 'error')
    } finally { setImportBusy(false) }
  }

  const unmapped = importPreview ? importPreview.counts.filter(c => !mapping[normalizeFp(c.fingerprint)] || mapping[normalizeFp(c.fingerprint)] === 'ignore') : []

  return (
    <div className="card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h3 className="card-title" style={{ margin: 0 }}>{t('tabBackup')}</h3>
        <div className="row" style={{ gap: 6 }}>
          <button className={`btn ${mode === 'export' ? 'primary' : ''}`} aria-pressed={mode === 'export'} onClick={() => setMode('export')}>{t('export')}</button>
          <button className={`btn ${mode === 'import' ? 'primary' : ''}`} aria-pressed={mode === 'import'} onClick={() => setMode('import')}>{t('import')}</button>
        </div>
      </div>

      {mode === 'export' && (
        <>
          <h4 className="section-title">{t('export') || 'Export'}</h4>
          <p className="muted">{t('exportHelp')}</p>
          <div className="row" style={{ alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
            <div className="col">
              <label>{t('exportFormat')}</label>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'safe'|'csv')}>
                <option value="safe">{t('formatSafe')}</option>
                <option value="csv">{t('formatCsv')}</option>
              </select>
            </div>
            {exportFormat === 'safe' && (
              <div className="col">
                <label>{t('passphraseOptional')}</label>
                <input type="password" value={exportPass} onChange={e => setExportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" />
              </div>
            )}
            <button className="btn" disabled={exportBusy} aria-busy={exportBusy ? 'true' : 'false'} onClick={handleExport}>
              {exportBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner" aria-hidden="true"></span> {t('exporting')}</span>) : (hasTauri() ? t('pickExportPath') : t('downloadBackup'))}
            </button>
          </div>
        </>
      )}

      {mode === 'import' && (
        <>
          <h4 className="section-title" style={{ marginTop: 12 }}>{t('import') || 'Import'}</h4>
          <p className="muted">{t('importHelpWithMapping')}</p>
          <div className="col" style={{ gap: 8, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8, padding: 12 }} onDragOver={e => e.preventDefault()} onDrop={async e => { e.preventDefault(); await readPickedFile(e.dataTransfer?.files || null) }}>
            <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div className="muted" style={{ marginBottom: 4 }}>{t('dropOrPickFile')}</div>
                {importFile ? (<div className="password">{importFile.name} <span className="muted">· {formatBytes(importFile.bytes.length)}</span></div>) : (<div className="muted">{t('acceptedFormats')} .safe / .csv</div>)}
              </div>
          <button className="btn" onClick={async () => {
            if (hasTauri()) {
              const p = await pickSource()
              if (p) await readPickedPath(p)
              else fileInputRef.current?.click()
            } else {
              fileInputRef.current?.click()
            }
          }}>{t('chooseFile')}</button>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".safe,.csv,text/csv" onChange={async e => { await readPickedFile(e.target.files); if (fileInputRef.current) fileInputRef.current.value = '' }} />
        </div>
            <div className="row" style={{ gap: 12, alignItems: 'end' }}>
              <div className="col">
                <label>{t('passphraseIfUsed')}</label>
                <input type="password" value={importPass} onChange={e => setImportPass(e.target.value)} autoComplete="off" spellCheck={false} autoCorrect="off" autoCapitalize="none" disabled={!!(importFile && importFile.name.toLowerCase().endsWith('.csv'))} />
              </div>
              <div className="col" style={{ minWidth: 140 }}>
                <label>{t('overwrite')}</label>
                <select value={importOverwrite ? 'yes' : 'no'} onChange={e => setImportOverwrite(e.target.value === 'yes') }>
                  <option value='no'>{t('no')}</option>
                  <option value='yes'>{t('yes')}</option>
                </select>
              </div>
              <button className="btn primary" disabled={!importFile || importBusy} aria-busy={importBusy ? 'true' : 'false'} onClick={previewImport}>
                {importBusy ? (<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><span className="spinner"></span> {t('loading')}</span>) : t('previewMapping')}
              </button>
            </div>
          </div>
          <p className="muted" id={impHelpId}>{t('importHelp')}</p>
        </>
      )}

      {mappingModal && importPreview && (
        <div className="modal-backdrop" onClick={() => setMappingModal(false)}>
          <FocusTrapModal titleId="map-fp-title" onClose={() => setMappingModal(false)}>
            <h3 id="map-fp-title">{t('mapFingerprints')}</h3>
            <p className="muted">{t('mapFingerprintsHelp')}</p>
            <FingerprintMapper mapping={mapping} setMapping={setMapping} imported={importPreview.counts.map(c => ({ fingerprint: c.fingerprint, count: c.count }))} locals={localMasters} />
            {unmapped.length > 0 && (
              <div className="muted" style={{ marginTop: 8, color: 'var(--danger)' }}>
                {t('unmappedSkipped')} ({unmapped.length})
              </div>
            )}
            <div className="row" style={{ marginTop: 12, gap: 8 }}>
              <button className="btn primary" onClick={applyImport} aria-busy={importBusy ? 'true' : 'false'} disabled={importBusy}>{t('applyMapping')}</button>
              <button className="btn" onClick={() => setMappingModal(false)}>{t('close')}</button>
            </div>
          </FocusTrapModal>
        </div>
      )}
    </div>
  )
}

function FocusTrapModal({ children, titleId, onClose }: { children: React.ReactNode, titleId: string, onClose: () => void }) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    const focusables = Array.from(node.querySelectorAll<HTMLElement>('a,button,select,input,textarea,[tabindex]:not([tabindex="-1"])'))
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (first) first.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && focusables.length > 0) {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); (last || first).focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); (first || last).focus() }
      }
    }
    node.addEventListener('keydown', onKey as any)
    return () => node.removeEventListener('keydown', onKey as any)
  }, [ref, onClose])
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()} ref={ref}>
      {children}
    </div>
  )
}
